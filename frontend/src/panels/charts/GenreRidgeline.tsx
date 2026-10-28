import type { FeatureNode } from '../../data/featureGraph'
import { genresByMedian, ridgelineRows } from '../../derive/featureCharts'
import { axisPosition } from '../../derive/featureGraph'
import { formatNumber, genreSlot } from './format'

const WIDTH = 360
const LABEL = 92
const ROW = 30
const PEAK = 26
const AXIS_ROOM = 18

interface Props {
  feature: FeatureNode
  quantiles: readonly number[]
  highlighted: readonly string[]
}

/** One distribution per genre, stacked and sorted by median, on the same axis. */
export default function GenreRidgeline({ feature, quantiles, highlighted }: Props) {
  const genres = genresByMedian(feature, quantiles)
  const rows = ridgelineRows(feature, genres, WIDTH - LABEL, PEAK)
  const medianIndex = quantiles.indexOf(50)
  const plot = WIDTH - LABEL
  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${rows.length * ROW + AXIS_ROOM}`}
        role="img"
        aria-label={`${feature.label}: distribution for each genre, ordered by median`}
      >
        {rows.map((row, index) => {
          const top = index * ROW + (ROW - PEAK) / 2
          const slot = genreSlot(row.genre, highlighted)
          const median = axisPosition(feature.histogram, feature.genre_profile[row.genre][medianIndex], plot)
          return (
            <g key={row.genre} transform={`translate(${LABEL} ${top})`}>
              <text className="axis-label" x={-6} y={PEAK - 4} textAnchor="end">{row.genre}</text>
              <polygon
                className={slot === null ? 'ridge ridge-muted' : `ridge series-${slot + 1}`}
                points={row.points.map((point) => `${point.x},${point.y}`).join(' ')}
              >
                <title>{`${row.genre}: median ${formatNumber(feature.genre_profile[row.genre][medianIndex])}`}</title>
              </polygon>
              <line className="median" x1={median} x2={median} y1={0} y2={PEAK} />
            </g>
          )
        })}
        <text className="axis-label" x={LABEL} y={rows.length * ROW + 14}>
          {formatNumber(feature.histogram.edges[0])}
        </text>
        <text className="axis-label" x={WIDTH} y={rows.length * ROW + 14} textAnchor="end">
          {formatNumber(feature.histogram.edges[feature.histogram.edges.length - 1])}
        </text>
      </svg>
      <figcaption>Each genre is scaled to its own tallest bin, so the shapes compare. Tick: median.</figcaption>
    </figure>
  )
}
