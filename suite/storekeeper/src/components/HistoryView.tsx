import type { Bill } from '../types'
import { formatDate } from '../lib/storage'
import StatusBadge from './StatusBadge'

export default function HistoryView({ bills }: { bills: Bill[] }) {
  return (
    <section className="glass p-5 sm:p-8 animate-fade-up" aria-labelledby="history-title">
      <h2 id="history-title" className="text-xl font-bold">History</h2>
      <p className="mb-4 text-sm text-white/60">All bills you have submitted ({bills.length}).</p>
      {bills.length === 0 ? (
        <p className="py-10 text-center text-white/50">No bills submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-white/50">
                <th className="py-2 pr-4 font-medium">Material</th>
                <th className="py-2 pr-4 font-medium">Quantity</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-b border-white/10 transition hover:bg-white/10">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{b.material}</p>
                    <p className="text-xs text-white/50">{b.supplier} · #{b.billNumber}</p>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{b.quantity} {b.unit}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(b.submittedAt)}</td>
                  <td className="py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
