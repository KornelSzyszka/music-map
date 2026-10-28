import type { AtlasManifest, AtlasQuality, AtlasSummary, Cluster, Neighbors, Track } from './types'

export interface Atlas {
  readonly manifest: AtlasManifest
  readonly tracks: readonly Track[]
  readonly clusters: readonly Cluster[]
  readonly neighbors: readonly Neighbors[]
}

export const ATLAS_FILES = {
  manifest: 'manifest.json',
  tracks: 'tracks.json.gz',
  clusters: 'clusters.json.gz',
  neighbors: 'neighbors.json.gz',
} as const

export function invalid(path: string, expected: string): never {
  throw new Error(`Invalid atlas: ${path}: expected ${expected}`)
}

export function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(path, 'an object')
  }
  return value as Record<string, unknown>
}

export function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return invalid(path, 'an array')
  return value
}

export function string(value: unknown, path: string): string {
  if (typeof value !== 'string') return invalid(path, 'a string')
  return value
}

export function identifier(value: unknown, path: string): string {
  const result = string(value, path)
  if (!result.trim()) return invalid(path, 'a non-empty string')
  return result
}

export function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalid(path, 'a finite number')
  }
  return value
}

export function integer(value: unknown, path: string, nonnegative = true): number {
  const result = number(value, path)
  if (!Number.isSafeInteger(result) || (nonnegative && result < 0)) {
    return invalid(path, nonnegative ? 'a non-negative safe integer' : 'a safe integer')
  }
  return result
}

export function strings(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => string(item, `${path}[${index}]`))
}

const SUPPORTED_SCHEMAS = ['0.1', '0.2', '0.3']

function summary(value: unknown): AtlasSummary {
  const data = record(value, 'manifest.summary')
  return {
    requested: integer(data.requested, 'manifest.summary.requested'),
    dropped_without_features: integer(data.dropped_without_features, 'manifest.summary.dropped_without_features'),
    clusters: integer(data.clusters, 'manifest.summary.clusters'),
    clustered_share: number(data.clustered_share, 'manifest.summary.clustered_share'),
  }
}

function quality(value: unknown): AtlasQuality {
  return Object.fromEntries(Object.entries(record(value, 'manifest.quality')).map(([method, byK]) => [
    method,
    Object.fromEntries(Object.entries(record(byK, `manifest.quality.${method}`)).map(([k, metrics]) => [
      k,
      Object.fromEntries(Object.entries(record(metrics, `manifest.quality.${method}.${k}`)).map(([metric, score]) => [
        metric, number(score, `manifest.quality.${method}.${k}.${metric}`),
      ])),
    ])),
  ]))
}

function manifest(value: unknown): AtlasManifest {
  const data = record(value, 'manifest')
  if (typeof data.schema_version !== 'string' || !SUPPORTED_SCHEMAS.includes(data.schema_version)) {
    return invalid('manifest.schema_version', `one of the supported versions ${SUPPORTED_SCHEMAS.join(', ')}`)
  }
  return {
    schema_version: data.schema_version,
    dataset_version: identifier(data.dataset_version, 'manifest.dataset_version'),
    projection_id: identifier(data.projection_id, 'manifest.projection_id'),
    feature_set_id: identifier(data.feature_set_id, 'manifest.feature_set_id'),
    track_count: integer(data.track_count, 'manifest.track_count'),
    seed: integer(data.seed, 'manifest.seed', false),
    ...(data.run === undefined ? {} : { run: string(data.run, 'manifest.run') }),
    ...(data.distance_metric === undefined ? {} : { distance_metric: string(data.distance_metric, 'manifest.distance_metric') }),
    ...(data.summary === undefined ? {} : { summary: summary(data.summary) }),
    ...(data.quality === undefined ? {} : { quality: quality(data.quality) }),
  }
}

function track(value: unknown, index: number): Track {
  const path = `tracks[${index}]`
  const data = record(value, path)
  const features = record(data.features, `${path}.features`)
  return {
    id: identifier(data.id, `${path}.id`),
    title: string(data.title, `${path}.title`),
    artist: string(data.artist, `${path}.artist`),
    ...(data.artist_id === undefined || data.artist_id === null
      ? {}
      : { artist_id: identifier(data.artist_id, `${path}.artist_id`) }),
    x: number(data.x, `${path}.x`),
    y: number(data.y, `${path}.y`),
    cluster_id: data.cluster_id === null ? null : integer(data.cluster_id, `${path}.cluster_id`),
    genres: strings(data.genres, `${path}.genres`),
    instruments: strings(data.instruments, `${path}.instruments`),
    moods: strings(data.moods, `${path}.moods`),
    features: Object.fromEntries(Object.entries(features).map(([key, value]) => [
      key, number(value, `${path}.features.${key}`),
    ])),
    source_url: data.source_url === null ? null : string(data.source_url, `${path}.source_url`),
  }
}

function cluster(value: unknown, index: number): Cluster {
  const path = `clusters[${index}]`
  const data = record(value, path)
  return {
    id: integer(data.id, `${path}.id`),
    label: string(data.label, `${path}.label`),
    size: integer(data.size, `${path}.size`),
    x: number(data.x, `${path}.x`),
    y: number(data.y, `${path}.y`),
    top_tags: strings(data.top_tags, `${path}.top_tags`),
  }
}

function neighbors(value: unknown, index: number): Neighbors {
  const path = `neighbors[${index}]`
  const data = record(value, path)
  return {
    track_id: identifier(data.track_id, `${path}.track_id`),
    neighbors: array(data.neighbors, `${path}.neighbors`).map((item, neighborIndex) => {
      const neighborPath = `${path}.neighbors[${neighborIndex}]`
      const neighbor = record(item, neighborPath)
      const distance = number(neighbor.distance, `${neighborPath}.distance`)
      if (distance < 0) return invalid(`${neighborPath}.distance`, 'a non-negative distance')
      return { id: identifier(neighbor.id, `${neighborPath}.id`), distance }
    }),
  }
}

function unique<T>(items: readonly T[], key: (item: T) => string | number, path: string): void {
  const seen = new Set<string | number>()
  for (const item of items) {
    const id = key(item)
    if (seen.has(id)) invalid(path, `unique ids; duplicate "${id}"`)
    seen.add(id)
  }
}

/** Validate unknown JSON at the wire boundary; keep the documented field names. */
export function validateAtlas(input: {
  manifest: unknown
  tracks: unknown
  clusters: unknown
  neighbors: unknown
}): Atlas {
  const atlas: Atlas = {
    manifest: manifest(input.manifest),
    tracks: array(input.tracks, 'tracks').map(track),
    clusters: array(input.clusters, 'clusters').map(cluster),
    neighbors: array(input.neighbors, 'neighbors').map(neighbors),
  }
  if (atlas.manifest.track_count !== atlas.tracks.length) {
    invalid('manifest.track_count', `${atlas.tracks.length} (the number of tracks)`)
  }
  unique(atlas.tracks, (item) => item.id, 'tracks.id')
  unique(atlas.clusters, (item) => item.id, 'clusters.id')
  unique(atlas.neighbors, (item) => item.track_id, 'neighbors.track_id')
  const trackIds = new Set(atlas.tracks.map((item) => item.id))
  const clusterIds = new Set(atlas.clusters.map((item) => item.id))
  const clusterSizes = new Map<number, number>()
  for (const item of atlas.tracks) {
    if (item.cluster_id === null) continue
    if (!clusterIds.has(item.cluster_id)) invalid(`track "${item.id}".cluster_id`, 'an existing cluster id')
    clusterSizes.set(item.cluster_id, (clusterSizes.get(item.cluster_id) ?? 0) + 1)
  }
  for (const item of atlas.clusters) {
    const size = clusterSizes.get(item.id) ?? 0
    if (item.size !== size) invalid(`cluster ${item.id}.size`, `${size} (its actual membership)`)
  }
  for (const item of atlas.neighbors) {
    if (!trackIds.has(item.track_id)) invalid(`neighbors.track_id "${item.track_id}"`, 'an existing track id')
    unique(item.neighbors, (neighbor) => neighbor.id, `neighbors for "${item.track_id}"`)
    for (const neighbor of item.neighbors) {
      if (!trackIds.has(neighbor.id) || neighbor.id === item.track_id) {
        invalid(`neighbors for "${item.track_id}".id "${neighbor.id}"`, 'an existing, different track id')
      }
    }
  }
  if (atlas.neighbors.length !== atlas.tracks.length) {
    invalid('neighbors', 'one neighbor record per track (empty lists are allowed)')
  }
  return atlas
}

export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    // Static servers may serve .gz without Content-Encoding; fetch only decodes with that header.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      return await new Response(stream).json()
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(`Could not load atlas file ${url}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

export async function loadAtlas(baseUrl: string, signal?: AbortSignal): Promise<Atlas> {
  const base = baseUrl.replace(/\/+$/, '')
  const [manifest, tracks, clusters, neighbors] = await Promise.all(
    Object.values(ATLAS_FILES).map((file) => fetchJson(`${base}/${file}`, signal)),
  )
  return validateAtlas({ manifest, tracks, clusters, neighbors })
}
