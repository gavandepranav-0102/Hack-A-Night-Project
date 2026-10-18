import { useEffect, useState } from 'react'

export const fmtDate = (d) => {
  const t = Date.parse(d)
  return d && !Number.isNaN(t) ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date missing'
}

export function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-navy-950">
      <svg className="absolute inset-x-0 bottom-0 h-3/4 w-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1b33" /><stop offset="1" stopColor="#2b3f60" /></linearGradient>
        </defs>
        <rect width="1200" height="500" fill="url(#sky)" />
        <g fill="#15243c">
          <rect x="60" y="260" width="170" height="240" /><rect x="250" y="190" width="130" height="310" /><rect x="820" y="230" width="190" height="270" /><rect x="1030" y="300" width="140" height="200" />
        </g>
        <g fill="#ffc20e" opacity=".5">
          {[[80, 290], [120, 290], [160, 330], [270, 230], [310, 270], [850, 270], [900, 310], [950, 270], [1060, 340]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="14" height="18" className="animate-blink" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
        <g stroke="#0d1726" strokeWidth="8" fill="none"><path d="M520 500V90M536 500V90" /></g>
        <g stroke="#ffc20e" strokeOpacity=".5" strokeWidth="2" fill="none"><path d="M520 500V90M536 500V90M520 150l16 -20M520 220l16 -20M520 290l16 -20M520 360l16 -20M520 430l16 -20" /></g>
        <g className="animate-sway" style={{ transformOrigin: '528px 90px' }}>
          <path d="M420 90h330M528 90l-100 14M528 90l120 -26" stroke="#0d1726" strokeWidth="8" fill="none" />
          <path d="M440 90h300" stroke="#ffc20e" strokeOpacity=".6" strokeWidth="3" />
          <path d="M730 90v70" stroke="#0d1726" strokeWidth="3" />
          <rect x="708" y="160" width="46" height="34" fill="#0d1726" />
        </g>
        <circle cx="528" cy="70" r="5" fill="#ff5a36" className="animate-blink" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/90 via-navy-950/55 to-navy-950/80" />
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-fade sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`glass max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 animate-pop sm:rounded-b-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold tracking-wide">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn-ghost px-3 py-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Lightbox({ item, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="Full image" className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4 animate-fade" onClick={onClose}>
      <button onClick={onClose} aria-label="Close image" className="btn-ghost absolute right-4 top-4">✕ Close</button>
      <img src={item.image} alt={item.caption} onClick={(e) => e.stopPropagation()} className="max-h-[78vh] max-w-full rounded-lg object-contain animate-pop" />
      <p className="mt-3 text-center text-sm text-white/80">{item.caption}</p>
    </div>
  )
}

function Thumb({ src, alt, onOpen, fit = 'object-cover' }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken)
    return <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/20 text-sm text-white/50">{src ? 'Image could not load' : 'No image attached'}</div>
  return (
    <button onClick={onOpen} aria-label={`View full image: ${alt}`} className="group relative block h-52 w-full overflow-hidden rounded-lg bg-black/30">
      <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={`h-full w-full ${fit} transition duration-300 group-hover:scale-105`} />
      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View full image</span>
    </button>
  )
}

export function RecordCard({ record, type, onOpen, index }) {
  const isStore = type === 'storekeeper'
  const title = isStore ? record.material || 'Material missing' : record.project || 'Project name missing'
  const rows = isStore
    ? [['Quantity', record.quantity !== undefined && record.quantity !== '' ? `${record.quantity} ${record.unit || ''}`.trim() : 'Quantity missing'], ['Date', fmtDate(record.date)]]
    : [['Stage', record.stage || 'Stage missing'], ['Date', fmtDate(record.date)]]
  return (
    <article style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} className="glass flex flex-col gap-3 p-3 animate-rise transition hover:-translate-y-1 hover:border-hazard/60 hover:shadow-2xl">
      <Thumb fit={isStore ? 'object-contain' : 'object-cover'} src={record.image} alt={title} onOpen={() => onOpen({ image: record.image, caption: `${title} · ${rows[0][1]} · ${rows[1][1]}` })} />
      <div className="flex items-start justify-between gap-2 px-1">
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-wide">{title}</h3>
        {record.demo && <span className="shrink-0 rounded bg-hazard px-1.5 py-0.5 text-xs font-bold text-navy-950">Demo</span>}
      </div>
      <dl className="grid grid-cols-2 gap-2 px-1 pb-1 text-base">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-white/50">{k}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
    </article>
  )
}

export function EmptyState({ type }) {
  const store = type === 'storekeeper'
  const key = store ? 'buildproof.storekeeper.records' : 'buildproof.supervisor.records'
  return (
    <div className="glass mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center animate-rise">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-hazard/15 text-4xl animate-float">{store ? '🧾' : '📷'}</div>
      <h3 className="font-display text-4xl font-semibold tracking-wide">{store ? 'No bills or receipts yet' : 'No site photos yet'}</h3>
      <p className="text-lg text-white/75">
        {store ? 'Bills uploaded from the Storekeeper dashboard appear here with material, quantity and date.' : 'Photos uploaded from the Supervisor dashboard appear here with project, stage and date.'}
      </p>
      <p className="mt-1 text-sm text-white/50">Reads from browser storage key <code className="rounded bg-black/30 px-1.5 py-0.5">{key}</code></p>
    </div>
  )
}

export function AnalysisView({ result, at }) {
  if (!result.counts.storekeeper && !result.counts.supervisor)
    return <p className="text-white/70">There are no records to analyse yet. Records uploaded from the Storekeeper and Supervisor dashboards will be summarised here.</p>
  const { counts, range, purchased, used, flags, comparable } = result
  const warns = flags.filter((f) => f.level === 'warn')
  const infos = flags.filter((f) => f.level === 'info')
  const list = (items) => (
    <ul className="mt-1 space-y-1 text-base text-white/80">{items.map((m) => <li key={m.material + m.unit}>{m.material}: {m.total} {m.unit}</li>)}</ul>
  )
  return (
    <div className="space-y-5 text-base">
      {at && <p className="text-white/50">Run on {new Date(at).toLocaleString('en-IN')}</p>}
      <p>
        <strong>{counts.storekeeper}</strong> bill{counts.storekeeper === 1 ? '' : 's'} and <strong>{counts.supervisor}</strong> site photo{counts.supervisor === 1 ? '' : 's'}
        {range && <> from {fmtDate(range[0])} to {fmtDate(range[1])}</>}.
      </p>
      {purchased.length > 0 && <div><h3 className="font-semibold text-hazard">Billed materials</h3>{list(purchased)}</div>}
      {comparable && <div><h3 className="font-semibold text-hazard">Used on site (from supervisor records)</h3>{list(used)}</div>}
      <div>
        <h3 className="font-semibold text-hazard">Possible discrepancies ({warns.length})</h3>
        {warns.length ? (
          <ul className="mt-1 space-y-1.5">{warns.map((f, i) => <li key={i} className="rounded-lg border border-hazard/40 bg-hazard/10 px-3 py-2">{f.text}</li>)}</ul>
        ) : <p className="mt-1 text-white/70">No discrepancies found in the available records.</p>}
      </div>
      {infos.length > 0 && (
        <div><h3 className="font-semibold">Notes</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-white/70">{infos.map((f, i) => <li key={i}>{f.text}</li>)}</ul></div>
      )}
      <p className="text-xs text-white/50">This is a check of the stored records only. Flags are possibilities to verify, not confirmed errors.</p>
    </div>
  )
}

export function Sidebar({ open, onClose, onSelect }) {
  if (!open) return null
  const items = [['profile', 'Profile', '👤'], ['history', 'History', '🕘'], ['logout', 'Logout', '⎋']]
  return (
    <div className="fixed inset-0 z-40 animate-fade" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <nav aria-label="Main menu" onClick={(e) => e.stopPropagation()} className="glass absolute inset-y-0 left-0 flex w-64 flex-col rounded-l-none animate-slidein">
        <div className="hazard-bar h-2" />
        <div className="flex items-center justify-between p-4">
          <span className="font-display text-2xl font-bold tracking-wide">BuildProof AI</span>
          <button onClick={onClose} aria-label="Close menu" className="btn-ghost px-3 py-1">✕</button>
        </div>
        <ul className="space-y-1 px-3">
          {items.map(([id, label, icon]) => (
            <li key={id}>
              <button onClick={() => onSelect(id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-left text-lg font-medium transition hover:translate-x-1 hover:bg-white/10">
                <span aria-hidden>{icon}</span>{label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
