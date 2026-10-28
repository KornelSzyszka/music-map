import { SEQUENTIAL_STEPS } from '../derive/colouring'
import { featureLabel } from '../derive/options'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'

const GRADIENT = `linear-gradient(to right, ${Array.from({ length: SEQUENTIAL_STEPS }, (_, index) => `var(--seq-${index + 1})`).join(', ')})`

function formatBound(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

/** Names the colours of the active mode; nothing is shown when the map has no colour code. */
export default function Legend({ store }: { store: AtlasStore }) {
  const { derived } = useAtlasStore(store)
  const { legend } = derived
  if (legend.kind === 'none') return null
  if (legend.kind === 'scale') {
    return (
      <section className="legend glass" aria-label={`Legend: ${featureLabel(legend.feature)}`}>
        <span className="legend-title">{featureLabel(legend.feature)}</span>
        <div className="scale" style={{ background: GRADIENT }} role="img" aria-label={`${formatBound(legend.min)} to ${formatBound(legend.max)}`} />
        <div className="scale-ends"><span>{formatBound(legend.min)}</span><span>{formatBound(legend.max)}</span></div>
      </section>
    )
  }
  return (
    <section className="legend glass" aria-label="Legend">
      <ul>
        {legend.entries.map((entry) => (
          <li key={`${entry.slot}:${entry.label}`}>
            <span className={`swatch slot-${entry.slot + 1}`} aria-hidden="true" />
            <span className="legend-label">{entry.label}</span>
            <span className="legend-count">{entry.count.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
