import { useEffect, useState } from 'react'
import { loadAtlas } from '../data/loader'
import AtlasMap from '../map/AtlasMap'
import { fitView } from '../map/geometry'
import { createAtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import AtlasControls from './AtlasControls'
import TrackDetails from './TrackDetails'

/** Mount this view with a static export directory, or use the bundled synthetic fixture. */
export default function AtlasView({ baseUrl = './fixtures' }: { baseUrl?: string }) {
  const [store] = useState(createAtlasStore)
  const { status, error } = useAtlasStore(store)

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

  return (
    <section aria-label="Music atlas" aria-busy={status === 'loading'}>
      {status === 'idle' || status === 'loading' ? <p role="status">Loading atlas…</p> : null}
      {status === 'error' ? <p role="alert">{error}</p> : null}
      {status === 'ready' ? <>
        <AtlasControls store={store} />
        <div className="atlas-layout">
          <AtlasMap store={store} />
          <TrackDetails store={store} />
        </div>
      </> : null}
    </section>
  )
}
