import type { FeatureFamily, FeatureGraph, FeatureHistogram, FeatureNode } from '../data/featureGraph'

export const FAMILY_LABELS: Record<FeatureFamily, string> = {
  timbre: 'Timbre',
  mfcc: 'MFCC',
  contrast_bands: 'Contrast and bands',
  dynamics: 'Dynamics',
  rhythm: 'Rhythm',
  tonal: 'Tonal',
}

const MIN_RADIUS = 5
const RADIUS_RANGE = 13

export interface Point {
  x: number
  y: number
}

export interface Bar {
  x: number
  y: number
  width: number
  height: number
}

export interface BoxRow {
  genre: string
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
}

export function maxPower(graph: FeatureGraph): number {
  return Math.max(0, ...graph.features.map((feature) => feature.power))
}

/** Area-proportional radius so that node size reads as separation power. */
export function nodeRadius(power: number, strongest: number): number {
  if (strongest <= 0) return MIN_RADIUS
  return MIN_RADIUS + RADIUS_RANGE * Math.sqrt(Math.max(0, power) / strongest)
}

/** Map layout coordinates in [-1, 1] to a padded pixel box (y grows downwards). */
export function toPixels(feature: Pick<FeatureNode, 'x' | 'y'>, width: number, height: number, padding: number): Point {
  return {
    x: padding + ((feature.x + 1) / 2) * (width - 2 * padding),
    y: padding + ((1 - feature.y) / 2) * (height - 2 * padding),
  }
}

/** Correlation of every feature joined to `id` by a strong edge. */
export function neighboursOf(graph: FeatureGraph, id: string): Map<string, number> {
  const result = new Map<string, number>()
  for (const edge of graph.edges) {
    if (edge.source === id) result.set(edge.target, edge.r)
    else if (edge.target === id) result.set(edge.source, edge.r)
  }
  return result
}

export function visibleIds(graph: FeatureGraph, hidden: ReadonlySet<FeatureFamily>): Set<string> {
  return new Set(graph.features.filter((feature) => !hidden.has(feature.family)).map((feature) => feature.id))
}

/** Bars of a histogram scaled into a width x height box, baseline at the bottom. */
export function histogramBars(histogram: FeatureHistogram, width: number, height: number): Bar[] {
  const tallest = Math.max(1, ...histogram.counts)
  const barWidth = width / histogram.counts.length
  return histogram.counts.map((count, index) => {
    const barHeight = (count / tallest) * height
    return { x: index * barWidth, y: height - barHeight, width: barWidth, height: barHeight }
  })
}

/** Position of `value` on the histogram axis, clamped to the plotted range. */
export function axisPosition(histogram: FeatureHistogram, value: number, width: number): number {
  const low = histogram.edges[0]
  const high = histogram.edges[histogram.edges.length - 1]
  if (high <= low) return 0
  return Math.min(1, Math.max(0, (value - low) / (high - low))) * width
}

/** Genre rows sorted by median; quantiles are read in the order the export declares. */
export function boxRows(node: FeatureNode, quantiles: readonly number[]): BoxRow[] {
  const column = (percent: number): number => {
    const index = quantiles.indexOf(percent)
    if (index < 0) throw new Error(`Export is missing the ${percent}th percentile`)
    return index
  }
  const [i10, i25, i50, i75, i90] = [10, 25, 50, 75, 90].map(column)
  return Object.entries(node.genre_profile)
    .map(([genre, values]) => ({
      genre,
      p10: values[i10],
      p25: values[i25],
      median: values[i50],
      p75: values[i75],
      p90: values[i90],
    }))
    .sort((a, b) => a.median - b.median)
}
