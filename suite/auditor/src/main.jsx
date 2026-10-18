import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Authenticated role check against PostgreSQL; never trust browser localStorage.
(async()=>{
 const res=await fetch('/api/auth/role/auditor',{credentials:'same-origin'});
 if(!res.ok){location.replace('/');return}
 createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
})();
