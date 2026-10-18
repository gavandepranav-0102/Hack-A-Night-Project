import { useEffect, useRef, useState } from 'react';
import { CameraIcon, CheckIcon, XIcon } from './Icons.jsx';

const errorMessage = (err) => ({
  NotAllowedError: 'Camera access is blocked. Tap the lock or camera icon in your browser address bar, set Camera to Allow, then reopen the camera.',
  SecurityError: 'Camera access is blocked. Tap the lock or camera icon in your browser address bar, set Camera to Allow, then reopen the camera.',
  NotFoundError: 'No camera was found on this device. Connect a camera or use a device that has one.',
  NotReadableError: 'The camera is being used by another app. Close that app, then reopen the camera.',
  NotSupportedError: 'This browser cannot open the camera here. Open the site over HTTPS (or localhost) in an up-to-date browser.',
}[err?.name] || 'The camera could not be started. Check your browser camera permission and try again.');

// Live camera capture only (getUserMedia). Photos are kept locally until "Done".
export default function CameraModal({ title, existingCount, onDone, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState('starting'); // starting | live | error
  const [error, setError] = useState('');
  const [shots, setShots] = useState([]); // {id, file, url} taken in this session
  const [flash, setFlash] = useState(false);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setState('live');
      } catch (err) { if (!cancelled) { setError(errorMessage(err)); setState('error'); } }
    })();
    return () => { cancelled = true; stopStream(); };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v?.videoWidth || shots.length + existingCount >= 6) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setShots((s) => [...s, { id: `${Date.now()}-${s.length}`, file, url: URL.createObjectURL(file) }]);
      setFlash(true); setTimeout(() => setFlash(false), 150);
    }, 'image/jpeg', 0.9);
  };

  const retake = () => setShots((s) => { const last = s[s.length - 1]; if (last) URL.revokeObjectURL(last.url); return s.slice(0, -1); });
  const finish = (keep) => { stopStream(); if (keep) onDone(shots); else shots.forEach((s) => URL.revokeObjectURL(s.url)); onClose(); };
  const last = shots[shots.length - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-xl max-h-full overflow-y-auto rounded-2xl bg-navy-900 border border-white/15 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-2xl font-bold">{title}</h3>
          <button onClick={() => finish(false)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close camera and discard this session"><XIcon /></button>
        </div>

        {state === 'error' ? (
          <div role="alert" className="rounded-lg bg-red-500/15 border border-red-400/50 p-4 text-sm text-red-100">{error}</div>
        ) : (
          <div className="relative">
            <video ref={videoRef} playsInline muted className="w-full aspect-[4/3] bg-black rounded-lg object-cover" />
            {state === 'starting' && <p className="absolute inset-0 grid place-items-center text-white/80">Starting camera...</p>}
            {flash && <div className="absolute inset-0 bg-white/80 rounded-lg" />}
            {last && <img src={last.url} alt="Last captured photo" className="absolute bottom-2 left-2 w-16 h-16 object-cover rounded-md border-2 border-bv-yellow" />}
          </div>
        )}

        <p className="mt-3 text-sm text-white/80" aria-live="polite">
          {shots.length} photo{shots.length === 1 ? '' : 's'} captured in this session{existingCount ? ` (${existingCount} already on the dashboard)` : ''}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <button onClick={capture} disabled={state !== 'live' || shots.length + existingCount >= 6} className="col-span-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-bv-yellow2 to-bv-yellow text-navy-950 font-display text-xl font-bold py-3.5 disabled:opacity-40">
            <CameraIcon /> Capture Photo
          </button>
          <button onClick={retake} disabled={!shots.length} className="col-span-1 rounded-lg border border-white/30 font-semibold py-3 disabled:opacity-40">Retake</button>
          <button onClick={() => finish(true)} disabled={!shots.length} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border-2 border-bv-yellow text-bv-yellow font-bold py-3 disabled:opacity-40 disabled:border-white/20 disabled:text-white/40">
            <CheckIcon className="w-5 h-5" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
