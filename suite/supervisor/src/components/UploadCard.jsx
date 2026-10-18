import { useEffect, useRef, useState } from 'react';
import CameraModal from './CameraModal.jsx';
import { CameraIcon, CheckIcon, XIcon } from './Icons.jsx';
import { submitEvidence } from '../services/submitEvidence.js';

const MIN = 3;
const MAX = 6;

export default function UploadCard({ category, label, title, description, Icon, openLabel, submitLabel }) {
  // Each card owns its own collection, so site and stock counts never mix.
  const [images, setImages] = useState([]); // {id, file, url}
  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const imagesRef = useRef([]);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const addShots = (shots) => { if (images.length + shots.length > MAX) { shots.forEach(s => URL.revokeObjectURL(s.url)); setError("Maximum 6 images per category."); return; } setImages((p) => [...p, ...shots]); setError(''); if (status === 'success') setStatus('idle'); };
  const remove = (id) => setImages((p) => { const g = p.find((i) => i.id === id); if (g) URL.revokeObjectURL(g.url); return p.filter((i) => i.id !== id); });

  const count = images.length;
  const ready = count >= MIN && count <= MAX;
  const busy = status === 'submitting';

  const submit = async () => {
    if (!ready || busy) return;
    setStatus('submitting'); setError('');
    try {
      const res = await submitEvidence(category, images.map((i) => i.file));
      setReceipt(res); setStatus('success');
    } catch (e) { setStatus('idle'); setError(e.message || 'Submission failed. Try again.'); }
  };

  return (
    <section aria-labelledby={`${category}-title`} className="glass flex flex-col rounded-xl p-6 sm:p-8 min-w-0">
      <div className="w-14 h-14 rounded-xl border-2 border-bv-yellow text-bv-yellow grid place-items-center mb-4"><Icon className="w-8 h-8" /></div>
      <h2 id={`${category}-title`} className="font-display text-4xl font-bold leading-tight">{title}</h2>
      <p className="mt-3 text-white/85 text-[15px] leading-relaxed max-w-md">{description}</p>

      {status === 'success' && receipt && (
        <div className="mt-5 rounded-xl border border-emerald-400/60 bg-emerald-500/10 p-4" role="status">
          <p className="flex items-center gap-2 font-semibold text-emerald-300"><CheckIcon /> {label} evidence submitted</p>
          <p className="text-sm text-white/80 mt-1">{receipt.count} images · {new Date(receipt.receivedAt).toLocaleString()}</p>
          <p className="text-xs text-white/55 mt-1">Saved securely on the FastAPI server for authorized Project Auditor review.</p>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm mb-2" aria-live="polite">
          <span className="font-semibold">{count}/{MAX} images captured (minimum {MIN})</span>
          {ready && <span className="flex items-center gap-1 text-emerald-300"><CheckIcon className="w-4 h-4" /> Ready to submit</span>}
        </div>
        {count > 0 && (
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img, n) => (
              <li key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/25">
                <img src={img.url} alt={`${label} photo ${n + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => remove(img.id)} disabled={busy} aria-label={`Remove ${label} photo ${n + 1}`} className="absolute top-1 right-1 w-7 h-7 grid place-items-center rounded-full bg-black/75 hover:bg-red-600"><XIcon className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        {count > 0 && !ready && <p className="mt-2 text-sm text-bv-yellow2">Capture at least 3 images before submitting.</p>}
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/15 border border-red-400/50 p-3 text-sm text-red-200">{error}</p>}

      <div className="mt-auto pt-5 space-y-3">
        <button onClick={() => setCameraOpen(true)} disabled={busy || count >= MAX} className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-bv-yellow2 to-bv-yellow text-navy-950 font-display text-lg sm:text-xl font-bold py-3.5 shadow-lg shadow-black/40 disabled:opacity-50">
          <CameraIcon /> {openLabel}
        </button>
        <button onClick={submit} disabled={!ready || busy} className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-bv-yellow text-bv-yellow font-display text-xl font-bold py-3 enabled:hover:bg-bv-yellow enabled:hover:text-navy-950 disabled:border-white/20 disabled:text-white/40 disabled:cursor-not-allowed">
          {busy && <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
          {busy ? 'Submitting...' : submitLabel}
        </button>
      </div>

      {cameraOpen && <CameraModal title={`${label} camera`} existingCount={count} onDone={addShots} onClose={() => setCameraOpen(false)} />}
    </section>
  );
}
