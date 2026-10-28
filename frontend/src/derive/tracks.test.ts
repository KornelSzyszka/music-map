import { describe, expect, test } from 'vitest'
import { atlasInput } from '../data/testFixtures'
import { nearestPoint, searchMask, trackTags } from './tracks'

describe('search', () => {
  test.each([
    ['', [1, 1, 1]], ['   ', [1, 1, 1]], ['SKY', [1, 1, 0]],
    [' ada BRIGHT ', [1, 0, 0]], ['evening trio', [0, 1, 0]], ['rock', [0, 0, 0]],
    ['unknown', [0, 0, 0]],
  ])('matches title and artist for %s', (text, expected) => {
    expect([...searchMask(atlasInput().tracks, text)]).toEqual(expected)
  })
})

describe('tags', () => {
  test('lists genres, instruments and moods together', () => {
    expect(trackTags(atlasInput().tracks[0])).toEqual(['rock', 'guitar', 'bright'])
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
