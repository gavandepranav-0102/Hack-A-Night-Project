# BuildProof: PostgreSQL/FastAPI landing-page authentication

## Scope
The original four React/Vite apps, styles, and dashboard content are preserved. Only landing login/signup/session logic, three app-entry authorization checks, and the combined Node server are changed. All user accounts, role assignments, one-time codes, and authentication event history are stored in PostgreSQL. Remaining supervisor/storekeeper/auditor **dashboard operational data is still the original frontend demo/localStorage logic**; there is deliberately no fabricated claim that those dashboard features now persist to PostgreSQL.

## Prerequisites
Windows, Python 3.11–3.13, Node.js 20+, PostgreSQL server running locally. You must create the database yourself.

## Step 1: PostgreSQL
Create a database named `buildproof` in pgAdmin (or psql):

```sql
CREATE DATABASE buildproof;
```

The backend creates these tables on first launch: `users`, `pending_otps`, and `auth_events`.

## Step 2: Python API
Open a VS Code terminal in `suite/backend`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` to set your real PostgreSQL password, a unique random `SESSION_SECRET` (32+ characters), and `AUDITOR_INVITE_CODE`. To generate the session secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Then launch:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --env-file .env
```

API docs: http://127.0.0.1:8000/docs

**Note:** `.env` must be populated before importing the app. `DEV_OTP=true` displays local test OTPs on the signup form because no email provider is preconfigured. Set `DEV_OTP=false` and provide SMTP settings to send real emails; never expose development OTP mode publicly.

## Step 3: Frontend + reverse proxy
Open another VS Code terminal in `suite`:

```powershell
npm run all
```

Open http://localhost:5173. `npm run all` manages frontend installation/build/hosting; **FastAPI must be started separately**, as shown above.

## Role isolation
The existing visual labels are `Site Engineer` (Supervisor), `Store Keeper` (Shopkeeper), and `Project Auditor`. One email maps to exactly one permanent PostgreSQL role. A user may **not** sign up as auditor without the invitation code. After signup, future login uses the same account and stored role. The landing role picker only selects the requested login portal; it cannot change roles.

The Node static server checks `/api/auth/role/{role}` before sending any dashboard files, in addition to checks in each dashboard's entrypoint. The API uses server-signed HttpOnly cookies (8-hour expiry). Browser `localStorage` is not trusted for login/role decisions.

## Rate limiting
FastAPI includes an in-memory, per-IP rate limiter for login, signup and OTP endpoints plus OTP attempt caps. For public production deployment, replace it with a Redis-backed/distributed limiter and add IP/account-level limits at your trusted reverse proxy. See `DEPLOYMENT_SECURITY.md`.

## Test steps
1. Click Get Started: Sign Up opens.
2. Select Site Engineer, fill name/email/password, press Verify Email, use local development OTP, then Sign Up. Expect `/supervisor/`.
3. Log out by clearing cookie via POST `/api/auth/logout` (or use browser cookies) and return to landing.
4. Log in as Store Keeper using the Site Engineer credentials: rejected with 403.
5. Create a Store Keeper account with a different email: expect `/storekeeper/`.
6. Directly type `/auditor/` using Store Keeper's browser session: 403. Same for other cross-role combinations.
7. Auditor signup requires the invite code. `auth_events` records signup/login/logout/failed login.
8. Check user table in pgAdmin: `SELECT id,name,email,role,created_at FROM users;` (password hashes only, no plaintext passwords).

## Important restrictions
- This is an integrated **authentication/backend phase**, not the full eight-USP backend.
- For production, add email verification delivery, reverse-proxy rate limits, TLS (`COOKIE_SECURE=true`), session revocation, account recovery, Alembic migrations, and automated integration tests against a test Postgres instance.
- Dashboard functions still use existing mock/localStorage data; intentionally unchanged as requested.
