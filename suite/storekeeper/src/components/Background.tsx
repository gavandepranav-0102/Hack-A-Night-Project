import type { ReactNode } from 'react'

/** Construction-site photo/illustration with a dark overlay. Swap /construction-bg.svg for a real photo if you like. */
export default function Background({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url('/construction-bg.svg')" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-gradient-to-b from-navy-950/70 via-navy-900/60 to-charcoal/75" />
      {children}
    </div>
  )
}
