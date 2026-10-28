import { describe, expect, test } from 'vitest'
import { atlasInput } from '../data/testFixtures'
import { EMPTY_FILTERS, hasActiveFilters, setRangeBound, visibilityMask, visibleClusters, type Filters } from './filters'

const tracks = atlasInput().tracks
const mask = (filters: Partial<Filters>) => [...visibilityMask(tracks, { ...EMPTY_FILTERS, ...filters })]

describe('visibility mask', () => {
  test('shows everything without filters and keeps the data untouched', () => {
    const before = structuredClone(tracks)
    expect(mask({})).toEqual([1, 1, 1])
    expect(tracks).toEqual(before)
    expect(visibilityMask([], EMPTY_FILTERS)).toHaveLength(0)
  })

  test('combines search with tags that must all match, across categories and case', () => {
    expect(mask({ text: 'ada', tags: ['ROCK', 'guitar', 'bright'] })).toEqual([1, 0, 0])
    expect(mask({ text: 'ada', tags: ['piano'] })).toEqual([0, 0, 0])
    expect(mask({ tags: ['rock', 'jazz'] })).toEqual([0, 0, 0])
  })

  test('matches any selected tag when asked', () => {
    expect(mask({ tags: ['rock', 'jazz'], tagMatch: 'any' })).toEqual([1, 1, 0])
    expect(mask({ tags: ['rock', 'nothing'], tagMatch: 'any' })).toEqual([1, 0, 0])
  })

  test('limits by cluster scope and by chosen clusters, with OR inside the list', () => {
    expect(mask({ scope: 'clustered' })).toEqual([1, 1, 0])
    expect(mask({ scope: 'unclustered' })).toEqual([0, 0, 1])
    expect(mask({ clusterIds: [2] })).toEqual([0, 1, 0])
    expect(mask({ clusterIds: [1, 2] })).toEqual([1, 1, 0])
    expect(mask({ clusterIds: [1], scope: 'unclustered' })).toEqual([0, 0, 0])
  })

  test('chosen artists only hide the others when asked; otherwise nothing is hidden', () => {
    expect(mask({ artists: ['artist:ada'] })).toEqual([1, 1, 1])
    expect(mask({ artists: ['artist:ada'], hideOtherArtists: true })).toEqual([1, 0, 1])
    expect(mask({ artists: ['artist:ada', 'artist:trio'], hideOtherArtists: true })).toEqual([1, 1, 1])
    expect(mask({ hideOtherArtists: true })).toEqual([1, 1, 1])
  })

  test('hides tracks without an artist id when filtering by artist', () => {
    const anonymous = tracks.map((track) => ({ ...track, artist_id: undefined }))
    const result = visibilityMask(anonymous, { ...EMPTY_FILTERS, artists: ['artist:ada'], hideOtherArtists: true })
    expect([...result]).toEqual([0, 0, 0])
  })

  test('keeps tracks whose feature lies inside the range and hides those without the feature', () => {
    expect(mask({ range: { feature: 'energy', min: 0.5, max: 1 } })).toEqual([1, 0, 0])
    expect(mask({ range: { feature: 'energy', min: 0.9, max: 1 } })).toEqual([0, 0, 0])
    expect(mask({ range: { feature: 'energy', min: 0.8, max: 0.8 } })).toEqual([1, 0, 0])
  })

  test('applies every filter together (AND)', () => {
    expect(mask({ text: 'ada', scope: 'clustered', tags: ['rock'], artists: ['artist:ada'], hideOtherArtists: true })).toEqual([1, 0, 0])
    expect(mask({ text: 'trio', artists: ['artist:ada'], hideOtherArtists: true })).toEqual([0, 0, 0])
  })
})

describe('active filters and visible clusters', () => {
  test('reports whether Clear would change anything', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, text: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, tags: ['rock'] })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, artists: ['artist:ada'] })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, range: { feature: 'bpm', min: 1, max: 2 } })).toBe(true)
  })

  test('lists only clusters that still have a visible track', () => {
    expect([...visibleClusters(tracks, [1, 1, 1])].sort()).toEqual([1, 2])
    expect([...visibleClusters(tracks, [0, 1, 1])]).toEqual([2])
    expect(visibleClusters(tracks, [0, 0, 1]).size).toBe(0)
  })
})

describe('range bounds', () => {
  const extent = { min: 0, max: 10 }
  const range = { feature: 'bpm', min: 2, max: 8 }

  test('applies a valid bound', () => {
    expect(setRangeBound(range, 'min', '4', extent)).toEqual({ feature: 'bpm', min: 4, max: 8 })
    expect(setRangeBound(range, 'max', '6.5', extent)).toEqual({ feature: 'bpm', min: 2, max: 6.5 })
  })

  test('resets an empty or invalid bound to the extent', () => {
    expect(setRangeBound(range, 'min', '', extent).min).toBe(0)
    expect(setRangeBound(range, 'max', 'abc', extent).max).toBe(10)
  })

  test('keeps values inside the extent', () => {
    expect(setRangeBound(range, 'min', '-50', extent).min).toBe(0)
    expect(setRangeBound(range, 'max', '999', extent).max).toBe(10)
  })

  test('never lets the minimum exceed the maximum', () => {
    expect(setRangeBound(range, 'min', '9', extent)).toEqual({ feature: 'bpm', min: 9, max: 9 })
    expect(setRangeBound(range, 'max', '1', extent)).toEqual({ feature: 'bpm', min: 1, max: 1 })
  })
})
