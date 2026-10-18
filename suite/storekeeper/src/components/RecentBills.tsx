import type { Bill } from '../types'
import { formatDate } from '../lib/storage'
import { FileIcon } from './Icons'
import StatusBadge from './StatusBadge'

interface Props { bills: Bill[]; onViewAll: () => void }

export default function RecentBills({ bills, onViewAll }: Props) {
  const recent = bills.slice(0, 3)
  return (
    <section className="glass p-5 animate-fade-up [animation-delay:150ms]" aria-labelledby="recent-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-title" className="text-sm font-semibold uppercase tracking-widest text-white/70">Recently uploaded</h2>
        <button onClick={onViewAll} className="text-sm font-medium text-safety transition hover:underline">View all</button>
      </div>
      {recent.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/50">No bills uploaded yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {recent.map((b) => (
            <li key={b.id} className="glass-hover rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <FileIcon className="mt-0.5 shrink-0 text-safety" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.material}</p>
                  <p className="text-xs text-white/60">{b.quantity} {b.unit} · {formatDate(b.submittedAt)}</p>
                </div>
              </div>
              <div className="mt-2"><StatusBadge status={b.status} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
