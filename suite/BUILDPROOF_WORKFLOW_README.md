# BuildProof – evidence workflows (FastAPI + PostgreSQL)

This version is based on the provided integrated BuildProof suite. The original `suite/backend/app/main.py` signup/login/OTP/role-check implementation was preserved, with only an appended import and registration of the new workflow router. The landing frontend and authentication behavior are unchanged.

## What was added

- Site Supervisor: **two and only two** evidence options (`site`, `stock`), live `getUserMedia()` camera only, 3–6 photos per upload, original camera previews, protected FastAPI upload to PostgreSQL metadata + local evidence file storage. The capture wizard does not expose a gallery picker. Camera permission and HTTPS/localhost are required.
- Image screening: SHA-256 exact duplicate, pHash visual similarity, EXIF timestamp, OCR candidate watermark keywords if Tesseract is installed. Optional AI-image classifier adapter. **Without that model configured, `NOT_EVALUATED` is returned; no promise of genuine vs AI-generated.** Browser-captured files often have no EXIF metadata; browser capture is not tamper-proof.
- Store Keeper: photo/PDF vendor bill upload, preview before submission, manually entered supplier/material/quantity/unit/date and optional unit rate, PostgreSQL records, checks against OCR-extracted text and previous bill identifiers. OCR requires a local Tesseract installation for scanned images. Extractable PDF text uses PyMuPDF. Documents are *not certified authentic* by OCR.
- Project Auditor: two separate sections for supervisor evidence and storekeeper bills, confidential server authorization, downloadable PDF analysis of captured evidence, document discrepancies, manual-review gaps and estimates **when unit rates are provided**. The backend cannot determine exact quantities of materials solely from photographs; it reports that limitation explicitly.
- Original login/signup and 3-role server-side dashboard authorization remain in place.

## Initial setup (Windows PowerShell)

Start PostgreSQL and create the database if needed. In `suite/backend/.env`, set the exact PostgreSQL database name, SESSION_SECRET, and AUDITOR_INVITE_CODE. Use the existing `.env` if it is working (do not overwrite it).

**Terminal 1** (backend):

```powershell
cd suite\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --env-file .env
```

**Terminal 2** (frontend, from the package root):

```powershell
cd suite
npm run all
```

Open http://localhost:5173. When frontend dependencies and output have already been built, simply run `npm start` from `suite` instead of `npm run all`.

To use OCR for JPG/PNG scans on Windows, separately install Tesseract OCR and ensure `tesseract` is on PATH. Restart the backend afterward. Without it, the backend stores the original document and flags OCR as unavailable.

### Optional AI-image screening

Configure `IMAGE_DETECTOR_URL` and optionally `IMAGE_DETECTOR_TOKEN` in `suite/backend/.env`. **This is not a Gemini key field.** The configured trusted adapter must accept raw image bytes in an HTTP POST and return JSON `{ "ai_probability": 0.92 }` with a valid number from 0 to 1. This package does **not** include an actual hosted classifier or its credentials, so AI-generation screening remains `NOT_EVALUATED` until you connect one. The classification is advisory and is not proof of an authentic or fake image.

For confidentiality, use HTTPS in production, do not expose `DEV_OTP=true`, do not commit `.env`, enforce private uploads and back up PostgreSQL and evidence file storage together. Local filesystem upload storage should move to protected object storage for a production service. Current code is a prototype and has not undergone a full security audit.

### Data and API

- PostgreSQL tables created by SQLAlchemy: `construction_evidence`, `construction_capture_sessions`, `construction_bills`, `construction_audit_runs`; existing auth tables are kept.
- Local original files: `suite/backend/evidence_uploads` (created at startup). Do not commit or publicly serve this directory; evidence is retrievable only through protected FastAPI routes.
- `POST /api/workflow/capture-session?category=site|stock` – Supervisor only
- `POST /api/workflow/evidence` – Supervisor only, multipart with category, token, captured_at and 3–6 `images`
- `GET /api/workflow/evidence/mine` – Supervisor only
- `POST /api/workflow/bills` – Store Keeper only, multipart invoice + fields
- `GET /api/workflow/bills/mine` – Store Keeper only
- `GET /api/workflow/auditor/records` – Project Auditor only
- `POST /api/workflow/auditor/analyze` – Project Auditor only
- `GET /api/workflow/auditor/reports/{id}.pdf` – Project Auditor only
- `GET /api/workflow/evidence/{id}/image` – owner or Auditor only
- `GET /api/workflow/bills/{id}/file` – owner or Auditor only

## Limitations and future work

- The existing image-classifier adapter is optional, and OCR requires external runtime setup. Watermarks without readable keywords may be missed. No automated tool can guarantee that a photo is real.
- Financial **mismatch** between invoice quantities and stock images cannot be accurately derived without stock counts, material measurements, a project BOQ and corresponding units. This prototype's PDF states this rather than inventing a variance. The optional unit-rate estimate is based only on the storekeeper's entered values, not audited prices.
- Browser-guided camera raises friction for gallery uploads, but cannot verify device integrity or reliably prevent a user from streaming fabricated frames into a virtual camera.
- No live end-to-end database/browser test was possible in this creation environment. Run the acceptance checklist below on your computer.

## Acceptance checklist

1. Signup and login must work exactly as before, with OTP and existing role mapping.
2. Supervisor uploads 2 photos -> refused; uploads 7 -> refused; uploads 3–6 site photos -> persisted, viewable; stock handled separately.
3. Supervisor cannot call Store Keeper or Project Auditor endpoints (403); Store Keeper cannot call Supervisor/Auditor endpoints; Auditor can access audit views.
4. Store Keeper uploads a bill; it reappears after a browser refresh and has a server record in PostgreSQL.
5. Auditor sees both separate record types, previews originals and downloads a PDF on Analyze Automatically.
6. PDF lists evidence flags, invoice details, estimates (if provided), discrepancies and material-quantity uncertainty.
7. AI unavailable => `NOT_EVALUATED`; OCR unavailable => manual-review warning (no fake green success).
