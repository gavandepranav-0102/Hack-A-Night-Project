import { useEffect, useState } from 'react'
import type { Bill, Profile, View } from './types'
import { isLoggedIn, loadBills, loadProfile, saveBills, saveProfile, setLoggedIn } from './lib/storage'
import Background from './components/Background'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import UploadBillCard from './components/UploadBillCard'
import RecentBills from './components/RecentBills'
import HistoryView from './components/HistoryView'
import ProfileView from './components/ProfileView'
import { HelmetIcon } from './components/Icons'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [bills, setBills] = useState<Bill[]>([])
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [loggedIn, setLoggedInState] = useState<boolean>(true)

  useEffect(() => {
    fetch('/api/workflow/bills/mine',{credentials:'same-origin'}).then(async r => {
      if (!r.ok) throw new Error('Cannot load your bills');return r.json()
    }).then(rows => setBills(rows.map((r:any)=>({id:String(r.id),material:r.material,quantity:r.quantity,unit:r.unit,
      supplier:r.supplier,billNumber:r.bill_number,deliveryDate:r.delivery_date,fileName:r.file_name,
      fileSize:0,fileType:r.mime_type,submittedAt:r.created_at,status:'Pending',image:r.mime_type.startsWith('image/')?r.url:undefined})))).catch(console.error)
  },[])
  const navigate = (v: View) => { setView(v); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const addBill = (bill: Bill) => {
    const next = [bill, ...bills]
    setBills(next)
    // PostgreSQL holds the source of truth; no browser demo persistence.
  }

  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p) }

  const logout = () => { setLoggedIn(false); setLoggedInState(false); setMenuOpen(false); fetch('/api/auth/logout',{method:'POST'}).finally(()=>{localStorage.removeItem('bp_session'); window.location.assign('/')}) }
  const login = () => { window.location.assign('/') }

  if (!loggedIn) {
    return (
      <Background>
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="glass w-full max-w-sm p-8 text-center animate-pop-in">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-safety text-navy-950 shadow-lg shadow-safety/30"><HelmetIcon width={28} height={28} /></div>
            <h1 className="text-2xl font-bold">You've been logged out</h1>
            <p className="mt-2 text-sm text-white/60">Your demo data is saved in this browser.</p>
            <button className="btn-primary mt-6 w-full" onClick={login}>Log back in</button>
          </div>
        </main>
      </Background>
    )
  }

  return (
    <Background>
      <div className="flex min-h-screen flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />

        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-3 py-6 sm:px-6">
          <Sidebar view={view} open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={logout} />

          <main className="min-w-0 flex-1 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight animate-fade-up sm:text-3xl">
              Welcome back, <span className="text-safety">{profile.name}</span>
            </h2>

            {view === 'dashboard' && (
              <>
                <UploadBillCard onSubmit={addBill} />
                <RecentBills bills={bills} onViewAll={() => navigate('history')} />
              </>
            )}
            {view === 'history' && <HistoryView bills={bills} />}
            {view === 'profile' && <ProfileView profile={profile} onSave={updateProfile} />}
          </main>
        </div>

        <footer className="glass mx-3 mb-3 px-4 py-3 text-center text-sm text-white/60 sm:mx-6">© BuildProof AI 2026</footer>
      </div>
    </Background>
  )
}
