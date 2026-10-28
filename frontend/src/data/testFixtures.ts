import type { AtlasManifest, Cluster, Neighbors, Track } from './types'

/** Small independent records for offline behaviour tests. */
export function atlasInput(): {
  manifest: AtlasManifest
  tracks: Track[]
  clusters: Cluster[]
  neighbors: Neighbors[]
} {
  return {
    manifest: { schema_version: '0.1', dataset_version: 'test-v1', projection_id: 'test-map',
      feature_set_id: 'test-features', track_count: 3, seed: 42 },
    tracks: [
      { id: 'test:1', title: 'Bright Sky', artist: 'Ada', artist_id: 'artist:ada', x: 0, y: 0, cluster_id: 1,
        genres: ['rock'], instruments: ['guitar'], moods: ['bright'], features: { energy: 0.8 }, source_url: null },
      { id: 'test:2', title: 'Evening', artist: 'Sky Trio', artist_id: 'artist:trio', x: 4, y: 3, cluster_id: 2,
        genres: ['jazz'], instruments: ['piano'], moods: ['calm'], features: {}, source_url: 'https://example.org/track' },
      { id: 'test:3', title: 'Silence', artist: 'Ada', artist_id: 'artist:ada', x: 10, y: 10, cluster_id: null,
        genres: [], instruments: [], moods: [], features: {}, source_url: null },
    ],
    clusters: [
      { id: 1, label: 'Rock', size: 1, x: 0, y: 0, top_tags: ['rock'] },
      { id: 2, label: 'Jazz', size: 1, x: 4, y: 3, top_tags: ['jazz'] },
    ],
    neighbors: [
      { track_id: 'test:1', neighbors: [{ id: 'test:3', distance: 0.1 }] },
      { track_id: 'test:2', neighbors: [] },
      { track_id: 'test:3', neighbors: [{ id: 'test:1', distance: 0.1 }] },
    ],
  }
}
