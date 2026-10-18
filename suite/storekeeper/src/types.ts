export type BillStatus = 'Pending' | 'Verified' | 'Rejected'

export interface Bill {
  id: string
  material: string
  quantity: number
  unit: string
  supplier: string
  billNumber: string
  deliveryDate: string // yyyy-mm-dd
  fileName: string
  fileSize: number
  fileType: string
  submittedAt: string // ISO
  status: BillStatus
  image?: string // small preview, saved for the Project Auditor
}

export interface Profile {
  name: string
  email: string
  phone: string
  site: string
}

export type View = 'dashboard' | 'history' | 'profile'
