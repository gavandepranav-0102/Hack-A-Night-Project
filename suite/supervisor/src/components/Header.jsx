import { useEffect, useRef, useState } from 'react';
import { HistoryIcon, LogoutIcon, MenuIcon, UserIcon, XIcon } from './Icons.jsx';

const items = [
  { id: 'profile', label: 'Profile', Icon: UserIcon, cls: 'text-bv-yellow' },
  { id: 'history', label: 'My History', Icon: HistoryIcon, cls: 'text-bv-yellow' },
  { id: 'logout', label: 'Logout', Icon: LogoutIcon, cls: 'text-white' },
];

// Top bar: 3-bar menu (Profile / My History / Logout), brand, and "Welcome back, <name>".
export default function Header({ name, role, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <header className="glass-bar border-b border-bv-yellow/50 relative z-40">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div ref={ref} className="relative">
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={open ? 'Close menu' : 'Open menu'}
              className="w-11 h-11 grid place-items-center rounded-lg border border-white/25 hover:bg-white/10 text-bv-yellow">
              {open ? <XIcon className="w-5 h-5" /> : <MenuIcon />}
            </button>
            {open && (
              <div role="menu" className="glass absolute left-0 top-14 w-56 rounded-xl p-2 space-y-1">
                {items.map(({ id, label, Icon, cls }) => (
                  <button key={id} role="menuitem" onClick={() => { setOpen(false); onSelect(id); }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-lg hover:bg-white/10 ${cls}`}>
                    <Icon className="w-6 h-6" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 font-display text-3xl font-extrabold tracking-wide whitespace-nowrap">
            <span className="w-1.5 h-9 bg-bv-yellow" /> BUILDPROOF <span className="text-bv-yellow -ml-1">AI</span>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden xl:flex items-center gap-2 text-sm leading-tight text-white/80 pr-4 mr-1 border-r border-white/20">
            <span className="w-1 h-9 bg-bv-yellow" /><p>Smarter Verification.<br />Safer Construction.</p>
          </div>
          <div className="text-right min-w-0">
            <p className="font-semibold leading-tight truncate">Welcome back, {name}</p>
            <p className="text-xs text-white/65 leading-tight">{role}</p>
          </div>
          <span className="relative shrink-0">
            <span className="w-11 h-11 rounded-full border-2 border-bv-yellow bg-navy-800 grid place-items-center font-display text-xl font-bold text-bv-yellow">{name[0]}</span>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-navy-950" title="Online" />
          </span>
        </div>
      </div>
    </header>
  );
}
