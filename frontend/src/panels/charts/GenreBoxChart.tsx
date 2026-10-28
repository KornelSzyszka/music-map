import type { FeatureNode } from '../../data/featureGraph'
import { boxRows } from '../../derive/featureGraph'
import { formatNumber, genreSlot } from './format'

const WIDTH = 360
const ROW = 20
const LABEL = 96
const AXIS_ROOM = 18

interface Props {
  feature: FeatureNode
  quantiles: readonly number[]
  highlighted: readonly string[]
}

export default function GenreBoxChart({ feature, quantiles, highlighted }: Props) {
  const rows = boxRows(feature, quantiles)
  if (rows.length === 0) return <p className="muted">No genre profile for this feature.</p>
  const low = Math.min(...rows.map((row) => row.p10))
  const high = Math.max(...rows.map((row) => row.p90))
  const span = high - low || 1
  const plot = WIDTH - LABEL - 8
  const at = (value: number): number => LABEL + ((value - low) / span) * plot
  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${rows.length * ROW + AXIS_ROOM}`}
        role="img"
        aria-label={`${feature.label} by genre: median, quartiles and 10th to 90th percentile`}
      >
        {rows.map((row, index) => {
          const y = index * ROW + ROW / 2
          const slot = genreSlot(row.genre, highlighted)
          return (
            <g key={row.genre}>
              <text className="axis-label" x={LABEL - 6} y={y + 4} textAnchor="end">{row.genre}</text>
              <line className="whisker" x1={at(row.p10)} x2={at(row.p90)} y1={y} y2={y} />
              <rect
                className={slot === null ? 'box' : `box series-${slot + 1}`}
                x={at(row.p25)}
                y={y - 5}
                width={Math.max(1, at(row.p75) - at(row.p25))}
                height={10}
                rx={2}
              >
                <title>{`${row.genre}: median ${formatNumber(row.median)}, middle half ${formatNumber(row.p25)} to ${formatNumber(row.p75)}`}</title>
              </rect>
              <line className="median" x1={at(row.median)} x2={at(row.median)} y1={y - 6} y2={y + 6} />
            </g>
          )
        })}
        <text className="axis-label" x={LABEL} y={rows.length * ROW + 14}>{formatNumber(low)}</text>
        <text className="axis-label" x={WIDTH - 8} y={rows.length * ROW + 14} textAnchor="end">{formatNumber(high)}</text>
      </svg>
      <figcaption>Whisker: 10th to 90th percentile. Box: middle half. Tick: median. Single-genre tracks only.</figcaption>
    </figure>
  )
}
