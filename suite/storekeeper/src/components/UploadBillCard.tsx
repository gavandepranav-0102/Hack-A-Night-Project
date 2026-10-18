import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import type { Bill } from '../types'
import { formatSize } from '../lib/storage'
import { CheckIcon, CloseIcon, FileIcon, UploadIcon } from './Icons'
import { fileToImage } from '../lib/image'

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024
const UNITS = ['bags', 'kg', 'tons', 'pcs', 'm³', 'litres']

type Fields = { material: string; quantity: string; unit: string; supplier: string; billNumber: string; deliveryDate: string }
type Errors = Partial<Record<keyof Fields | 'file', string>>

const EMPTY: Fields = { material: '', quantity: '', unit: 'bags', supplier: '', billNumber: '', deliveryDate: '' }

interface Props { onSubmit: (bill: Bill) => void }

export default function UploadBillCard({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [dragging, setDragging] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [rate,setRate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Create / revoke preview URL
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function acceptFile(f: File | undefined | null) {
    if (!f) return
    const okType = ACCEPTED.includes(f.type) || /\.(pdf|jpe?g|png)$/i.test(f.name)
    if (!okType) {
      setFile(null)
      setErrors((e) => ({ ...e, file: 'Unsupported file type. Please choose a PDF, JPG or PNG.' }))
      return
    }
    if (f.size > MAX_BYTES) {
      setFile(null)
      setErrors((e) => ({ ...e, file: `File is too large (${formatSize(f.size)}). Maximum size is 10 MB.` }))
      return
    }
    setSuccess(null)
    setErrors((e) => ({ ...e, file: undefined }))
    setFile(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0])
    e.target.value = '' // allow re-selecting the same file
  }

  const set = (k: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  function validate(): Errors {
    const er: Errors = {}
    if (!file) er.file = 'Please choose a bill (PDF, JPG or PNG).'
    if (!fields.material.trim()) er.material = 'Material name is required.'
    const q = Number(fields.quantity)
    if (!fields.quantity.trim()) er.quantity = 'Quantity is required.'
    else if (!Number.isFinite(q) || q <= 0) er.quantity = 'Enter a quantity greater than 0.'
    if (!fields.supplier.trim()) er.supplier = 'Supplier name is required.'
    if (!fields.billNumber.trim()) er.billNumber = 'Bill number is required.'
    if (!fields.deliveryDate) er.deliveryDate = 'Delivery date is required.'
    return er
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSuccess(null)
    const er = validate()
    setErrors(er)
    if (Object.keys(er).length || !file) return
    setSubmitting(true)
    try {
      const body = new FormData()
      body.append('file', file)
      Object.entries(fields).forEach(([key,value]) => body.append(({billNumber:'bill_number',deliveryDate:'delivery_date'} as Record<string,string>)[key] || key, value))
      if (rate.trim()) body.append('unit_rate',rate.trim())
      const response = await fetch('/api/workflow/bills',{method:'POST',body,credentials:'same-origin'})
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Upload failed')
      const preview = await fileToImage(file)
      const bill:Bill = {id:String(result.id),material:result.material,quantity:result.quantity,unit:result.unit,
        supplier:result.supplier,billNumber:result.bill_number,deliveryDate:result.delivery_date,
        fileName:result.file_name,fileSize:file.size,fileType:result.mime_type,submittedAt:result.created_at,
        status:'Pending',...(preview ? {image:preview} : {})}
      onSubmit(bill)
      setSuccess('Bill submitted to PostgreSQL for auditor review. Document verification: '+result.verification)
      setFile(null);setFields(EMPTY);setRate('');setErrors({})
    } catch(err) {setErrors({file: err instanceof Error ? err.message : 'Upload failed'})}
    finally {setSubmitting(false)}
  }

  const isImage = file?.type.startsWith('image/')
  const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')

  const err = (k: keyof Fields) => errors[k] && <p role="alert" className="mt-1 text-xs text-red-300">{errors[k]}</p>
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-white/60'

  return (
    <section className="glass p-5 sm:p-8 animate-fade-up" aria-labelledby="upload-title">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-safety/20 text-safety"><UploadIcon /></div>
        <div>
          <h2 id="upload-title" className="text-xl font-bold">Upload Bill</h2>
          <p className="text-sm text-white/60">Attach the supplier bill and enter the delivery details.</p>
        </div>
      </div>

      {success && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/15 p-4 text-sm text-emerald-100 animate-pop-in">
          <CheckIcon className="mt-0.5 shrink-0 text-emerald-300" />
          <p className="flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} aria-label="Dismiss" className="text-emerald-200/70 hover:text-white"><CloseIcon width={16} height={16} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition duration-300 ${
            dragging ? 'scale-[1.01] border-safety bg-safety/10'
            : errors.file ? 'border-red-400/70 bg-red-400/5'
            : 'border-white/25 bg-white/5 hover:border-safety/60 hover:bg-white/10'
          }`}
        >
          <UploadIcon width={34} height={34} className={dragging ? 'text-safety' : 'text-white/60'} />
          <p className="text-sm text-white/80">Drag &amp; drop your bill here, or</p>
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>Choose Bill</button>
          <p className="text-xs text-white/50">PDF, JPG or PNG · up to 10 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={onPick} aria-label="Choose bill file" />
        </div>
        {errors.file && <p role="alert" className="mt-2 text-sm text-red-300">{errors.file}</p>}

        {/* Selected file */}
        {file && (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/15 bg-navy-950/40 p-4 animate-pop-in sm:flex-row">
            <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30 sm:w-44">
              {previewUrl && isImage && <img src={previewUrl} alt="Bill preview" className="h-full w-full object-contain" />}
              {previewUrl && isPdf && (
                <object data={previewUrl} type="application/pdf" className="h-full w-full" aria-label="PDF preview">
                  <div className="flex flex-col items-center gap-1 text-xs text-white/60"><FileIcon width={32} height={32} />PDF</div>
                </object>
              )}
            </div>
            <div className="min-w-0 flex-1 self-center">
              <p className="truncate font-semibold" title={file.name}>{file.name}</p>
              <p className="text-sm text-white/60">{formatSize(file.size)} · {isPdf ? 'PDF' : file.type.replace('image/', '').toUpperCase()}</p>
              <button type="button" className="mt-3 text-sm text-red-300 hover:underline" onClick={() => setFile(null)}>Remove file</button>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="material" className={label}>Material name</label>
            <input id="material" className={`field ${errors.material ? 'field-error' : ''}`} placeholder="e.g. Portland Cement" value={fields.material} onChange={set('material')} />
            {err('material')}
          </div>
          <div>
            <label htmlFor="quantity" className={label}>Quantity</label>
            <div className="flex gap-2">
              <input id="quantity" type="number" min="0" step="any" inputMode="decimal" className={`field ${errors.quantity ? 'field-error' : ''}`} placeholder="e.g. 100" value={fields.quantity} onChange={set('quantity')} />
              <select aria-label="Unit" className="field !w-28" value={fields.unit} onChange={set('unit')}>
                {UNITS.map((u) => <option key={u} className="bg-navy-900">{u}</option>)}
              </select>
            </div>
            {err('quantity')}
          </div>
          <div>
            <label htmlFor="supplier" className={label}>Supplier name</label>
            <input id="supplier" className={`field ${errors.supplier ? 'field-error' : ''}`} placeholder="e.g. UltraBuild Traders" value={fields.supplier} onChange={set('supplier')} />
            {err('supplier')}
          </div>
          <div>
            <label htmlFor="billNumber" className={label}>Bill number</label>
            <input id="billNumber" className={`field ${errors.billNumber ? 'field-error' : ''}`} placeholder="e.g. UB-2026-0412" value={fields.billNumber} onChange={set('billNumber')} />
            {err('billNumber')}
          </div>
          <div className="sm:col-span-2 sm:max-w-xs">
            <label htmlFor="deliveryDate" className={label}>Delivery date</label>
            <input id="deliveryDate" type="date" className={`field [color-scheme:dark] ${errors.deliveryDate ? 'field-error' : ''}`} value={fields.deliveryDate} onChange={set('deliveryDate')} />
            {err('deliveryDate')}
          </div>
        </div>

        <div className="mt-4"><label htmlFor="unitRate" className={label}>Unit rate (optional, for audit estimation)</label>
          <input id="unitRate" type="number" min="0" step="any" className="field" value={rate} onChange={e=>setRate(e.target.value)} placeholder="e.g. 400" /></div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary min-w-40" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Bill'}
          </button>
          {Object.keys(errors).some((k) => errors[k as keyof Errors]) && (
            <span role="alert" className="text-sm text-red-300">Please fix the highlighted fields.</span>
          )}
        </div>
      </form>
    </section>
  )
}
