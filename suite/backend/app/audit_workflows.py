"""Construction submission APIs. Authentication/login modules are intentionally untouched."""
import os, io, re, json, hashlib, secrets, hmac
from pathlib import Path
from datetime import datetime, timezone, timedelta
from functools import partial
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import Integer, String, DateTime, Float, ForeignKey, Text, select
from sqlalchemy.orm import Mapped, mapped_column, Session
from PIL import Image, ImageStat, UnidentifiedImageError
import imagehash
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / 'evidence_uploads'
UPLOAD_ROOT.mkdir(exist_ok=True)
MAX_IMAGE = 8 * 1024 * 1024
MAX_DOCUMENT = 10 * 1024 * 1024

# Initialized in create_router so we can preserve the original auth implementation without changing it.
def create_router(Base, User, current_user, get_db, now):
    class Evidence(Base):
        __tablename__ = 'construction_evidence'
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
        category: Mapped[str] = mapped_column(String(12), index=True)
        batch_id: Mapped[str] = mapped_column(String(36), index=True)
        storage_name: Mapped[str] = mapped_column(String(100))
        sha256: Mapped[str] = mapped_column(String(64), index=True)
        phash: Mapped[str] = mapped_column(String(16))
        captured_at: Mapped[Optional[str]] = mapped_column(String(70), nullable=True)
        latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        ai_status: Mapped[str] = mapped_column(String(40), default='NOT_EVALUATED')
        watermark_status: Mapped[str] = mapped_column(String(40), default='NOT_EVALUATED')
        image_flags: Mapped[str] = mapped_column(Text, default='[]')
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    class Bill(Base):
        __tablename__ = 'construction_bills'
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
        supplier: Mapped[str] = mapped_column(String(160))
        bill_number: Mapped[str] = mapped_column(String(100))
        material: Mapped[str] = mapped_column(String(130))
        quantity: Mapped[float] = mapped_column(Float)
        unit: Mapped[str] = mapped_column(String(30))
        delivery_date: Mapped[str] = mapped_column(String(20))
        unit_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
        storage_name: Mapped[str] = mapped_column(String(100))
        file_name: Mapped[str] = mapped_column(String(200))
        mime_type: Mapped[str] = mapped_column(String(80))
        sha256: Mapped[str] = mapped_column(String(64), index=True)
        ocr_text: Mapped[str] = mapped_column(Text, default='')
        verification: Mapped[str] = mapped_column(String(40), default='NEEDS_REVIEW')
        findings: Mapped[str] = mapped_column(Text, default='[]')
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    class Capture(Base):
        __tablename__ = 'construction_capture_sessions'
        token: Mapped[str] = mapped_column(String(80), primary_key=True)
        owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
        category: Mapped[str] = mapped_column(String(12))
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
        used: Mapped[bool] = mapped_column(default=False)

    class AuditRun(Base):
        __tablename__ = 'construction_audit_runs'
        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        auditor_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
        result_json: Mapped[str] = mapped_column(Text)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    router = APIRouter(prefix='/api/workflow', tags=['Construction evidence and audit'])
    def require(role):
        def dependency(user: User = Depends(current_user)):
            if user.role != role: raise HTTPException(403, 'Forbidden for your role')
            return user
        return dependency
    supervisor = require('Site Engineer'); storekeeper = require('Store Keeper'); auditor = require('Project Auditor')

    def media(rec, owner):
        return {'id':rec.id,'category':rec.category,'batch_id':rec.batch_id,'created_at':rec.created_at.isoformat(),
                'url':f'/api/workflow/evidence/{rec.id}/image','ai_status':rec.ai_status,
                'watermark_status':rec.watermark_status,'flags':json.loads(rec.image_flags),
                'captured_at':rec.captured_at,'latitude':rec.latitude,'longitude':rec.longitude,'owner':owner}
    def bill_json(b, owner):
        return {'id':b.id,'supplier':b.supplier,'bill_number':b.bill_number,'material':b.material,'quantity':b.quantity,
                'unit':b.unit,'delivery_date':b.delivery_date,'unit_rate':b.unit_rate,'verification':b.verification,
                'findings':json.loads(b.findings),'ocr_text':b.ocr_text,'url':f'/api/workflow/bills/{b.id}/file',
                'file_name':b.file_name,'mime_type':b.mime_type,'owner':owner,'created_at':b.created_at.isoformat()}

    def detect_ai(data):
        # Optional hosted binary classifier. Without a configured endpoint, NEVER claim an image is genuine.
        endpoint=os.getenv('IMAGE_DETECTOR_URL','').strip()
        if not endpoint: return 'NOT_EVALUATED', ['AI-generated-image classifier not configured; no authenticity conclusion']
        try:
            import httpx
            headers={}
            if os.getenv('IMAGE_DETECTOR_TOKEN'): headers['Authorization']='Bearer '+os.getenv('IMAGE_DETECTOR_TOKEN')
            resp=httpx.post(endpoint, content=data, headers=headers, timeout=18)
            resp.raise_for_status(); result=resp.json()
            # Expected adapter response: {"ai_probability": number between 0 and 1}. Unknown schemas fail closed.
            score=float(result['ai_probability'])
            if not 0<=score<=1: raise ValueError('Score out of range')
            return ('SUSPECTED_AI' if score>=0.8 else 'INCONCLUSIVE'), [f'Classifier AI score: {score:.3f} (not calibrated proof)']
        except Exception:
            return 'NOT_EVALUATED', ['External AI classifier unavailable or incompatible']

    def inspect_photo(data, db):
        try:
            im=Image.open(io.BytesIO(data)); im.verify()
            im=Image.open(io.BytesIO(data)); im.load()
            if im.width<64 or im.height<64 or im.width*im.height>20_000_000: raise ValueError('Unsupported image dimensions')
            if im.format not in ('JPEG','PNG','WEBP'): raise ValueError('Unsupported image format')
            ph=str(imagehash.phash(im.convert('RGB')))
            exif=im.getexif(); captured=str(exif.get(36867) or exif.get(306) or '')[:70] or None
            flags=[]
            sha=hashlib.sha256(data).hexdigest()
            if db.scalar(select(Evidence.id).where(Evidence.sha256==sha)): flags.append('Exact duplicate of previously submitted evidence')
            past=db.scalars(select(Evidence.phash).limit(500)).all()
            if any(imagehash.hex_to_hash(ph)-imagehash.hex_to_hash(x)<=6 for x in past): flags.append('Visually similar to a previous submission; review required')
            if not captured: flags.append('No EXIF capture timestamp (browser camera images often have none)')
            ai, ai_flags=detect_ai(data); flags+=ai_flags
            # OCR-based watermark candidate search is optional and fallible.
            wm='NOT_EVALUATED'
            try:
                import pytesseract
                text=pytesseract.image_to_string(im.convert('RGB'),config='--psm 11',timeout=6).lower()
                markers=('watermark','sample image','generated by','stock photo','shutterstock','getty images','adobe stock')
                if any(w in text for w in markers):
                    wm='POSSIBLE_TEXT_WATERMARK'; flags.append('Possible watermark / stock label detected by OCR')
                else: wm='NO_TEXT_MARKER_DETECTED'
            except Exception: flags.append('Watermark OCR unavailable; visual watermark detection not guaranteed')
            return sha,ph,captured,ai,wm,flags
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise HTTPException(422,'Invalid or unsupported image')

    @router.post('/capture-session')
    def create_capture(category: str, db:Session=Depends(get_db), user:User=Depends(supervisor)):
        if category not in ('site','stock'): raise HTTPException(422,'Only site or stock accepted')
        token=secrets.token_urlsafe(32)
        db.add(Capture(token=token, owner_id=user.id, category=category));db.commit()
        return {'token':token,'expires_in_seconds':600,'message':'Browser capture requires camera permission; device metadata is not a trusted attestation'}

    @router.post('/evidence')
    async def submit_evidence(category:str=Form(...), capture_token:str=Form(...), captured_at:str=Form(''),
                              latitude:Optional[float]=Form(None), longitude:Optional[float]=Form(None),
                              images:list[UploadFile]=File(...), db:Session=Depends(get_db), user:User=Depends(supervisor)):
        if category not in ('site','stock') or not 3<=len(images)<=6: raise HTTPException(422,'Capture 3 to 6 photos for site or stock')
        capture=db.get(Capture,capture_token)
        if not capture or capture.owner_id!=user.id or capture.category!=category or capture.used: raise HTTPException(403,'Capture session invalid or used')
        created=capture.created_at if capture.created_at.tzinfo else capture.created_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc)-created>timedelta(minutes=10): raise HTTPException(403,'Capture session expired')
        batch=secrets.token_hex(16);rows=[]; written=[]
        try:
            for file in images:
                raw=await file.read(MAX_IMAGE+1)
                if len(raw)>MAX_IMAGE: raise HTTPException(413,'Image exceeds 8 MB')
                sha,ph,exif,ai,wm,flags=inspect_photo(raw,db)
                if exif and captured_at and exif[:10].replace(':','-') != captured_at[:10]: flags.append('Claimed capture time and EXIF date differ')
                storage=secrets.token_hex(24)+'.jpg'
                # Original image retained byte-for-byte; extension is an opaque storage key.
                (UPLOAD_ROOT/storage).write_bytes(raw); written.append(storage)
                record=Evidence(owner_id=user.id,category=category,batch_id=batch,storage_name=storage,sha256=sha,phash=ph,
                                captured_at=captured_at or exif,latitude=latitude,longitude=longitude,
                                ai_status=ai, watermark_status=wm,image_flags=json.dumps(flags))
                db.add(record);rows.append(record)
            capture.used=True;db.commit()
        except Exception:
            db.rollback()
            for key in written: (UPLOAD_ROOT/key).unlink(missing_ok=True)
            raise
        for x in rows: db.refresh(x)
        return {'category':category,'count':len(rows),'receivedAt':datetime.now(timezone.utc).isoformat(), 'records':[media(r,user.name) for r in rows]}

    @router.get('/evidence/mine')
    def my_evidence(db:Session=Depends(get_db),user:User=Depends(supervisor)):
        rows=db.scalars(select(Evidence).where(Evidence.owner_id==user.id).order_by(Evidence.id.desc())).all()
        return [media(r,user.name) for r in rows]

    @router.get('/evidence/{id}/image')
    def evidence_image(id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
        rec=db.get(Evidence,id)
        if not rec: raise HTTPException(404,'Evidence missing')
        if user.role!='Project Auditor' and rec.owner_id!=user.id: raise HTTPException(403,'Forbidden')
        return FileResponse(UPLOAD_ROOT/rec.storage_name,media_type='image/jpeg',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})

    @router.post('/bills')
    async def submit_bill(file:UploadFile=File(...),supplier:str=Form(...),bill_number:str=Form(...),material:str=Form(...),
                          quantity:float=Form(...),unit:str=Form(...),delivery_date:str=Form(...),
                          unit_rate:Optional[float]=Form(None),db:Session=Depends(get_db),user:User=Depends(storekeeper)):
        if not 0<quantity<=1e9 or (unit_rate is not None and not 0<=unit_rate<=1e9): raise HTTPException(422,'Invalid amounts')
        if any(len(x)>160 or not x.strip() for x in (supplier,bill_number,material,unit,delivery_date)): raise HTTPException(422,'Invalid fields')
        raw=await file.read(MAX_DOCUMENT+1)
        if len(raw)>MAX_DOCUMENT: raise HTTPException(413,'Bill exceeds 10 MB')
        ispdf=raw[:5]==b'%PDF-'
        if not ispdf:
            try:
                img=Image.open(io.BytesIO(raw));img.verify()
                if img.format not in ('JPEG','PNG','WEBP'): raise ValueError()
            except Exception: raise HTTPException(422,'Upload a valid PDF or image bill')
        sha=hashlib.sha256(raw).hexdigest(); flags=[]; extracted=''
        if db.scalar(select(Bill.id).where(Bill.sha256==sha)): flags.append('Identical bill file was previously submitted')
        if db.scalar(select(Bill.id).where(Bill.supplier==supplier.strip(),Bill.bill_number==bill_number.strip())): flags.append('Supplier and invoice number previously used')
        try:
            if ispdf:
                import fitz
                doc=fitz.open(stream=raw,filetype='pdf')
                if doc.page_count>15: raise HTTPException(422,'PDF has too many pages')
                extracted='\n'.join(page.get_text() for page in doc)[:6000]
                if not extracted.strip(): flags.append('Scanned PDF requires OCR; text was not extractable')
            else:
                import pytesseract
                extracted=pytesseract.image_to_string(Image.open(io.BytesIO(raw)),timeout=10)[:6000]
        except HTTPException: raise
        except Exception: flags.append('OCR not available or text not extractable; verify manually')
        lower=extracted.lower()
        if extracted.strip():
            if bill_number.lower() not in lower: flags.append('Entered bill number not found in extracted text')
            if not any(token.lower() in lower for token in re.findall(r'[A-Za-z]{4,}',material)[:2]): flags.append('Entered material not found in extracted text')
        else: flags.append('Document values not machine-verified')
        # No claim of document genuineness from OCR text alone.
        verification='NEEDS_REVIEW' if flags else 'TEXT_CONSISTENT_REVIEW_REQUIRED'
        name=secrets.token_hex(24)+('.pdf' if ispdf else '.img')
        (UPLOAD_ROOT/name).write_bytes(raw)
        record=Bill(owner_id=user.id,supplier=supplier.strip(),bill_number=bill_number.strip(),material=material.strip(),
                    quantity=quantity,unit=unit,delivery_date=delivery_date,unit_rate=unit_rate,storage_name=name,
                    file_name=(file.filename or 'uploaded-bill')[:200],mime_type='application/pdf' if ispdf else (file.content_type if file.content_type in ('image/png','image/jpeg','image/webp') else 'image/jpeg'),
                    sha256=sha,ocr_text=extracted,verification=verification,findings=json.dumps(flags))
        db.add(record);db.commit();db.refresh(record)
        return bill_json(record,user.name)

    @router.get('/bills/mine')
    def my_bills(db:Session=Depends(get_db),user:User=Depends(storekeeper)):
        rows=db.scalars(select(Bill).where(Bill.owner_id==user.id).order_by(Bill.id.desc())).all()
        return [bill_json(b,user.name) for b in rows]

    @router.get('/bills/{id}/file')
    def bill_file(id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
        b=db.get(Bill,id)
        if not b: raise HTTPException(404,'Bill missing')
        if user.role!='Project Auditor' and b.owner_id!=user.id: raise HTTPException(403,'Forbidden')
        return FileResponse(UPLOAD_ROOT/b.storage_name,media_type=b.mime_type,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})

    @router.get('/auditor/records')
    def auditor_records(db:Session=Depends(get_db),user:User=Depends(auditor)):
        images=db.scalars(select(Evidence).order_by(Evidence.id.desc())).all()
        bills=db.scalars(select(Bill).order_by(Bill.id.desc())).all()
        names={x.id:x.name for x in db.scalars(select(User)).all()}
        return {'supervisor':[media(r,names.get(r.owner_id,'')) for r in images],
                'storekeeper':[bill_json(b,names.get(b.owner_id,'')) for b in bills]}

    def build_analysis(db):
        images=db.scalars(select(Evidence)).all()
        bills=db.scalars(select(Bill)).all()
        stock=[r for r in images if r.category=='stock']
        findings=[]
        for b in bills:
            related=[r for r in stock if b.material.casefold() in ' '.join(json.loads(r.image_flags)).casefold()]
            # Photograph evidence does NOT establish exact counted quantities.
            findings.append({'bill':b.bill_number,'supplier':b.supplier,'material':b.material,'quantity':b.quantity,
               'unit':b.unit,'entered_value':round(b.quantity*b.unit_rate,2) if b.unit_rate is not None else None,
               'finding':'Stock photos cannot establish billed quantities; manual count and BOQ needed',
               'document_flags':json.loads(b.findings), 'related_stock_photo_count':len(related)})
        return {'created_at':datetime.now(timezone.utc).isoformat(),'supervisor_images':len(images),'stock_images':len(stock),
                'site_images':len(images)-len(stock),'storekeeper_bills':len(bills), 'invoice_findings':findings,
                'image_flags':[{'image_id':r.id,'category':r.category,'flags':json.loads(r.image_flags),'ai_status':r.ai_status} for r in images],
                'limitations':['AI classifier needs configured compatible service','No approved BOQ was provided','Stock image quantities cannot be reliably measured from photo alone','No invoice authenticity or payment fraud has been proven']}

    @router.post('/auditor/analyze')
    def auditor_analyze(db:Session=Depends(get_db),user:User=Depends(auditor)):
        result=build_analysis(db)
        run=AuditRun(auditor_id=user.id,result_json=json.dumps(result));db.add(run);db.commit();db.refresh(run)
        return {'id':run.id,'result':result,'pdf_url':f'/api/workflow/auditor/reports/{run.id}.pdf'}

    @router.get('/auditor/reports/{run_id}.pdf')
    def report(run_id:int,db:Session=Depends(get_db),user:User=Depends(auditor)):
        run=db.get(AuditRun,run_id)
        if not run: raise HTTPException(404,'Report unavailable')
        from app.project_report import build_project_pdf
        result=json.loads(run.result_json)
        images=db.scalars(select(Evidence).order_by(Evidence.id)).all()
        bills=db.scalars(select(Bill).order_by(Bill.id)).all()
        pdf_bytes=build_project_pdf(result,images,bills,UPLOAD_ROOT,run.id)
        return StreamingResponse(io.BytesIO(pdf_bytes),media_type='application/pdf',
             headers={'Content-Disposition':f'attachment; filename="buildproof-project-report-{run.id}.pdf"',
                      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})

    return router
