import type { FeatureGraph, FeatureNode, FeatureSample } from '../../data/featureGraph'
import { pearson, robustAxis, scatterPoints } from '../../derive/featureCharts'
import { formatNumber, genreSlot } from './format'

const WIDTH = 360
const HEIGHT = 300
const LEFT = 56
const BOTTOM = 30
const TOP = 8
const RIGHT = 8

export interface SampleState {
  status: 'loading' | 'ready' | 'error'
  sample?: FeatureSample
  error?: string
}

interface Props {
  graph: FeatureGraph
  feature: FeatureNode
  otherId: string | null
  sampleState: SampleState
  highlighted: readonly string[]
  onCompare: (id: string) => void
}

export default function CompareScatter({ graph, feature, otherId, sampleState, highlighted, onCompare }: Props) {
  const other = graph.features.find((item) => item.id === otherId) ?? null
  const options = graph.features.filter((item) => item.id !== feature.id)

  if (sampleState.status === 'loading') return <p role="status" className="muted">Loading the track sample…</p>
  if (sampleState.status === 'error' || !sampleState.sample) {
    return <p role="alert">Comparison unavailable: {sampleState.error ?? 'no sample loaded'}</p>
  }
  if (!other) return <p className="muted">No other feature to compare with.</p>

  const points = scatterPoints(sampleState.sample, feature.id, other.id)
  const xAxis = robustAxis(points.map((point) => point.x))
  const yAxis = robustAxis(points.map((point) => point.y))
  const plotWidth = WIDTH - LEFT - RIGHT
  const plotHeight = HEIGHT - TOP - BOTTOM
  const px = (value: number): number => LEFT + ((value - xAxis.min) / (xAxis.max - xAxis.min)) * plotWidth
  const py = (value: number): number => TOP + (1 - (value - yAxis.min) / (yAxis.max - yAxis.min)) * plotHeight
  const inside = points.filter(
    (point) => point.x >= xAxis.min && point.x <= xAxis.max && point.y >= yAxis.min && point.y <= yAxis.max,
  )
  const muted = inside.filter((point) => genreSlot(point.genre, highlighted) === null)
  const coloured = inside.filter((point) => genreSlot(point.genre, highlighted) !== null)
  const r = pearson(points.map((point) => point.x), points.map((point) => point.y))

  return (
    <figure>
      <label className="field">
        <span className="muted">Compare with</span>
        <select value={other.id} onChange={(event) => onCompare(event.target.value)}>
          {options.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${feature.label} against ${other.label} for ${points.length} sampled tracks, correlation ${r.toFixed(2)}`}
      >
        <rect className="plot-frame" x={LEFT} y={TOP} width={plotWidth} height={plotHeight} />
        {muted.map((point, index) => (
          <circle key={`m${index}`} className="dot dot-muted" cx={px(point.x)} cy={py(point.y)} r={2} />
        ))}
        {coloured.map((point, index) => (
          <circle
            key={`c${index}`}
            className={`dot series-${(genreSlot(point.genre, highlighted) ?? 0) + 1}`}
            cx={px(point.x)}
            cy={py(point.y)}
            r={2.6}
          />
        ))}
        <text className="axis-label" x={LEFT} y={HEIGHT - 16}>{formatNumber(xAxis.min)}</text>
        <text className="axis-label" x={WIDTH - RIGHT} y={HEIGHT - 16} textAnchor="end">{formatNumber(xAxis.max)}</text>
        <text className="axis-label" x={(LEFT + WIDTH - RIGHT) / 2} y={HEIGHT - 3} textAnchor="middle">{feature.label}</text>
        <text className="axis-label" x={LEFT - 4} y={TOP + 10} textAnchor="end">{formatNumber(yAxis.max)}</text>
        <text className="axis-label" x={LEFT - 4} y={TOP + plotHeight} textAnchor="end">{formatNumber(yAxis.min)}</text>
        <text className="axis-label" x={10} y={TOP + plotHeight / 2} transform={`rotate(-90 10 ${TOP + plotHeight / 2})`} textAnchor="middle">
          {other.label}
        </text>
      </svg>
      <figcaption>
        {points.length} sampled tracks, correlation r = {r.toFixed(2)}. Axes cover the 1st to 99th percentile.
        Coloured: highlighted genres; grey: everything else.
      </figcaption>
    </figure>
  )
}
