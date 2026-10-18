import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p,
})

export const MenuIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const UserIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>
export const HomeIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>
export const UploadIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" /></svg>
export const FileIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5" /></svg>
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>
export const HelmetIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 17h18M5 17a7 7 0 0114 0M12 6v5M9 8.5l1.5 2.5M15 8.5L13.5 11" /></svg>
