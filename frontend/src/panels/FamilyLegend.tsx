import { FEATURE_FAMILIES, type FeatureFamily, type FeatureGraph } from '../data/featureGraph'
import { FAMILY_LABELS, MAX_RADIUS, MIN_RADIUS } from '../derive/featureGraph'

interface Props {
  graph: FeatureGraph
  hidden: ReadonlySet<FeatureFamily>
  onToggle: (family: FeatureFamily) => void
}

const KEY_WIDTH = 2 * MAX_RADIUS + MIN_RADIUS * 2 + 12

/** Colour is the feature family and size is genre separation; a family can be hidden by clicking it. */
export default function FamilyLegend({ graph, hidden, onToggle }: Props) {
  return (
    <section className="legend family-legend glass" aria-label="Legend">
      <ul>
        {FEATURE_FAMILIES.map((family) => {
          const count = graph.features.filter((feature) => feature.family === family).length
          if (count === 0) return null
          return (
            <li key={family}>
              <button type="button" className="legend-item" aria-pressed={!hidden.has(family)} onClick={() => onToggle(family)}>
                <span className={`swatch family-${family}`} aria-hidden="true" />
                <span>{FAMILY_LABELS[family]}</span>
                <span className="legend-count">{count}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <span className="size-key">
        <svg width={KEY_WIDTH} height={2 * MAX_RADIUS} aria-hidden="true">
          <circle cx={MIN_RADIUS} cy={MAX_RADIUS} r={MIN_RADIUS} />
          <circle cx={2 * MIN_RADIUS + 8 + MAX_RADIUS} cy={MAX_RADIUS} r={MAX_RADIUS} />
        </svg>
        Genre separation
      </span>
    </section>
  )
}
