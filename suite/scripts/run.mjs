import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { APPS } from './apps.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2]
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })

for (const app of APPS) {
  const cwd = path.join(root, app.dir)
  console.log(`\n=== ${mode}: ${app.dir} ===`)
  if (mode === 'setup') run('npm install --no-audit --no-fund', cwd)
  else if (mode === 'build') {
    const out = path.join(root, 'dist', app.out)
    run(`npm run build -- --base=${app.base} --outDir="${out}" --emptyOutDir`, cwd)
  }
}
console.log(mode === 'build' ? '\nDone. Start with: npm start' : '\nSetup done. Next: npm run build')
