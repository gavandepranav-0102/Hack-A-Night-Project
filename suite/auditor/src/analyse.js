const norm = (s) => String(s ?? '').trim().toLowerCase()
const validDate = (d) => d && !Number.isNaN(Date.parse(d))
const qty = (q) => (q === '' || q == null ? NaN : Number(q))

export function analyse(sk, sv) {
  const flags = []
  const today = new Date().toISOString().slice(0, 10)
  const dates = [...sk, ...sv].map((r) => r.date).filter(validDate).sort()
  const purchased = new Map()
  const seen = new Map()

  sk.forEach((r) => {
    const label = r.material || 'Unnamed bill'
    const missing = []
    if (!r.material) missing.push('material')
    if (!r.image) missing.push('image')
    if (!validDate(r.date)) missing.push('date')
    const q = qty(r.quantity)
    if (Number.isNaN(q)) missing.push('quantity')
    else if (q <= 0) flags.push({ level: 'warn', text: `${label}: quantity is ${q}, which is not a valid amount.` })
    if (missing.length) flags.push({ level: 'warn', text: `${label}: missing ${missing.join(', ')}.` })
    if (validDate(r.date) && r.date > today) flags.push({ level: 'warn', text: `${label}: bill is dated in the future (${r.date}).` })
    if (r.material && q > 0) {
      const k = `${norm(r.material)}|${norm(r.unit)}`
      const cur = purchased.get(k) || { material: r.material, unit: r.unit || '', total: 0 }
      cur.total += q
      purchased.set(k, cur)
      const dk = `${k}|${q}|${r.date}`
      seen.set(dk, [...(seen.get(dk) || []), r])
    }
  })
  seen.forEach((list) => {
    if (list.length > 1) {
      const r = list[0]
      flags.push({ level: 'warn', text: `Possible duplicate bills: ${r.material} ${r.quantity} ${r.unit || ''} on ${r.date || 'unknown date'} (${list.length} records).` })
    }
  })

  const used = new Map()
  sv.forEach((r) => {
    const label = r.project || 'Unnamed photo'
    const missing = []
    if (!r.project) missing.push('project name')
    if (!r.stage) missing.push('stage')
    if (!validDate(r.date)) missing.push('date')
    if (!r.image) missing.push('image')
    if (missing.length) flags.push({ level: 'warn', text: `${label}: missing ${missing.join(', ')}.` })
    ;(Array.isArray(r.materialsUsed) ? r.materialsUsed : []).forEach((m) => {
      const q = qty(m?.quantity)
      if (!m?.material || !(q > 0)) return
      const k = `${norm(m.material)}|${norm(m.unit)}`
      const cur = used.get(k) || { material: m.material, unit: m.unit || '', total: 0 }
      cur.total += q
      used.set(k, cur)
    })
  })

  const comparable = used.size > 0
  if (sk.length && sv.length && !comparable) {
    flags.push({ level: 'info', text: "Supervisor records don't list materials used, so purchased and used quantities can't be compared." })
  }
  if (comparable) {
    used.forEach((u, k) => {
      const p = purchased.get(k)
      if (!p) flags.push({ level: 'warn', text: `${u.material}: ${u.total} ${u.unit} recorded as used, but no matching bill was found.` })
      else if (u.total > p.total) flags.push({ level: 'warn', text: `${u.material}: used ${u.total} ${u.unit} but only ${p.total} ${p.unit} billed (${u.total - p.total} ${u.unit} unaccounted for).` })
    })
    purchased.forEach((p, k) => {
      if (!used.has(k)) flags.push({ level: 'info', text: `${p.material}: ${p.total} ${p.unit} billed, but no usage recorded.` })
    })
  }
  if (!sk.length && sv.length) flags.push({ level: 'info', text: 'No Storekeeper bills yet, so materials can’t be checked against purchases.' })
  if (sk.length && !sv.length) flags.push({ level: 'info', text: 'No Supervisor photos yet, so purchases can’t be checked against site progress.' })

  return {
    counts: { storekeeper: sk.length, supervisor: sv.length },
    range: dates.length ? [dates[0], dates[dates.length - 1]] : null,
    purchased: [...purchased.values()],
    used: [...used.values()],
    flags,
    comparable,
  }
}
