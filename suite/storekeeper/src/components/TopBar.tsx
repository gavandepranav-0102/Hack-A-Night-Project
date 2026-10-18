import { HelmetIcon, MenuIcon } from './Icons'

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="glass sticky top-3 z-30 mx-3 mt-3 flex items-center justify-between px-4 py-3 sm:mx-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} aria-label="Open menu" className="btn-ghost !p-2 lg:hidden">
          <MenuIcon />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-safety text-navy-950 shadow-lg shadow-safety/30">
          <HelmetIcon />
        </div>
        <span className="text-lg font-bold tracking-tight">
          BuildProof <span className="text-safety">AI</span>
        </span>
      </div>
      <h1 className="text-sm font-medium text-white/80 sm:text-base">Storekeeper Dashboard</h1>
    </header>
  )
}
