# BuildProof PDF report update

## Scope
Only the Project Auditor PDF renderer (`suite/backend/app/project_report.py`), the auditor report download handler (`suite/auditor/src/App.jsx`), and the PDF renderer regression test were modified. The original authentication/signup, PostgreSQL models, supervisor uploads, storekeeper uploads, and other dashboard code were not changed.

## Workflow
1. Supervisor uploads live camera site and stock photos; originals are retained in backend upload storage and referenced by database evidence rows.
2. Storekeeper uploads actual invoice image or PDF and submits bill metadata.
3. Authenticated Project Auditor clicks **Analyze Automatically & Download PDF**.
4. Existing `POST /api/workflow/auditor/analyze` creates an audit run in PostgreSQL, and returns its PDF URL.
5. Frontend requests `GET /api/workflow/auditor/reports/{id}.pdf` with the authenticated cookie and downloads `buildproof-project-report-{id}.pdf`.
6. FastAPI ReportLab generator creates a **landscape A4 summary page** matching the supplied reference: COST on left, PLANNING on right; uploaded stock/site/invoice previews; each column's graph; footer. When there are uploaded originals, subsequent appendix pages display **all** the original evidence images and invoice/PDF first-page previews.

## Data accuracy
- All thumbnails are rendered from actual uploaded originals stored by FastAPI; no stock images or demo files are inserted in the real report.
- This backend does not currently store approved BOQ amounts, milestone schedules, or validated construction percentage. These fields show 'unavailable' rather than invented progress or mismatches.
- OCR/check/AI statuses remain the existing service outputs; the PDF does not claim independent verification.
- The invoice billed bar uses entered quantities x known unit rates only. Missing rates are not treated as zero-value verified invoices.

## Requirements and commands
From `suite/backend`: `python -m pip install -r requirements.txt` and `python -m uvicorn app.main:app --reload --port 8000 --env-file .env`.
From `suite`: `npm run all` (first run), or `npm start` if already built (rebuild after source change with `npm run build`).
PostgreSQL must be running and `.env` configured. Python regression tests: from `suite/backend`, `python -m pytest -q tests/test_project_report.py`.

## Verification
The PDF regression tests and Python compile checks passed in the packaging environment. A live browser/PostgreSQL integration test is still necessary; functionality is not guaranteed bug-free across all local setups. For PDFs with many images, the document necessarily includes appendix pages so the original evidence is not silently omitted.
