import { useState, type FormEvent } from 'react'
import type { Profile } from '../types'
import { CheckIcon } from './Icons'

interface Props { profile: Profile; onSave: (p: Profile) => void }

export default function ProfileView({ profile, onSave }: Props) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }))
    setSaved(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) { setError('Name is required.'); return }
    setError('')
    onSave({ ...draft, name: draft.name.trim() })
    setSaved(true)
  }

  const initials = draft.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-white/60'

  return (
    <section className="glass p-5 sm:p-8 animate-fade-up" aria-labelledby="profile-title">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-safety text-xl font-bold text-navy-950 shadow-lg shadow-safety/30">{initials}</div>
        <div>
          <h2 id="profile-title" className="text-xl font-bold">Profile</h2>
          <p className="text-sm text-white/60">Storekeeper · demo account</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className={label}>Full name</label>
          <input id="p-name" className={`field ${error ? 'field-error' : ''}`} value={draft.name} onChange={set('name')} />
          {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
        </div>
        <div>
          <label htmlFor="p-email" className={label}>Email</label>
          <input id="p-email" type="email" className="field" value={draft.email} onChange={set('email')} />
        </div>
        <div>
          <label htmlFor="p-phone" className={label}>Phone</label>
          <input id="p-phone" className="field" value={draft.phone} onChange={set('phone')} />
        </div>
        <div>
          <label htmlFor="p-site" className={label}>Site</label>
          <input id="p-site" className="field" value={draft.site} onChange={set('site')} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn-primary" type="submit">Save profile</button>
          {saved && <span role="status" className="flex items-center gap-1.5 text-sm text-emerald-300 animate-pop-in"><CheckIcon width={18} height={18} /> Saved</span>}
        </div>
      </form>
    </section>
  )
}
