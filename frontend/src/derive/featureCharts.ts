import type { FeatureGraph, FeatureNode, FeatureSample, TagEntry } from '../data/featureGraph'
import { neighboursOf } from './featureGraph'

export interface RidgeRow {
  genre: string
  /** Points of the filled outline, x in [0, width], y in [0, height] (0 is the top). */
  points: Array<{ x: number; y: number }>
}

export interface TagBar {
  tag: string
  category: string
  n: number
  value: number
  /** Bar start and width as fractions of the half-width, signed by `value`. */
  fraction: number
}

export interface ScatterPoint {
  x: number
  y: number
  genre: string | null
}

export interface Axis {
  min: number
  max: number
}

/** One filled outline per genre, each scaled to its own tallest bin to compare shapes. */
export function ridgelineRows(
  node: FeatureNode,
  genres: readonly string[],
  width: number,
  height: number,
): RidgeRow[] {
  return genres
    .filter((genre) => node.genre_histogram[genre])
    .map((genre) => {
      const shares = node.genre_histogram[genre]
      const tallest = Math.max(1e-9, ...shares)
      const step = width / shares.length
      const points = [{ x: 0, y: height }]
      shares.forEach((share, index) => {
        const y = height - (share / tallest) * height
        points.push({ x: index * step, y }, { x: (index + 1) * step, y })
      })
      points.push({ x: width, y: height })
      return { genre, points }
    })
}

/** Genres ordered by their median on this feature (low to high). */
export function genresByMedian(node: FeatureNode, quantiles: readonly number[]): string[] {
  const index = quantiles.indexOf(50)
  if (index < 0) throw new Error('Export is missing the 50th percentile')
  return Object.entries(node.genre_profile)
    .sort((a, b) => a[1][index] - b[1][index])
    .map(([genre]) => genre)
}

/** Tags split into the highest and lowest groups, with bars scaled to the largest |mean|. */
export function tagBars(entries: readonly TagEntry[]): TagBar[] {
  const largest = Math.max(1e-9, ...entries.map((entry) => Math.abs(entry.mean_z)))
  return [...entries]
    .sort((a, b) => b.mean_z - a.mean_z)
    .map((entry) => ({
      tag: entry.tag,
      category: entry.category,
      n: entry.n,
      value: entry.mean_z,
      fraction: entry.mean_z / largest,
    }))
}

export function pearson(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length < 2) return 0
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length
  let covariance = 0
  let varianceA = 0
  let varianceB = 0
  for (let i = 0; i < a.length; i += 1) {
    covariance += (a[i] - meanA) * (b[i] - meanB)
    varianceA += (a[i] - meanA) ** 2
    varianceB += (b[i] - meanB) ** 2
  }
  const denominator = Math.sqrt(varianceA * varianceB)
  return denominator === 0 ? 0 : covariance / denominator
}

/** Axis range between the 1st and 99th percentile so outliers do not flatten the plot. */
export function robustAxis(values: readonly number[]): Axis {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 0) return { min: 0, max: 1 }
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))]
  const min = at(0.01)
  const max = at(0.99)
  return max > min ? { min, max } : { min, max: min + 1 }
}

export function scatterPoints(sample: FeatureSample, xId: string, yId: string): ScatterPoint[] {
  const xIndex = sample.features.indexOf(xId)
  const yIndex = sample.features.indexOf(yId)
  if (xIndex < 0 || yIndex < 0) return []
  return sample.values.map((row, index) => ({ x: row[xIndex], y: row[yIndex], genre: sample.genres[index] }))
}

/** The feature most correlated with `id`, or the first other feature as a fallback. */
export function defaultCompare(graph: FeatureGraph, id: string): string | null {
  const related = [...neighboursOf(graph, id)].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  if (related.length > 0) return related[0][0]
  return graph.features.find((feature) => feature.id !== id)?.id ?? null
}

/** Genres with the lowest and highest median: the most telling pair to highlight first. */
export function defaultHighlight(node: FeatureNode, quantiles: readonly number[]): string[] {
  const ordered = genresByMedian(node, quantiles)
  if (ordered.length <= 2) return ordered
  return [ordered[0], ordered[ordered.length - 1]]
}
