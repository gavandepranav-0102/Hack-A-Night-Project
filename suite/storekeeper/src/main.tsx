import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Access control is enforced by the FastAPI server and suite reverse proxy.
(async()=>{
 const res=await fetch('/api/auth/role/storekeeper',{credentials:'same-origin'});
 if(!res.ok){location.replace('/');return}
 createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
})();
