// The four apps, in build order. The landing page is built first and owns the root of dist/.
export const APPS = [
  { dir: 'landing', base: '/', out: '' },
  { dir: 'supervisor', base: '/supervisor/', out: 'supervisor' },
  { dir: 'storekeeper', base: '/storekeeper/', out: 'storekeeper' },
  { dir: 'auditor', base: '/auditor/', out: 'auditor' },
]
