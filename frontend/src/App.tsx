import { useEffect, useState } from 'react'
import { chooseAtlasSource, type AtlasSource } from './data/source'
import AtlasView from './panels/AtlasView'
import FeatureGraphView from './panels/FeatureGraphView'

type Tab = 'map' | 'features'

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'features', label: 'Features' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('map')
  const [source, setSource] = useState<AtlasSource | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void chooseAtlasSource(fetch, controller.signal).then((chosen) => {
      if (!controller.signal.aborted) setSource(chosen)
    })
    return () => controller.abort()
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Music Atlas</h1>
        <nav aria-label="Views">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" className="tab" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'map' ? (
        source ? (
          <>
            {source.synthetic ? (
              <p className="notice" role="note">
                Showing the bundled synthetic demo. Build the real atlas with <code>npm run atlas</code> and restart.
              </p>
            ) : null}
            <AtlasView baseUrl={source.baseUrl} />
          </>
        ) : (
          <p role="status">Looking for the atlas…</p>
        )
      ) : (
        <FeatureGraphView baseUrl="./atlas" />
      )}
    </main>
  )
}
