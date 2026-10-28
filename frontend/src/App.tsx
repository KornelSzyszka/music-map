import { useState } from 'react'
import AtlasView from './panels/AtlasView'
import FeatureGraphView from './panels/FeatureGraphView'

type Tab = 'map' | 'features'

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'features', label: 'Features' },
]

// The map tab uses the bundled synthetic atlas until the pipeline export exists.
export default function App() {
  const [tab, setTab] = useState<Tab>('features')
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
      {tab === 'map' ? <AtlasView baseUrl="./fixtures" /> : <FeatureGraphView baseUrl="./atlas" />}
    </main>
  )
}
