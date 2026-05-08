import { Glob } from 'bun'

const entrypoints = [...new Glob('routes/*.{ts,tsx}').scanSync('.')]
const result = await Bun.build({
  entrypoints,
  outdir: './dist',
  target: 'browser',
  format: 'esm'
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
