import type { FeatureGraph, FeatureNode } from '../data/featureGraph'
import { defaultCompare, defaultHighlight, genresByMedian } from '../derive/featureCharts'
import { FAMILY_LABELS, neighboursOf } from '../derive/featureGraph'
import { DETAIL_TABS, type DetailTab, type FeatureGraphAction, type FeatureGraphState } from '../state/featureGraphState'
import CompareScatter, { type SampleState } from './charts/CompareScatter'
import DistributionChart from './charts/DistributionChart'
import { formatNumber } from './charts/format'
import GenreBoxChart from './charts/GenreBoxChart'
import GenreChips from './charts/GenreChips'
import GenreRidgeline from './charts/GenreRidgeline'
import TagBars from './charts/TagBars'

const TOP_RELATED = 5

const TAB_LABELS: Record<DetailTab, string> = {
  distribution: 'Distribution',
  genres: 'Genres',
  quartiles: 'Quartiles',
  tags: 'Tags',
  compare: 'Compare',
}

interface Props {
  graph: FeatureGraph
  feature: FeatureNode | null
  state: FeatureGraphState
  dispatch: (action: FeatureGraphAction) => void
  sampleState: SampleState
}

export default function FeatureDetail({ graph, feature, state, dispatch, sampleState }: Props) {
  if (!feature) {
    return (
      <aside className="feature-detail">
        <p className="muted">
          Select a feature to see its distribution, how genres and tags differ on it, and how it compares with another feature.
        </p>
      </aside>
    )
  }
  const labels = new Map(graph.features.map((item) => [item.id, item.label]))
  const related = [...neighboursOf(graph, feature.id)]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, TOP_RELATED)
  const { stats } = feature
  const genres = genresByMedian(feature, graph.genre_quantiles)
  const highlighted = state.highlighted ?? defaultHighlight(feature, graph.genre_quantiles)
  const compareId = state.compareId ?? defaultCompare(graph, feature.id)
  const toggleGenre = (genre: string): void => dispatch({ type: 'toggleGenre', genre, current: highlighted })
  const tabId = (tab: DetailTab): string => `feature-tab-${tab}`

  return (
    <aside className="feature-detail" aria-live="polite">
      <h2>{feature.label}</h2>
      <p className="muted">
        <span className={`swatch family-${feature.family}`} aria-hidden="true" />
        {FAMILY_LABELS[feature.family]} · <code>{feature.id}</code>
      </p>
      <dl className="stats">
        <div><dt>Median</dt><dd>{formatNumber(stats.median)}</dd></div>
        <div><dt>Middle half</dt><dd>{formatNumber(stats.p25)} to {formatNumber(stats.p75)}</dd></div>
        <div><dt>Range</dt><dd>{formatNumber(stats.min)} to {formatNumber(stats.max)}</dd></div>
        <div><dt>Skew</dt><dd>{stats.skew.toFixed(2)}</dd></div>
        <div><dt>Genre separation</dt><dd>{(feature.power * 100).toFixed(0)}%</dd></div>
      </dl>

      <div className="tabs" role="tablist" aria-label="Views of this feature">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab}
            id={tabId(tab)}
            type="button"
            role="tab"
            className="tab tab-small"
            aria-selected={state.tab === tab}
            aria-controls="feature-tab-panel"
            onClick={() => dispatch({ type: 'setTab', tab })}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div id="feature-tab-panel" role="tabpanel" aria-labelledby={tabId(state.tab)}>
        {state.tab === 'distribution' ? <DistributionChart feature={feature} /> : null}
        {state.tab === 'genres' ? (
          <>
            <GenreChips genres={genres} highlighted={highlighted} onToggle={toggleGenre} />
            <GenreRidgeline feature={feature} quantiles={graph.genre_quantiles} highlighted={highlighted} />
          </>
        ) : null}
        {state.tab === 'quartiles' ? (
          <>
            <GenreChips genres={genres} highlighted={highlighted} onToggle={toggleGenre} />
            <GenreBoxChart feature={feature} quantiles={graph.genre_quantiles} highlighted={highlighted} />
          </>
        ) : null}
        {state.tab === 'tags' ? <TagBars feature={feature} /> : null}
        {state.tab === 'compare' ? (
          <>
            <GenreChips genres={genres} highlighted={highlighted} onToggle={toggleGenre} />
            <CompareScatter
              graph={graph}
              feature={feature}
              otherId={compareId}
              sampleState={sampleState}
              highlighted={highlighted}
              onCompare={(id) => dispatch({ type: 'setCompare', id })}
            />
          </>
        ) : null}
      </div>

      {related.length > 0 ? (
        <>
          <h3>Most correlated</h3>
          <ul className="related">
            {related.map(([id, r]) => (
              <li key={id}>
                <button type="button" onClick={() => dispatch({ type: 'select', id })}>{labels.get(id) ?? id}</button>
                <span className="muted"> r = {r.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  )
}
