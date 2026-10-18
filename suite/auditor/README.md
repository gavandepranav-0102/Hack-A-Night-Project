# BuildProof AI – Project Auditor Dashboard
React + Vite + Tailwind CSS (v3). Frontend only.

    npm install
    npm run dev      # start
    npm run build    # production build
    npm test         # interaction tests

## Shared localStorage keys (write from the other dashboards)
- `buildproof.storekeeper.records`: `[{ id, image, material, quantity, unit, date, vendor? }]`
- `buildproof.supervisor.records`: `[{ id, image, project, stage, date, materialsUsed?: [{ material, quantity, unit }] }]`
- `image` is a data URL or image URL; `date` is `YYYY-MM-DD`.
- The auditor only reads these two keys (plus its own `buildproof.auditor.history` / `.session`). Demo records carry `demo: true`.
