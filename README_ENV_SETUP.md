# BuildProof: Backend .env Setup (Windows PowerShell)

This package preserves the existing BuildProof application and its PDF-generation implementation.

## 1. Extract the ZIP

Extract the archive fully. Work within the extracted `suite` folder, **not** inside a ZIP preview.

## 2. Create your local .env

Open a PowerShell terminal within `suite/backend` and run:

```powershell
Copy-Item .env.example .env
notepad .env
```

Replace the PostgreSQL password and generate private values for `SESSION_SECRET` and `AUDITOR_INVITE_CODE`:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

The sample URL uses the database `BuildProof`, matching the database previously shown in pgAdmin. Change the database spelling in the URL if your own PostgreSQL database is named differently. Keep `.env` private and out of version control. Special characters in database passwords may require URL encoding.

For development, keep `DEV_OTP=true`; use `DEV_OTP=false` and valid SMTP credentials when testing real email OTP.

## 3. Start backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --env-file .env
```

Backend API docs: http://localhost:8000/docs

## 4. Start frontend (new terminal within `suite`)

```powershell
npm run all
```

Frontend: http://localhost:5173

If you have already built and installed frontend dependencies, `npm start` is sufficient. Ensure port 5173 is not already being used by another process.

## Scope

Only this guide and the sample `.env.example` database-name spelling have been added/clarified. No existing frontend or backend code has been modified.
