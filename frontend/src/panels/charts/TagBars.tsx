import type { FeatureNode } from '../../data/featureGraph'
import { tagBars } from '../../derive/featureCharts'

const WIDTH = 360
const ROW = 22
const LABEL = 128
const COUNT_ROOM = 52
const AXIS_ROOM = 18

const CATEGORY_LABELS: Record<string, string> = { genre: 'genre', instrument: 'instrument', 'mood/theme': 'mood' }

/** Diverging bars: tags whose tracks score highest and lowest on this feature. */
export default function TagBars({ feature }: { feature: FeatureNode }) {
  const bars = tagBars(feature.tag_profile)
  if (bars.length === 0) return <p className="muted">No tag profile in this export.</p>
  const half = (WIDTH - LABEL - COUNT_ROOM) / 2
  const centre = LABEL + half
  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${bars.length * ROW + AXIS_ROOM}`}
        role="img"
        aria-label={`Tags with the highest and lowest average ${feature.label}`}
      >
        {bars.map((bar, index) => {
          const y = index * ROW
          const width = Math.abs(bar.fraction) * half
          const positive = bar.value >= 0
          return (
            <g key={`${bar.category}:${bar.tag}`}>
              <text className="axis-label" x={LABEL - 6} y={y + 15} textAnchor="end">{bar.tag}</text>
              <rect
                className={positive ? 'bar-high' : 'bar-low'}
                x={positive ? centre : centre - width}
                y={y + 3}
                width={Math.max(1, width)}
                height={ROW - 8}
                rx={2}
              >
                <title>{`${bar.tag} (${CATEGORY_LABELS[bar.category] ?? bar.category}, ${bar.n} tracks): ${bar.value >= 0 ? '+' : ''}${bar.value.toFixed(2)} standard deviations`}</title>
              </rect>
              <text className="axis-label" x={WIDTH} y={y + 15} textAnchor="end">
                {`${bar.value >= 0 ? '+' : ''}${bar.value.toFixed(2)}`}
              </text>
            </g>
          )
        })}
        <line className="zero-line" x1={centre} x2={centre} y1={0} y2={bars.length * ROW} />
        <text className="axis-label" x={centre} y={bars.length * ROW + 14} textAnchor="middle">average, in standard deviations</text>
      </svg>
      <figcaption>
        Tags with at least 300 tracks. Blue: tracks with this tag score above average; red: below.
      </figcaption>
    </figure>
  )
}
