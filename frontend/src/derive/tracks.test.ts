import { describe, expect, test } from 'vitest'
import { atlasInput } from '../data/testFixtures'
import { nearestPoint, NEUTRAL_COLOUR, searchMask, trackColours, visibilityMask } from './tracks'

describe('search', () => {
  test.each([
    ['', [1, 1, 1]], ['   ', [1, 1, 1]], ['SKY', [1, 1, 0]],
    [' ada BRIGHT ', [1, 0, 0]], ['evening trio', [0, 1, 0]], ['rock', [0, 0, 0]],
    ['unknown', [0, 0, 0]],
  ])('matches title and artist for %s', (text, expected) => {
    expect([...searchMask(atlasInput().tracks, text)]).toEqual(expected)
  })
})

describe('visibility', () => {
  test('combines search with all selected tags across categories', () => {
    const tracks = atlasInput().tracks
    expect([...visibilityMask(tracks, { text: 'ada', tags: ['ROCK', 'guitar', 'bright'] })]).toEqual([1, 0, 0])
    expect([...visibilityMask(tracks, { text: 'ada', tags: ['piano'] })]).toEqual([0, 0, 0])
    expect([...visibilityMask(tracks, { text: '', tags: ['rock', 'jazz'] })]).toEqual([0, 0, 0])
  })

  test('preserves order, identity and coordinates across filtering and clearing', () => {
    const tracks = atlasInput().tracks
    const before = structuredClone(tracks)
    for (const track of tracks) Object.freeze(track)
    Object.freeze(tracks)
    visibilityMask(tracks, { text: 'sky', tags: ['jazz'] })
    expect([...visibilityMask(tracks, { text: '', tags: [] })]).toEqual([1, 1, 1])
    expect(tracks).toEqual(before)
    expect(visibilityMask([], { text: '', tags: [] })).toHaveLength(0)
  })
})

describe('colour', () => {
  test('gives each cluster a stable colour independent of order and handles noise', () => {
    const tracks = atlasInput().tracks
    const colours = trackColours(tracks, 'cluster')
    expect(colours[0]).not.toBe(colours[1])
    expect(colours[2]).toBe(NEUTRAL_COLOUR)
    expect(trackColours([...tracks].reverse(), 'cluster')).toEqual([...colours].reverse())
    expect(trackColours([{ ...tracks[1], cluster_id: 1 }], 'cluster')[0]).toBe(colours[0])
  })

  test('uses the alphabetically first normalised tag, independently of category ordering', () => {
    const track = atlasInput().tracks[0]
    const first = { ...track, genres: ['ROCK', 'ambient'], instruments: ['Guitar'], moods: [] }
    const second = { ...track, genres: ['guitar'], instruments: ['ambient', 'rock'], moods: [] }
    expect(trackColours([first], 'tag')).toEqual(trackColours([second], 'tag'))
    expect(trackColours([{ ...track, genres: [], instruments: [], moods: [] }], 'tag')).toEqual([NEUTRAL_COLOUR])
  })
})

describe('map picking', () => {
  test('finds the nearest visible point within a radius, without using feature-space neighbors', () => {
    const tracks = atlasInput().tracks
    expect(nearestPoint(tracks, { x: 0, y: 1 })?.id).toBe('test:1')
    expect(nearestPoint(tracks, { x: 0, y: 1 }, [0, 1, 1])?.id).toBe('test:2')
    expect(nearestPoint(tracks, { x: 0, y: 1 }, undefined, 0.5)).toBeNull()
    expect(nearestPoint(tracks, { x: 0, y: 1 }, [0, 0, 0])).toBeNull()
    expect(nearestPoint([], { x: 0, y: 0 })).toBeNull()
    expect(nearestPoint(tracks, { x: 0, y: 0 }, undefined, 0)?.id).toBe('test:1')
  })

  test('breaks equal distances in original track order', () => {
    expect(nearestPoint(atlasInput().tracks, { x: 2, y: 1.5 })?.id).toBe('test:1')
  })

  test('rejects invalid picking inputs', () => {
    const tracks = atlasInput().tracks
    expect(() => nearestPoint(tracks, { x: NaN, y: 0 })).toThrow('finite coordinates')
    expect(() => nearestPoint(tracks, { x: 0, y: 0 }, undefined, -1)).toThrow('non-negative')
    expect(() => nearestPoint(tracks, { x: 0, y: 0 }, [1])).toThrow('length')
  })
})
