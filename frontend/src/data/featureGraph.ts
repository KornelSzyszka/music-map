import { array, fetchJson, identifier, integer, invalid, number, record, string } from './loader'

/** Wire format of `features.json.gz`. Keep in sync with docs/architecture.md. */
export const FEATURE_FAMILIES = [
  'timbre',
  'mfcc',
  'contrast_bands',
  'dynamics',
  'rhythm',
  'tonal',
] as const

export type FeatureFamily = (typeof FEATURE_FAMILIES)[number]

export interface FeatureStats {
  min: number
  p25: number
  median: number
  p75: number
  max: number
  mean: number
  std: number
  skew: number
}

export interface FeatureHistogram {
  edges: number[]
  counts: number[]
  below: number
  above: number
}

export interface TagEntry {
  tag: string
  category: string
  mean_z: number
  n: number
}

export interface FeatureNode {
  id: string
  label: string
  family: FeatureFamily
  x: number
  y: number
  power: number
  stats: FeatureStats
  histogram: FeatureHistogram
  genre_profile: Record<string, number[]>
  genre_histogram: Record<string, number[]>
  tag_profile: TagEntry[]
}

export interface FeatureEdge {
  source: string
  target: string
  r: number
}

export interface FeatureGraph {
  feature_set_id: string
  genre_quantiles: number[]
  min_abs_correlation: number
  track_count: number
  features: FeatureNode[]
  edges: FeatureEdge[]
}

/** Sampled raw values for pairwise scatter plots (`feature_sample.json.gz`). */
export interface FeatureSample {
  feature_set_id: string
  features: string[]
  genres: Array<string | null>
  values: number[][]
}

export const FEATURE_GRAPH_FILE = 'features.json.gz'
export const FEATURE_SAMPLE_FILE = 'feature_sample.json.gz'

function numbers(value: unknown, path: string): number[] {
  return array(value, path).map((item, index) => number(item, `${path}[${index}]`))
}

function family(value: unknown, path: string): FeatureFamily {
  const result = string(value, path)
  const known = FEATURE_FAMILIES.find((candidate) => candidate === result)
  if (!known) return invalid(path, `one of ${FEATURE_FAMILIES.join(', ')}`)
  return known
}

function stats(value: unknown, path: string): FeatureStats {
  const item = record(value, path)
  return {
    min: number(item.min, `${path}.min`),
    p25: number(item.p25, `${path}.p25`),
    median: number(item.median, `${path}.median`),
    p75: number(item.p75, `${path}.p75`),
    max: number(item.max, `${path}.max`),
    mean: number(item.mean, `${path}.mean`),
    std: number(item.std, `${path}.std`),
    skew: number(item.skew, `${path}.skew`),
  }
}

function histogram(value: unknown, path: string): FeatureHistogram {
  const item = record(value, path)
  const edges = numbers(item.edges, `${path}.edges`)
  const counts = numbers(item.counts, `${path}.counts`)
  if (edges.length !== counts.length + 1 || counts.length === 0) {
    return invalid(path, 'edges with exactly one more entry than counts')
  }
  return {
    edges,
    counts,
    below: integer(item.below, `${path}.below`),
    above: integer(item.above, `${path}.above`),
  }
}

function tagEntry(value: unknown, path: string): TagEntry {
  const item = record(value, path)
  return {
    tag: identifier(item.tag, `${path}.tag`),
    category: identifier(item.category, `${path}.category`),
    mean_z: number(item.mean_z, `${path}.mean_z`),
    n: integer(item.n, `${path}.n`),
  }
}

function node(value: unknown, index: number, quantileCount: number): FeatureNode {
  const path = `features[${index}]`
  const item = record(value, path)
  const profile = record(item.genre_profile, `${path}.genre_profile`)
  const histogramShape = histogram(item.histogram, `${path}.histogram`)
  const genreHistogram = record(item.genre_histogram, `${path}.genre_histogram`)
  return {
    id: identifier(item.id, `${path}.id`),
    label: identifier(item.label, `${path}.label`),
    family: family(item.family, `${path}.family`),
    x: number(item.x, `${path}.x`),
    y: number(item.y, `${path}.y`),
    power: number(item.power, `${path}.power`),
    stats: stats(item.stats, `${path}.stats`),
    histogram: histogramShape,
    genre_profile: Object.fromEntries(
      Object.entries(profile).map(([genre, quantiles]) => {
        const values = numbers(quantiles, `${path}.genre_profile.${genre}`)
        if (values.length !== quantileCount) {
          return invalid(`${path}.genre_profile.${genre}`, `${quantileCount} quantiles`)
        }
        return [genre, values]
      }),
    ),
    genre_histogram: Object.fromEntries(
      Object.entries(genreHistogram).map(([genre, shares]) => {
        const values = numbers(shares, `${path}.genre_histogram.${genre}`)
        if (values.length !== histogramShape.counts.length) {
          return invalid(`${path}.genre_histogram.${genre}`, `${histogramShape.counts.length} bins`)
        }
        return [genre, values]
      }),
    ),
    tag_profile: array(item.tag_profile, `${path}.tag_profile`).map((entry, tagIndex) =>
      tagEntry(entry, `${path}.tag_profile[${tagIndex}]`),
    ),
  }
}

/** Validate unknown JSON at the wire boundary; keep the documented field names. */
export function validateFeatureGraph(input: unknown): FeatureGraph {
  const root = record(input, 'feature graph')
  const genreQuantiles = array(root.genre_quantiles, 'genre_quantiles').map((item, index) =>
    number(item, `genre_quantiles[${index}]`),
  )
  const features = array(root.features, 'features').map((item, index) =>
    node(item, index, genreQuantiles.length),
  )
  const ids = new Set(features.map((feature) => feature.id))
  if (ids.size !== features.length) return invalid('features', 'unique ids')
  const edges = array(root.edges, 'edges').map((value, index) => {
    const path = `edges[${index}]`
    const item = record(value, path)
    const edge = {
      source: identifier(item.source, `${path}.source`),
      target: identifier(item.target, `${path}.target`),
      r: number(item.r, `${path}.r`),
    }
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      return invalid(path, 'source and target that name existing features')
    }
    return edge
  })
  return {
    feature_set_id: identifier(root.feature_set_id, 'feature_set_id'),
    genre_quantiles: genreQuantiles,
    min_abs_correlation: number(root.min_abs_correlation, 'min_abs_correlation'),
    track_count: integer(root.track_count, 'track_count'),
    features,
    edges,
  }
}

/** Validate the scatter sample: every row has one value per feature. */
export function validateFeatureSample(input: unknown): FeatureSample {
  const root = record(input, 'feature sample')
  const features = array(root.features, 'features').map((item, index) =>
    identifier(item, `features[${index}]`),
  )
  const genres = array(root.genres, 'genres').map((item, index) =>
    item === null ? null : string(item, `genres[${index}]`),
  )
  const values = array(root.values, 'values').map((row, index) => {
    const numbersInRow = numbers(row, `values[${index}]`)
    if (numbersInRow.length !== features.length) {
      return invalid(`values[${index}]`, `${features.length} values`)
    }
    return numbersInRow
  })
  if (genres.length !== values.length) return invalid('genres', 'one entry per sampled track')
  return { feature_set_id: identifier(root.feature_set_id, 'feature_set_id'), features, genres, values }
}

export async function loadFeatureSample(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<FeatureSample> {
  const base = baseUrl.replace(/\/+$/, '')
  return validateFeatureSample(await fetchJson(`${base}/${FEATURE_SAMPLE_FILE}`, signal))
}

export async function loadFeatureGraph(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<FeatureGraph> {
  const base = baseUrl.replace(/\/+$/, '')
  return validateFeatureGraph(await fetchJson(`${base}/${FEATURE_GRAPH_FILE}`, signal))
}
