"""BuildProof landing authentication. PostgreSQL is the source of truth."""
import hashlib
import hmac
import logging
import os
import secrets
import time
from collections import defaultdict, deque
from threading import Lock
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://postgres:postgres@localhost:5432/buildproof')
SESSION_SECRET = os.getenv('SESSION_SECRET', '')
if len(SESSION_SECRET) < 32:
    raise RuntimeError('Set SESSION_SECRET to a random string of at least 32 characters in backend/.env')
DEV_OTP = os.getenv('DEV_OTP', 'false').lower() == 'true'
AUDITOR_INVITE_CODE = os.getenv('AUDITOR_INVITE_CODE', '')
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
SESSION_MAX_AGE = 60 * 60 * 8
ROLES = {'Site Engineer', 'Store Keeper', 'Project Auditor'}

def now(): return datetime.now(timezone.utc)

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(250), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class PendingOtp(Base):
    __tablename__ = 'pending_otps'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_code: Mapped[str] = mapped_column(String(250))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuthEvent(Base):
    __tablename__ = 'auth_events'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id'), nullable=True)
    email: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(engine)
signer = URLSafeTimedSerializer(SESSION_SECRET, salt='buildproof-auth-v1')
app = FastAPI(title='BuildProof Authentication API', version='1.0.0')
# Local per-IP+path throttle. For multiple workers/production replace with Redis-backed limits.
_RATE = defaultdict(deque)
_RATE_LOCK = Lock()
_RATE_RULES = {'/api/auth/login':(6,60), '/api/auth/send-otp':(3,900), '/api/auth/signup':(5,3600), '/api/auth/verify-otp':(10,900)}

@app.middleware('http')
async def auth_rate_limit(request: Request, call_next):
    rule = _RATE_RULES.get(request.url.path) if request.method=='POST' else None
    if rule:
        # Read only the direct peer IP: clients cannot bypass throttling by spoofing X-Forwarded-For.
        peer = request.client.host if request.client else 'unknown'
        key = (peer, request.url.path)
        count, window = rule
        with _RATE_LOCK:
            q = _RATE[key]
            current = time.monotonic()
            while q and current-q[0]>window: q.popleft()
            if len(q)>=count:
                return Response('Too many requests; try again later',status_code=429,headers={'Retry-After':str(window)})
            q.append(current)
    return await call_next(request)


# Login/signup run under a single public origin through the included Node reverse proxy.
@app.middleware('http')
async def origin_protection(request: Request, call_next):
    if request.url.path.startswith('/api/auth') and request.method in ('POST','PUT','PATCH','DELETE'):
        origin = request.headers.get('origin')
        allowed = {o.strip() for o in os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')}
        if origin and origin not in allowed:
            return Response('Origin not allowed', status_code=403)
    return await call_next(request)

class EmailRequest(BaseModel):
    email: EmailStr

class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    profession: str
    otp: str = Field(pattern=r'^\d{6}$')
    auditor_invite_code: str = ''

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    profession: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r'^\d{6}$')

class ChangeRoleRequest(BaseModel):
    role: str

# stdlib scrypt: salted password hashing, no plaintext passwords or client-side SHA passwords.
def password_hash(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f'scrypt$16384$8$1${salt.hex()}${digest.hex()}'

def verify_password(password: str, encoded: str) -> bool:
    try:
        alg, n, r, p, salt, digest = encoded.split('$')
        if alg != 'scrypt': return False
        test = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(test, bytes.fromhex(digest))
    except (ValueError, TypeError): return False

def otp_hash(email: str, code: str) -> str:
    return hmac.new(SESSION_SECRET.encode(), f'{email}:{code}'.encode(), 'sha256').hexdigest()

def get_db():
    with SessionLocal() as db:
        yield db

def user_json(u: User) -> dict:
    return {'id': u.id, 'name': u.name, 'email': u.email, 'profession': u.role}

def set_session(resp: Response, user: User):
    value = signer.dumps({'uid': user.id, 'sid': secrets.token_hex(16)})
    resp.set_cookie('bp_auth', value, max_age=SESSION_MAX_AGE, httponly=True, secure=COOKIE_SECURE, samesite='lax', path='/')

def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    cookie = request.cookies.get('bp_auth', '')
    if not cookie: raise HTTPException(401, 'Not signed in')
    try: data = signer.loads(cookie, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired): raise HTTPException(401, 'Invalid or expired session')
    user = db.get(User, data.get('uid'))
    if not user: raise HTTPException(401, 'User not found')
    return user

def send_otp(email: str, code: str):
    server = os.getenv('SMTP_HOST', '')
    if not server:
        if not DEV_OTP: raise HTTPException(503, 'Email service is not configured')
        return
    msg = EmailMessage()
    msg['Subject'] = 'BuildProof email verification code'
    msg['From'] = os.getenv('SMTP_FROM', 'noreply@buildproof.local')
    msg['To'] = email
    msg.set_content(f'Your BuildProof verification code is {code}. It expires in 10 minutes.')
    with smtplib.SMTP(server, int(os.getenv('SMTP_PORT','587')), timeout=10) as smtp:
        smtp.starttls()
        smtp.login(os.getenv('SMTP_USERNAME',''), os.getenv('SMTP_PASSWORD',''))
        smtp.send_message(msg)

@app.get('/api/health')
def health(): return {'status': 'ok'}

@app.post('/api/auth/send-otp')
def request_otp(body: EmailRequest, db: Session = Depends(get_db)):
    email = str(body.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, 'Email is already registered')
    code = f'{secrets.randbelow(1000000):06d}'
    send_otp(email, code)
    record = db.scalar(select(PendingOtp).where(PendingOtp.email == email))
    if record is None:
        record = PendingOtp(email=email, hashed_code=otp_hash(email,code), expires_at=now()+timedelta(minutes=10), attempts=0)
        db.add(record)
    else:
        record.hashed_code = otp_hash(email,code)
        record.expires_at = now()+timedelta(minutes=10)
        record.attempts = 0
    db.commit()
    result = {'message': 'Code sent. It expires in 10 minutes.'}
    if DEV_OTP and not os.getenv('SMTP_HOST'):
        result['dev_otp'] = code  # local development ONLY. Disable before exposing publicly.
    return result

def verify_record(db: Session, email: str, code: str, consume=False) -> bool:
    record = db.scalar(select(PendingOtp).where(PendingOtp.email == email))
    if not record: return False
    expiry = record.expires_at.replace(tzinfo=timezone.utc) if record.expires_at.tzinfo is None else record.expires_at
    if expiry < now() or record.attempts >= 5: return False
    record.attempts += 1
    valid = hmac.compare_digest(record.hashed_code, otp_hash(email,code))
    if valid and consume: db.delete(record)
    db.commit()
    return valid

@app.post('/api/auth/verify-otp')
def verify_otp(body: VerifyOtpRequest, db: Session = Depends(get_db)):
    if not verify_record(db, str(body.email).lower(), body.otp): raise HTTPException(400,'Invalid or expired verification code')
    return {'verified': True}

@app.post('/api/auth/signup', status_code=201)
def signup(body: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if body.profession not in ROLES: raise HTTPException(422, 'Invalid profession')
    if body.profession == 'Project Auditor' and (not AUDITOR_INVITE_CODE or not hmac.compare_digest(body.auditor_invite_code,AUDITOR_INVITE_CODE)):
        raise HTTPException(403, 'An auditor invitation code is required')
    email = str(body.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409,'Email is already registered')
    if not verify_record(db,email,body.otp,consume=True):
        raise HTTPException(400,'Email verification required')
    user = User(name=body.name.strip(), email=email, role=body.profession, password_hash=password_hash(body.password))
    db.add(user)
    db.flush()
    db.add(AuthEvent(user_id=user.id, email=email, action='signup'))
    db.commit()
    set_session(response,user)
    return {'user':user_json(user)}

@app.post('/api/auth/login')
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = str(body.email).lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(body.password,user.password_hash):
        db.add(AuthEvent(email=email,action='failed_login')); db.commit()
        raise HTTPException(401,'Invalid credentials')
    # Role is determined ONLY by the PostgreSQL user record; never by a role claimed at login.
    if body.profession and body.profession != user.role:
        raise HTTPException(403,'This account belongs to a different portal')
    db.add(AuthEvent(user_id=user.id,email=email,action='login'))
    db.commit()
    set_session(response,user)
    return {'user':user_json(user)}

@app.get('/api/auth/me')
def me(user: User = Depends(current_user)):
    return {'user':user_json(user)}

@app.post('/api/auth/logout')
def logout(response: Response, db: Session=Depends(get_db), user: User=Depends(current_user)):
    db.add(AuthEvent(user_id=user.id,email=user.email,action='logout')); db.commit()
    response.delete_cookie('bp_auth',path='/')
    return {'ok':True}

@app.get('/api/auth/role/{role_name}')
def check_role(role_name: str, user: User=Depends(current_user)):
    expected = {'supervisor':'Site Engineer','storekeeper':'Store Keeper','auditor':'Project Auditor'}.get(role_name)
    if expected is None: raise HTTPException(404,'Unknown portal')
    if user.role != expected: raise HTTPException(403,'Forbidden for your role')
    return {'authorized':True,'user':user_json(user)}

@app.get('/api/auth/auditor-only')
def auditor_only(user: User=Depends(current_user)):
    if user.role != 'Project Auditor': raise HTTPException(403,'Auditor access required')
    return {'authorized':True}


# Construction workflows are isolated; original signup/login code above is unchanged.
from app.audit_workflows import create_router
app.include_router(create_router(Base, User, current_user, get_db, now))
Base.metadata.create_all(engine)
