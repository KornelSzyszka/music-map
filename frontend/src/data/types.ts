/** Wire format of the atlas export. Keep in sync with docs/architecture.md. */
export interface AtlasManifest {
  schema_version: string
  dataset_version: string
  projection_id: string
  feature_set_id: string
  track_count: number
  seed: number
}

export interface Track {
  id: string
  title: string
  artist: string
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
