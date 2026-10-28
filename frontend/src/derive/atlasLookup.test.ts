import { describe, expect, it } from 'vitest'
import type { Atlas } from '../data/loader'
import { buildLookup, neighboursOfTrack } from './atlasLookup'

const track = (id: string, cluster: number | null = null) => ({
  id, title: id, artist: 'A', x: 0, y: 0, cluster_id: cluster, genres: [], instruments: [], moods: [],
  features: {}, source_url: null,
})

const atlas: Atlas = {
  manifest: { schema_version: '0.2', dataset_version: 'v', projection_id: 'p', feature_set_id: 'f', track_count: 3, seed: 1 },
  tracks: [track('a', 1), track('b', 1), track('c')],
  clusters: [{ id: 1, label: 'rock / guitar', size: 2, x: 0, y: 0, top_tags: ['rock'] }],
  neighbors: [{ track_id: 'a', neighbors: [{ id: 'b', distance: 0.1 }, { id: 'c', distance: 0.4 }, { id: 'zzz', distance: 0.9 }] }],
}

describe('atlas lookup', () => {
  const lookup = buildLookup(atlas)

  it('indexes tracks and clusters by id', () => {
    expect(lookup.tracks.get('b')?.id).toBe('b')
    expect(lookup.clusters.get(1)?.label).toBe('rock / guitar')
  })

  it('returns neighbours in the exported order with their distances', () => {
    const rows = neighboursOfTrack(lookup, 'a', 10)
    expect(rows.map((row) => [row.track.id, row.distance])).toEqual([['b', 0.1], ['c', 0.4]])
  })

  it('respects the limit and skips neighbours that are not in the atlas', () => {
    expect(neighboursOfTrack(lookup, 'a', 1)).toHaveLength(1)
  })

  it('gives no neighbours for an unknown or neighbourless track', () => {
    expect(neighboursOfTrack(lookup, 'b', 5)).toEqual([])
    expect(neighboursOfTrack(lookup, 'nope', 5)).toEqual([])
  })
})
