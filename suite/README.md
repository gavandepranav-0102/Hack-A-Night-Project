# BuildProof AI – connected suite (frontend only)

One landing page + three role dashboards, linked through the landing-page login. No backend.

| Login profession on landing page | Opens |
|---|---|
| Site Engineer (site supervisor) | `/supervisor/` |
| Store Keeper | `/storekeeper/` |
| Project Auditor | `/auditor/` |

## Run
    npm run all        # install every app, build, then serve at http://localhost:5173
or step by step: `npm run setup`, `npm run build`, `npm start`.

All apps must be opened from the same address (e.g. http://localhost:5173) so they share browser storage.

## How they are linked (shared localStorage)
- `bp_users`, `bp_session` – demo accounts and the signed-in user (landing page login). Dashboards open only for the matching profession; Logout clears `bp_session` and returns to the landing page.
- `buildproof.bills` – bills saved by the Storekeeper dashboard (now also keeps a small image preview). Read by the Auditor.
- `buildproof.supervisor.records` – site/stock photos saved by the Supervisor dashboard. Read by the Auditor.
- Demo sign-in only: not real authentication.
