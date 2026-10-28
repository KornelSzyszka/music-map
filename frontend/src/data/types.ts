/** Wire format of the atlas export. Keep in sync with docs/architecture.md. */
/** Counts recorded by the pipeline (schema 0.2). */
export interface AtlasSummary {
  requested: number
  dropped_without_features: number
  clusters: number
  clustered_share: number
}

/** Neighbourhood preservation: method -> k -> metric -> value in [0, 1]. */
export type AtlasQuality = Record<string, Record<string, Record<string, number>>>

export interface AtlasManifest {
  schema_version: string
  dataset_version: string
  projection_id: string
  feature_set_id: string
  track_count: number
  seed: number
  /** Schema 0.2 and later. */
  run?: string
  distance_metric?: string
  summary?: AtlasSummary
  quality?: AtlasQuality
}

export interface Track {
  id: string
  title: string
  artist: string
  /** Schema 0.3 and later. */
  artist_id?: string | null
  x: number
  y: number
  cluster_id: number | null
  genres: string[]
  instruments: string[]
  moods: string[]
  features: Record<string, number>
  source_url: string | null
}

export interface Cluster {
  id: number
  label: string
  size: number
  x: number
  y: number
  top_tags: string[]
}

export interface Neighbors {
  track_id: string
  neighbors: Array<{ id: string; distance: number }>
}

// TODO: confirm optional fields once the feature set is chosen (docs/architecture.md, open questions).
