// Same-origin reverse proxy for FastAPI and role-protected dashboard files.
// Landing page remains public; other visual assets and dashboard contents unchanged.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APPS } from './apps.mjs'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.env.PORT) || 5173
const backendHost = process.env.API_HOST || '127.0.0.1'
const backendPort = Number(process.env.API_PORT) || 8000
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }

if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/ not found. Run: npm run build'); process.exit(1) }

function forward(req,res,pathname) {
  const upstream = http.request({hostname:backendHost,port:backendPort,path:pathname,method:req.method,headers:{...req.headers,host:`${backendHost}:${backendPort}`}},response=>{
    res.writeHead(response.statusCode||502,response.headers);response.pipe(res)
  })
  upstream.on('error',()=>{if(!res.headersSent){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:'Backend unavailable. Start FastAPI on port 8000.'}))}})
  req.pipe(upstream)
}

async function verify(req, role) {
  return new Promise(resolve=>{
    const request=http.get({hostname:backendHost,port:backendPort,path:`/api/auth/role/${role}`,headers:{cookie:req.headers.cookie||''}},resp=>{
      resp.resume(); resolve(resp.statusCode===200?200:resp.statusCode||502)
    })
    request.setTimeout(5000,()=>request.destroy());request.on('error',()=>resolve(502))
  })
}

http.createServer(async(req,res)=>{
  let url
  try {url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)} catch {res.writeHead(400);return res.end()}
  if (url.startsWith('/api/')) return forward(req,res,req.url)
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}
  const app=APPS.find(a=>a.out&&(url==='/'+a.out||url.startsWith('/'+a.out+'/')))
  if(app){
    const result=await verify(req,app.out)
    if(result!==200){
      if(result===401){res.writeHead(302,{Location:'/'});return res.end()}
      res.writeHead(result===403?403:502,{'Content-Type':'text/plain'});return res.end(result===403?'Forbidden: wrong account role':'Authentication backend unavailable')
    }
    if(url==='/'+app.out){res.writeHead(301,{Location:app.base});return res.end()}
  }
  // The request's path must stay inside the compiled dist directory.
  const dir=path.resolve(dist,app?.out||'')
  let file=path.resolve(dist,'.'+url)
  if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403);return res.end()}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html')
  if(!fs.existsSync(file)) file=path.join(dir,'index.html')
  if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'})
  fs.createReadStream(file).pipe(res)
}).listen(port,()=>console.log(`BuildProof running at http://localhost:${port} (FastAPI ${backendHost}:${backendPort})`))
