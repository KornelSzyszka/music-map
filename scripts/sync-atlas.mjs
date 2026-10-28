// Copy the pipeline's feature export into the frontend's public directory so that
// the dev server can serve it. Missing files are reported but never fatal.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'data', 'derived')
const target = join(root, 'frontend', 'public', 'atlas')
const files = ['features.json.gz', 'feature_sample.json.gz']

const present = files.filter((file) => existsSync(join(source, file)))
if (present.length < files.length) {
  const missing = files.filter((file) => !present.includes(file)).join(', ')
  console.warn(`Missing in data/derived: ${missing}. The Features tab will be incomplete.`)
  console.warn('Build them with: npm run data (once), then npm run graph')
}
if (present.length > 0) {
  mkdirSync(target, { recursive: true })
  for (const file of present) copyFileSync(join(source, file), join(target, file))
  console.log(`Copied ${present.join(', ')} to frontend/public/atlas`)
}
