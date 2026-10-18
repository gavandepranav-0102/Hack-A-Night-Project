import Background from './components/Background.jsx';
import Header from './components/Header.jsx';
import UploadCard from './components/UploadCard.jsx';
import { BoxesIcon, CameraIcon } from './components/Icons.jsx';

let bp = null;
try { bp = JSON.parse(localStorage.getItem('bp_session')); } catch { /* ignore */ }
const supervisor = { name: bp?.name || 'Rahul', role: 'Site Supervisor' };
// End the server-side session before returning to the landing/login page.
// Other menu items remain unchanged.
const onMenu = async (id) => {
  if (id === 'logout') {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`Logout failed (${response.status})`);
      localStorage.removeItem('bp_session');
      window.location.replace('/');
    } catch (error) {
      alert(`Unable to log out. Please try again. ${error.message}`);
    }
    return;
  }
  alert(`Demo: "${id}" is not connected yet.`);
};

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Background />
      <Header name={supervisor.name} role={supervisor.role} onSelect={onMenu} />
      <div className="flex flex-1">
                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto glass rounded-2xl p-5 sm:p-8">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-wide uppercase">Supervisor <span className="text-bv-yellow">Dashboard</span></h1>
            <p className="mt-2 text-white/90">Capture site progress and verify construction material inventory.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <UploadCard category="site" label="Site" Icon={CameraIcon} title="Site Image"
                description="Capture the current construction site to verify work progress and construction milestones."
                openLabel="Upload Image" submitLabel="Submit Site Evidence" />
              <UploadCard category="stock" label="Stock" Icon={BoxesIcon} title="Stock Image"
                description="Capture cement bags, steel rods, bricks, sand, aggregates and other construction materials to verify inventory."
                openLabel="Upload Image" submitLabel="Submit Stock Evidence" />
            </div>

            <p className="mt-8 pt-4 border-t border-white/20 text-center text-sm">Copyright &copy; 2026</p>
          </div>
        </main>
      </div>
    </div>
  );
}
