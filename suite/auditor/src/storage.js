// Shared keys: the Storekeeper and Supervisor dashboards write to these same keys.
// Storekeeper bill (as saved by that dashboard): { id, material, quantity, unit, supplier, billNumber, deliveryDate, image?, status }
// Supervisor record (as saved by that dashboard): { id, image, category: 'site' | 'stock', date, by }
// Both are mapped below to the shape the auditor cards use; nothing is written back to these keys.
export const KEYS = {
  storekeeper: 'buildproof.bills', // written by the Storekeeper dashboard
  supervisor: 'buildproof.supervisor.records', // written by the Site Supervisor dashboard
  history: 'buildproof.auditor.history',
  session: 'bp_session', // written by the landing-page login
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function readList(key) {
  const data = readJSON(key, [])
  return Array.isArray(data) ? data.filter((r) => r && typeof r === 'object') : []
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadStorekeeper() {
  return readList(KEYS.storekeeper).map((b) => ({
    id: b.id, image: b.image || '', material: b.material, quantity: b.quantity, unit: b.unit,
    date: b.deliveryDate ?? b.date, vendor: b.supplier,
    demo: String(b.id).startsWith('seed-'), // sample bills the Storekeeper dashboard ships with
  }))
}

export function loadSupervisor() {
  const label = { site: 'Site progress', stock: 'Stock check' }
  return readList(KEYS.supervisor).map((r) => ({
    id: r.id, image: r.image || '', date: r.date, materialsUsed: r.materialsUsed,
    project: r.project || (r.category === 'stock' ? 'Stock evidence' : 'Site evidence'),
    stage: r.stage || label[r.category] || '',
  }))
}
