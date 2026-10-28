import type { Atlas } from '../data/loader'
import type { Cluster, Neighbors, Track } from '../data/types'

export interface AtlasLookup {
  readonly tracks: ReadonlyMap<string, Track>
  readonly clusters: ReadonlyMap<number, Cluster>
  readonly neighbours: ReadonlyMap<string, Neighbors['neighbors']>
}

export interface NeighbourRow {
  readonly track: Track
  readonly distance: number
}

/** Index the atlas once so that selection and detail views stay O(1) per lookup. */
export function buildLookup(atlas: Atlas): AtlasLookup {
  return {
    tracks: new Map(atlas.tracks.map((track) => [track.id, track])),
    clusters: new Map(atlas.clusters.map((cluster) => [cluster.id, cluster])),
    neighbours: new Map(atlas.neighbors.map((entry) => [entry.track_id, entry.neighbors])),
  }
}

/** Nearest musical neighbours from the exported feature-space data, never from map distance. */
export function neighboursOfTrack(
  lookup: AtlasLookup,
  id: string,
  limit: number,
  isVisible: (trackId: string) => boolean = () => true,
): NeighbourRow[] {
  const rows: NeighbourRow[] = []
  for (const entry of lookup.neighbours.get(id) ?? []) {
    const track = lookup.tracks.get(entry.id)
    if (track && isVisible(track.id)) rows.push({ track, distance: entry.distance })
    if (rows.length >= limit) break
  }
  return rows
}
