// Copy the pipeline's exports into the frontend's public directory so that the dev
// server can serve them. Missing files are reported but never fatal.
//   data/derived/*.json.gz          feature graph (independent of any run)
//   data/derived/<run>/*            the atlas of one run (default "pilot", or ATLAS_RUN)
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const derived = join(root, 'data', 'derived')
const run = process.env.ATLAS_RUN || 'pilot'
const target = join(root, 'frontend', 'public', 'atlas')

const groups = [
  {
    name: 'feature graph',
    dir: derived,
    files: ['features.json.gz', 'feature_sample.json.gz'],
    hint: 'npm run graph',
  },
  {
    name: `atlas "${run}"`,
    dir: join(derived, run),
    files: ['manifest.json', 'tracks.json.gz', 'clusters.json.gz', 'neighbors.json.gz'],
    hint: 'npm run atlas',
  },
]

mkdirSync(target, { recursive: true })
for (const { name, dir, files, hint } of groups) {
  const present = files.filter((file) => existsSync(join(dir, file)))
  if (present.length < files.length) {
    const missing = files.filter((file) => !present.includes(file)).join(', ')
    console.warn(`Missing for the ${name}: ${missing}. Build it with: ${hint}`)
  }
  for (const file of present) copyFileSync(join(dir, file), join(target, file))
  if (present.length > 0) console.log(`Copied the ${name} (${present.length} files) to frontend/public/atlas`)
}
