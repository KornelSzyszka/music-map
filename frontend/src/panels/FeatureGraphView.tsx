import { useEffect, useReducer, useState } from 'react'
import {
  FEATURE_FAMILIES,
  loadFeatureGraph,
  loadFeatureSample,
  type FeatureGraph,
} from '../data/featureGraph'
import { FAMILY_LABELS } from '../derive/featureGraph'
import FeatureGraphMap from '../map/FeatureGraphMap'
import { featureGraphReducer, initialFeatureGraphState } from '../state/featureGraphState'
import type { SampleState } from './charts/CompareScatter'
import FeatureDetail from './FeatureDetail'

interface LoadResult {
  baseUrl: string
  graph?: FeatureGraph
  error?: string
  sample: SampleState
}

function message(failure: unknown): string {
  return failure instanceof Error ? failure.message : String(failure)
}

/** Loads `features.json.gz` (and the scatter sample) from a directory and shows the graph. */
export default function FeatureGraphView({ baseUrl = './atlas' }: { baseUrl?: string }) {
  const [result, setResult] = useState<LoadResult | null>(null)
  const [layoutKey, setLayoutKey] = useState(0)
  const [state, dispatch] = useReducer(featureGraphReducer, initialFeatureGraphState)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    loadFeatureGraph(baseUrl, signal)
      .then((graph) => {
        if (signal.aborted) return undefined
        setResult({ baseUrl, graph, sample: { status: 'loading' } })
        // The sample is larger and only the Compare tab needs it, so it never blocks the graph.
        return loadFeatureSample(baseUrl, signal)
          .then((sample) => {
            if (!signal.aborted) setResult({ baseUrl, graph, sample: { status: 'ready', sample } })
          })
          .catch((failure: unknown) => {
            if (!signal.aborted) setResult({ baseUrl, graph, sample: { status: 'error', error: message(failure) } })
          })
      })
      .catch((failure: unknown) => {
        if (!signal.aborted) setResult({ baseUrl, error: message(failure), sample: { status: 'loading' } })
      })
    return () => controller.abort()
  }, [baseUrl])

  // A result for another base URL is stale, so show the loading state again.
  const current = result?.baseUrl === baseUrl ? result : null
  if (current?.error) return <p role="alert">{current.error}</p>
  const graph = current?.graph
  if (!graph || !current) return <p role="status">Loading…</p>

  const selected = graph.features.find((feature) => feature.id === state.selected) ?? null
  return (
    <section aria-label="Feature graph" className="feature-view">
      <div>
        <header>
          <div className="chips" role="group" aria-label="Feature families">
            {FEATURE_FAMILIES.map((family) => {
              const hidden = state.hiddenFamilies.has(family)
              return (
                <button
                  key={family}
                  type="button"
                  className="chip"
                  aria-pressed={!hidden}
                  onClick={() => dispatch({ type: 'toggleFamily', family })}
                >
                  <span className={`swatch family-${family}`} aria-hidden="true" />
                  {FAMILY_LABELS[family]}
                </button>
              )
            })}
            <button type="button" className="chip" onClick={() => setLayoutKey((key) => key + 1)}>
              Re-layout
            </button>
          </div>
        </header>
        <FeatureGraphMap key={layoutKey} graph={graph} state={state} dispatch={dispatch} />
      </div>
      <FeatureDetail graph={graph} feature={selected} state={state} dispatch={dispatch} sampleState={current.sample} />
    </section>
  )
}
