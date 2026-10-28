export const REAL_ATLAS_URL = './atlas'
export const DEMO_ATLAS_URL = './fixtures'

export interface AtlasSource {
  baseUrl: string
  /** True when the bundled synthetic atlas is used because no pipeline export exists. */
  synthetic: boolean
}

type Fetch = (input: string, init?: { signal?: AbortSignal }) => Promise<Pick<Response, 'ok' | 'headers'>>

/**
 * Prefer the pipeline's export; fall back to the synthetic demo atlas. A dev server
 * answers unknown paths with index.html, so "ok" alone is not proof of a manifest.
 */
export async function chooseAtlasSource(fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<AtlasSource> {
  try {
    const response = await fetchFn(`${REAL_ATLAS_URL}/manifest.json`, { signal })
    const type = response.headers.get('content-type') ?? ''
    if (response.ok && type.includes('json')) return { baseUrl: REAL_ATLAS_URL, synthetic: false }
  } catch {
    // Offline or blocked: the demo atlas still works.
  }
  return { baseUrl: DEMO_ATLAS_URL, synthetic: true }
}
