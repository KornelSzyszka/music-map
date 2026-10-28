import type { FeatureNode } from '../../data/featureGraph'
import { axisPosition, histogramBars } from '../../derive/featureGraph'
import { formatNumber } from './format'

const WIDTH = 360
const HEIGHT = 110
const AXIS_ROOM = 18

export default function DistributionChart({ feature }: { feature: FeatureNode }) {
  const { histogram, stats } = feature
  const bars = histogramBars(histogram, WIDTH, HEIGHT)
  const low = histogram.edges[0]
  const high = histogram.edges[histogram.edges.length - 1]
  const median = axisPosition(histogram, stats.median, WIDTH)
  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + AXIS_ROOM}`} role="img" aria-label={`Distribution of ${feature.label}`}>
        {bars.map((bar, index) => (
          <rect key={index} className="bar" x={bar.x + 0.5} y={bar.y} width={Math.max(0, bar.width - 1)} height={bar.height} rx={1.5}>
            <title>{`${formatNumber(histogram.edges[index])} to ${formatNumber(histogram.edges[index + 1])}: ${histogram.counts[index]} tracks`}</title>
          </rect>
        ))}
        <line className="median" x1={median} x2={median} y1={0} y2={HEIGHT} />
        <text className="axis-label" x={0} y={HEIGHT + 14}>{formatNumber(low)}</text>
        <text className="axis-label" x={WIDTH} y={HEIGHT + 14} textAnchor="end">{formatNumber(high)}</text>
        <text className="axis-label" x={median} y={HEIGHT + 14} textAnchor="middle">median {formatNumber(stats.median)}</text>
      </svg>
      <figcaption>{histogram.below} below · {histogram.above} above</figcaption>
    </figure>
  )
}
