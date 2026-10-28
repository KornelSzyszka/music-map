import { describe, expect, test } from 'vitest'
import type { Cluster, Track } from '../data/types'
import {
  BASE,
  coloredClusters,
  colourScheme,
  featureDomain,
  GREY,
  MAX_ARTIST_COLOURS,
  SEQUENTIAL_BASE,
  SEQUENTIAL_STEPS,
  SERIES_SLOTS,
  type ColourInput,
} from './colouring'

const track = (id: number, extra: Partial<Track> = {}): Track => ({
  id: `t:${id}`, title: `T${id}`, artist: `Artist ${id}`, artist_id: `a:${id}`, x: id, y: id, cluster_id: null,
  genres: [], instruments: [], moods: [], features: {}, source_url: null, ...extra,
})
const cluster = (id: number, size: number): Cluster => ({ id, label: `cluster ${id}`, size, x: 0, y: 0, top_tags: [] })

const base = (tracks: Track[], clusters: Cluster[] = []): ColourInput => ({
  tracks, clusters, mode: 'none', feature: null, artists: [],
})

describe('colour modes', () => {
  test('None gives every track the same base colour and no legend', () => {
    const { slots, legend } = colourScheme(base([track(1), track(2)]))
    expect([...slots]).toEqual([BASE, BASE])
    expect(legend).toEqual({ kind: 'none' })
  })

  test('Cluster colours only the largest clusters, in a fixed order, and greys the rest', () => {
    const clusters = Array.from({ length: 10 }, (_, i) => cluster(i + 1, 100 - i))
    const tracks = [track(1, { cluster_id: 1 }), track(2, { cluster_id: 7 }), track(3, { cluster_id: 8 }), track(4, { cluster_id: null })]
    const { slots, legend } = colourScheme({ ...base(tracks, clusters), mode: 'cluster' })
    expect([...slots]).toEqual([0, 6, GREY, GREY])
    expect(legend.kind === 'categories' && legend.entries).toHaveLength(SERIES_SLOTS)
    expect(coloredClusters(clusters).map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('cluster colours do not depend on track order, filters or ties in size', () => {
    const clusters = [cluster(5, 10), cluster(3, 10), cluster(9, 50)]
    expect(coloredClusters(clusters).map((c) => c.id)).toEqual([9, 3, 5])
    const tracks = [track(1, { cluster_id: 9 }), track(2, { cluster_id: 3 })]
    const forward = colourScheme({ ...base(tracks, clusters), mode: 'cluster' }).slots
    const reverse = colourScheme({ ...base([...tracks].reverse(), clusters), mode: 'cluster' }).slots
    expect([...forward]).toEqual([...reverse].reverse())
  })

  test('Feature maps values to sequential steps over the whole data set and greys missing values', () => {
    const tracks = [
      ...Array.from({ length: 200 }, (_, i) => track(i, { features: { bpm: i } })),
      track(500),
    ]
    const { slots, legend } = colourScheme({ ...base(tracks), mode: 'feature', feature: 'bpm' })
    expect(slots[0]).toBe(SEQUENTIAL_BASE)
    expect(slots[199]).toBe(SEQUENTIAL_BASE + SEQUENTIAL_STEPS - 1)
    expect(slots[100]).toBeGreaterThan(slots[50])
    expect(slots[200]).toBe(GREY)
    expect(legend.kind).toBe('scale')
  })

  test('Feature falls back to the base colour without a feature or a usable range', () => {
    expect(colourScheme({ ...base([track(1)]), mode: 'feature', feature: null }).legend.kind).toBe('none')
    expect(colourScheme({ ...base([track(1, { features: { bpm: 5 } })]), mode: 'feature', feature: 'bpm' }).legend.kind).toBe('none')
  })

  test('Artist highlights at most three chosen artists and greys everything else', () => {
    const tracks = [track(1, { artist_id: 'a' }), track(2, { artist_id: 'b' }), track(3, { artist_id: 'a' }), track(4, { artist_id: 'z' }), track(5, { artist_id: 'q' })]
    const { slots, legend } = colourScheme({ ...base(tracks), mode: 'artist', artists: ['a', 'b', 'z', 'q'] })
    expect([...slots]).toEqual([0, 1, 0, 2, GREY])
    expect(legend.kind === 'categories' && legend.entries.map((e) => [e.slot, e.count])).toEqual([[0, 2], [1, 1], [2, 1]])
    expect(MAX_ARTIST_COLOURS).toBe(3)
  })

  test('Artist without a chosen artist leaves every track in the base colour', () => {
    const { slots, legend } = colourScheme({ ...base([track(1)]), mode: 'artist', artists: [] })
    expect([...slots]).toEqual([BASE])
    expect(legend.kind).toBe('none')
  })
})

describe('feature domain', () => {
  test('clips outliers so that one extreme value does not flatten the scale', () => {
    const tracks = [...Array.from({ length: 300 }, (_, i) => track(i, { features: { x: i } })), track(900, { features: { x: 1e9 } })]
    const domain = featureDomain(tracks, 'x')
    expect(domain?.max).toBeLessThan(400)
    expect(featureDomain(tracks, 'missing')).toBeNull()
  })
})
