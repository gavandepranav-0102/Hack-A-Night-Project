const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
export const CameraIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
);
export const BoxesIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 3l4 2v4l-4 2-4-2V5zM6 12l4 2v4l-4 2-4-2v-4zM18 12l4 2v4l-4 2-4-2v-4z" /></svg>
);
export const UserIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></svg>
);
export const HistoryIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4M12 7v5l3 2" /></svg>
);
export const LogoutIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" /></svg>
);
export const BellIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4" /></svg>
);
export const XIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={3}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const CheckIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ChevronIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={3}><path d="M6 9l6 6 6-6" /></svg>
);
export const MenuIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);
