import type { BillStatus } from '../types'

const styles: Record<BillStatus, string> = {
  Pending: 'bg-safety/20 text-safety border-safety/40',
  Verified: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40',
  Rejected: 'bg-red-400/15 text-red-300 border-red-400/40',
}

export default function StatusBadge({ status }: { status: BillStatus }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
}
