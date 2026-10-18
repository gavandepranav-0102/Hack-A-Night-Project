import {useEffect,useState} from 'react';
import {Background} from './components';
const API='/api/workflow';
async function json(url,options={}) {const response=await fetch(url,{credentials:'same-origin',...options});const data=await response.json();if(!response.ok)throw Error(data.detail||'Request failed');return data;}
export default function App(){
 const [records,setRecords]=useState({supervisor:[],storekeeper:[]});
 const [tab,setTab]=useState('supervisor');const [report,setReport]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function refresh(){try{setRecords(await json(API+'/auditor/records'));setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{refresh()},[]);
 async function analyze(){setBusy(true);setError('');try{const r=await json(API+'/auditor/analyze',{method:'POST'});setReport(r.result);
 const response=await fetch(r.pdf_url,{credentials:'same-origin'});if(!response.ok)throw Error('PDF download failed');
 const blob=await response.blob();if(blob.type!=='application/pdf' && !blob.type.includes('pdf'))throw Error('Server did not return a PDF');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='buildproof-project-report-'+r.id+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <><Background/><main className="mx-auto max-w-6xl px-4 py-8 text-white min-h-screen">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><h1 className="font-display text-4xl font-bold">Project Auditor Dashboard</h1><button className="btn-ghost px-4 py-2" onClick={()=>fetch('/api/auth/logout',{method:'POST'}).finally(()=>location.assign('/'))}>Logout</button></div>
 <p className="mb-5 text-white/70">Confidential evidence review. Only authenticated Project Auditors can access these records and the generated report.</p>
 <div className="grid grid-cols-2 gap-3 mb-7">{[['supervisor','Supervisor — Site & Stock'],['storekeeper','Store Keeper — Bills']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={'rounded-xl border px-4 py-4 font-semibold '+(tab===id?'bg-yellow-400 text-black':'bg-white/10 text-white')}>{label} ({records[id].length})</button>)}</div>
 <div className="flex gap-3 mb-5"><button className="btn-hazard px-5 py-3 rounded-lg" disabled={busy} onClick={analyze}>{busy?'Analyzing...':'Analyze Automatically & Download PDF'}</button><button className="btn-ghost px-5 py-3" onClick={refresh}>Refresh submissions</button></div>
 {error&&<p role="alert" className="bg-red-900/70 p-3 rounded-lg mb-4">{error}</p>}
 {report&&<div className="glass rounded-xl p-4 mb-6"><h2 className="font-bold text-xl">Audit summary (PDF downloaded)</h2><p>Site photos: {report.site_images}; Stock photos: {report.stock_images}; Bills: {report.storekeeper_bills}</p><p className="text-white/70">The report lists known discrepancies and limitations. Photo counts are not proof of invoiced quantities.</p></div>}
 {tab==='supervisor' ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records.supervisor.map(r=><article key={r.id} className="glass rounded-xl p-4"><img alt={'Supervisor '+r.category} src={r.url} className="w-full h-48 object-cover rounded-lg"/><h3 className="font-bold mt-3">{r.category==='site'?'Construction Site':'Material Stock'} — {r.owner}</h3><p className="text-sm">AI screening: {r.ai_status}</p><p className="text-sm">Watermark: {r.watermark_status}</p><p className="text-xs text-white/60">{r.created_at}</p>{r.flags.map((flag,i)=><p key={i} className="text-xs text-yellow-200 mt-2">• {flag}</p>)}</article>)}</section>
 : <section className="grid gap-4 sm:grid-cols-2">{records.storekeeper.map(b=><article key={b.id} className="glass rounded-xl p-5"><h3 className="text-xl font-bold">{b.supplier} — #{b.bill_number}</h3><p>{b.material}: {b.quantity} {b.unit} · {b.owner}</p><p className="text-sm mt-2">OCR/document status: {b.verification}</p><p className="text-sm text-white/70">Entered estimated value: {b.unit_rate==null?'Rate not provided':(b.quantity*b.unit_rate).toFixed(2)}</p>{b.mime_type.startsWith('image/')&&<img src={b.url} className="mt-3 rounded-lg max-h-64" alt="Uploaded original bill"/>}<a href={b.url} target="_blank" rel="noreferrer" className="inline-block mt-3 underline text-yellow-300">View uploaded document</a>{b.findings.map((fl,i)=><p key={i} className="mt-2 text-xs text-yellow-200">• {fl}</p>)}</article>)}</section>}
 {records[tab].length===0&&<p className="glass rounded-xl p-6">No actual submissions yet. This view intentionally does not display fake demonstration records.</p>}
 </main></>;
}
