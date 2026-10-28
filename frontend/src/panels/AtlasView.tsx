import { useEffect, useState } from 'react'
import { loadAtlas } from '../data/loader'
import AtlasMap from '../map/AtlasMap'
import { fitView } from '../map/geometry'
import { createAtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import AtlasSettings from './AtlasSettings'
import AtlasToolbar from './AtlasToolbar'
import Legend from './Legend'
import TrackDetails from './TrackDetails'

/** Mount this view with a static export directory, or use the bundled synthetic fixture. */
export default function AtlasView({ baseUrl = './fixtures' }: { baseUrl?: string }) {
  const [store] = useState(createAtlasStore)
  const { status, error, settingsOpen } = useAtlasStore(store)

  useEffect(() => {
    const controller = new AbortController()
    store.startLoading()
    void loadAtlas(baseUrl, controller.signal).then((atlas) => {
      if (controller.signal.aborted) return
      store.setAtlas(atlas)
      store.setView(fitView(atlas.tracks))
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) store.failLoading(error instanceof Error ? error.message : String(error))
    })
    return () => controller.abort()
  }, [baseUrl, store])

  if (status === 'idle' || status === 'loading') return <p role="status">Loading…</p>
  if (status === 'error') return <p role="alert">{error}</p>
  return (
    <section aria-label="Music atlas" className="atlas-view">
      <div className="atlas-column">
        <AtlasToolbar store={store} />
        <AtlasMap store={store} />
        <Legend store={store} />
        {settingsOpen ? <AtlasSettings store={store} /> : null}
      </div>
      <TrackDetails store={store} />
    </section>
  )
}
