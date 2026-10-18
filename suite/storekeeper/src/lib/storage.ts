import type { Bill, Profile } from '../types'

const BILLS_KEY = 'buildproof.bills'
const PROFILE_KEY = 'buildproof.profile'
const SESSION_KEY = 'buildproof.session'

const DEFAULT_PROFILE: Profile = {
  name: 'Ravi Kumar',
  email: 'ravi.kumar@buildproof.demo',
  phone: '+91 98765 43210',
  site: 'Skyline Towers – Block B, Mumbai',
}

const day = 86_400_000
const SEED: Bill[] = [
  { id: 'seed-1', material: 'Portland Cement (OPC 53)', quantity: 200, unit: 'bags', supplier: 'UltraBuild Traders', billNumber: 'UB-2026-0412', deliveryDate: iso(-2), fileName: 'ub-0412.pdf', fileSize: 238_000, fileType: 'application/pdf', submittedAt: new Date(Date.now() - 2 * day).toISOString(), status: 'Verified' },
  { id: 'seed-2', material: 'TMT Steel Bars 12mm', quantity: 3.5, unit: 'tons', supplier: 'Bharat Steel Co.', billNumber: 'BS-77831', deliveryDate: iso(-5), fileName: 'bs-77831.jpg', fileSize: 612_000, fileType: 'image/jpeg', submittedAt: new Date(Date.now() - 5 * day).toISOString(), status: 'Pending' },
  { id: 'seed-3', material: 'River Sand', quantity: 12, unit: 'm³', supplier: 'Sai Aggregates', billNumber: 'SA-1190', deliveryDate: iso(-9), fileName: 'sa-1190.png', fileSize: 455_000, fileType: 'image/png', submittedAt: new Date(Date.now() - 9 * day).toISOString(), status: 'Rejected' },
]

function iso(offsetDays: number) {
  return new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10)
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable – ignore (demo only) */
  }
}

export function loadBills(): Bill[] {
  try {
    if (localStorage.getItem(BILLS_KEY) === null) write(BILLS_KEY, SEED)
  } catch { /* ignore */ }
  return read<Bill[]>(BILLS_KEY, SEED)
}
export const saveBills = (bills: Bill[]) => write(BILLS_KEY, bills)

// Name/email come from the landing-page login (bp_session) until the profile is edited.
function sessionDefaults(): Partial<Profile> {
  const s = read<{ name?: string; email?: string } | null>('bp_session', null)
  return s ? { ...(s.name ? { name: s.name } : {}), ...(s.email ? { email: s.email } : {}) } : {}
}
export const loadProfile = () => ({ ...DEFAULT_PROFILE, ...sessionDefaults(), ...read<Partial<Profile>>(PROFILE_KEY, {}) })
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p)

export const isLoggedIn = () => read<boolean>(SESSION_KEY, true)
export const setLoggedIn = (v: boolean) => write(SESSION_KEY, v)

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatDate(d: string) {
  const date = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
