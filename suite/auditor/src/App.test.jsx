import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
const bill = (id, extra = {}) => ({ id, material: 'Cement', quantity: 50, unit: 'bags', supplier: 'X', billNumber: 'B1', deliveryDate: '2026-09-02', image: IMG, ...extra })

beforeEach(() => { localStorage.clear(); localStorage.setItem('bp_session', JSON.stringify({ name: 'Asha', profession: 'Project Auditor' })) })

test('reads shared records, tabs, lightbox, analyse, history, logout', async () => {
  const u = userEvent.setup()
  render(<App />)
  expect(screen.getByText('No bills or receipts yet')).toBeInTheDocument()
  cleanup()
  localStorage.setItem('buildproof.bills', JSON.stringify([bill('a'), bill('b'), bill('seed-1', { material: 'Sand' })]))
  localStorage.setItem('buildproof.supervisor.records', JSON.stringify([{ id: 's1', image: IMG, category: 'site', date: '2026-09-06' }]))
  render(<App />)
  expect(screen.getByText('Sample bills are showing.', { exact: false })).toBeInTheDocument()
  await u.click(screen.getByRole('tab', { name: /Supervisor/ }))
  expect(screen.getByText('Site evidence')).toBeInTheDocument()
  expect(screen.getByText('Site progress')).toBeInTheDocument()
  await u.click(screen.getByRole('tab', { name: /Storekeeper/ }))
  await u.click(screen.getAllByRole('button', { name: /View full image/ })[0])
  expect(screen.getByRole('dialog', { name: 'Full image' })).toBeInTheDocument()
  await u.keyboard('{Escape}')
  await u.click(screen.getByRole('button', { name: 'Analyse Records' }))
  expect(screen.getByText(/Possible duplicate bills/)).toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: 'Close' }))
  await u.click(screen.getByRole('button', { name: 'Open menu' }))
  await u.click(screen.getByRole('button', { name: /History/ }))
  expect(screen.getByText(/possible discrepanc/)).toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: 'Close' }))
  await u.click(screen.getByRole('button', { name: 'Open menu' }))
  const assign = vi.fn()
  Object.defineProperty(window, 'location', { value: { assign }, writable: true })
  await u.click(screen.getByRole('button', { name: /Logout/ }))
  expect(assign).toHaveBeenCalledWith('/')
  expect(localStorage.getItem('bp_session')).toBeNull()
})

test('handles corrupt or odd localStorage safely', () => {
  localStorage.setItem('buildproof.bills', '{bad json')
  localStorage.setItem('buildproof.supervisor.records', JSON.stringify([null, { id: 1 }]))
  render(<App />)
  expect(screen.getByText('No bills or receipts yet')).toBeInTheDocument()
})
