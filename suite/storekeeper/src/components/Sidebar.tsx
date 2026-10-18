import type { ReactNode } from 'react'
import type { View } from '../types'
import { ClockIcon, CloseIcon, HomeIcon, LogoutIcon, UserIcon } from './Icons'

interface Props {
  view: View
  open: boolean
  onClose: () => void
  onNavigate: (v: View) => void
  onLogout: () => void
}

export default function Sidebar({ view, open, onClose, onNavigate, onLogout }: Props) {
  const item = (label: string, icon: ReactNode, target: View) => (
    <button
      onClick={() => onNavigate(target)}
      aria-current={view === target ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition duration-200 ${
        view === target
          ? 'bg-safety text-navy-950 shadow-md shadow-safety/20'
          : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 p-3 transition-transform duration-300 lg:static lg:z-auto lg:w-56 lg:translate-x-0 lg:p-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="glass flex h-full flex-col gap-1 p-3 lg:h-auto" aria-label="Main menu">
          <div className="mb-2 flex items-center justify-between px-2 pt-1 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Menu</span>
            <button onClick={onClose} aria-label="Close menu" className="btn-ghost !p-1.5"><CloseIcon width={16} height={16} /></button>
          </div>
          {item('Dashboard', <HomeIcon />, 'dashboard')}
          {item('Profile', <UserIcon />, 'profile')}
          {item('History', <ClockIcon />, 'history')}
          <div className="my-2 h-px bg-white/10" />
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-red-300 transition duration-200 hover:translate-x-1 hover:bg-red-500/15"
          >
            <LogoutIcon /> Logout
          </button>
        </nav>
      </aside>
    </>
  )
}
