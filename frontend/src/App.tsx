import { useEffect, useState } from 'react'
import { chooseAtlasSource, type AtlasSource } from './data/source'
import AtlasView from './panels/AtlasView'
import FeatureGraphView from './panels/FeatureGraphView'
import { applyTheme, loadTheme, nextTheme, saveTheme, type ThemeChoice } from './state/theme'

type Tab = 'map' | 'features'

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'features', label: 'Features' },
]

const THEME_LABELS: Record<ThemeChoice, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('map')
  const [source, setSource] = useState<AtlasSource | null>(null)
  const [theme, setTheme] = useState<ThemeChoice>(() => loadTheme(storage()))

  useEffect(() => {
    applyTheme(theme, document.documentElement)
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    void chooseAtlasSource(fetch, controller.signal).then((chosen) => {
      if (!controller.signal.aborted) setSource(chosen)
    })
    return () => controller.abort()
  }, [])

  function cycleTheme(): void {
    const next = nextTheme(theme)
    setTheme(next)
    saveTheme(storage(), next)
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="brand">Music Atlas</h1>
        <nav aria-label="Views">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" className="tab" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="button" onClick={cycleTheme} aria-label={`Theme: ${THEME_LABELS[theme]}`}>
          {THEME_LABELS[theme]}
        </button>
      </header>
      {tab === 'map' ? (
        source ? (
          <>
            {source.synthetic ? <p className="notice" role="note">Demo data</p> : null}
            <AtlasView baseUrl={source.baseUrl} />
          </>
        ) : (
          <p role="status">Loading…</p>
        )
      ) : (
        <FeatureGraphView baseUrl="./atlas" />
      )}
    </main>
  )
}
