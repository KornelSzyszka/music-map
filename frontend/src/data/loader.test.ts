/// <reference types="node" />
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ATLAS_FILES, loadAtlas, validateAtlas } from './loader'
import { atlasInput } from './testFixtures'

afterEach(() => vi.unstubAllGlobals())

test('accepts the documented contract, including noise and empty feature or neighbor lists', () => {
  const input = atlasInput()
  expect(validateAtlas(input)).toEqual(input)
})

describe('runtime validation', () => {
  test.each([
    ['schema version', { schema_version: '99' }, 'manifest.schema_version'],
    ['track count', { track_count: 2 }, 'manifest.track_count'],
    ['fractional track count', { track_count: 3.5 }, 'manifest.track_count'],
    ['missing dataset version', { dataset_version: undefined }, 'manifest.dataset_version'],
    ['non-numeric seed', { seed: '42' }, 'manifest.seed'],
  ])('rejects an invalid %s', (_, patch, message) => {
    const input = atlasInput()
    expect(() => validateAtlas({ ...input, manifest: { ...input.manifest, ...patch } })).toThrow(message)
  })

  test.each([
    ['missing title', { title: undefined }, 'tracks[0].title'],
    ['empty id', { id: '  ' }, 'tracks[0].id'],
    ['non-finite position', { x: Infinity }, 'tracks[0].x'],
    ['non-numeric position', { y: '3' }, 'tracks[0].y'],
    ['negative cluster id', { cluster_id: -1 }, 'tracks[0].cluster_id'],
    ['invalid tags', { genres: ['rock', 4] }, 'tracks[0].genres[1]'],
    ['missing tags', { moods: undefined }, 'tracks[0].moods'],
    ['invalid features', { features: { bpm: NaN } }, 'tracks[0].features.bpm'],
    ['invalid feature shape', { features: [] }, 'tracks[0].features'],
    ['invalid source', { source_url: 3 }, 'tracks[0].source_url'],
  ])('rejects a track with %s', (_, patch, message) => {
    const input = atlasInput()
    expect(() => validateAtlas({ ...input, tracks: [{ ...input.tracks[0], ...patch }, ...input.tracks.slice(1)] })).toThrow(message)
  })

  test.each(['tracks', 'clusters', 'neighbors'] as const)('rejects non-array %s', (key) => {
    expect(() => validateAtlas({ ...atlasInput(), [key]: null })).toThrow(key)
  })

  test('rejects duplicate track ids', () => {
    const input = atlasInput()
    input.tracks[1].id = input.tracks[0].id
    expect(() => validateAtlas(input)).toThrow('duplicate "test:1"')
  })

  test('rejects duplicate clusters and inconsistent cluster membership', () => {
    const input = atlasInput()
    input.clusters.push({ ...input.clusters[0] })
    expect(() => validateAtlas(input)).toThrow('clusters.id')
    input.clusters.pop()
    input.clusters[0].size = 2
    expect(() => validateAtlas(input)).toThrow('cluster 1.size')
  })

  test('rejects a missing cluster reference', () => {
    const input = atlasInput()
    input.tracks[0].cluster_id = 100
    expect(() => validateAtlas(input)).toThrow('an existing cluster id')
  })

  test.each([
    ['unknown source', 'missing', [{ id: 'test:3', distance: 0.1 }], 'existing track id'],
    ['unknown target', 'test:1', [{ id: 'missing', distance: 0.1 }], 'existing, different track id'],
    ['self neighbor', 'test:1', [{ id: 'test:1', distance: 0 }], 'existing, different track id'],
    ['negative distance', 'test:1', [{ id: 'test:3', distance: -1 }], 'non-negative distance'],
    ['non-finite distance', 'test:1', [{ id: 'test:3', distance: Infinity }], 'finite number'],
    ['repeated target', 'test:1', [{ id: 'test:3', distance: 0.1 }, { id: 'test:3', distance: 0.2 }], 'unique ids'],
  ])('rejects %s in neighbors', (_, track_id, neighbors, message) => {
    const input = atlasInput()
    input.neighbors[0] = { track_id, neighbors }
    expect(() => validateAtlas(input)).toThrow(message)
  })

  test('rejects missing and duplicate neighbor records', () => {
    const input = atlasInput()
    input.neighbors.pop()
    expect(() => validateAtlas(input)).toThrow('one neighbor record per track')
    input.neighbors.push(input.neighbors[0])
    expect(() => validateAtlas(input)).toThrow('neighbors.track_id')
  })

  test('accepts an empty atlas', () => {
    const input = atlasInput()
    expect(validateAtlas({ manifest: { ...input.manifest, track_count: 0 }, tracks: [], clusters: [], neighbors: [] }).tracks).toEqual([])
  })
})

test.each([false, true])('loads all four files under a base URL; raw gzip = %s', async (compress) => {
  const input = atlasInput()
  const fetchMock = vi.fn(async (url: string) => {
    const key = (Object.keys(ATLAS_FILES) as Array<keyof typeof ATLAS_FILES>)
      .find((key) => url.endsWith(ATLAS_FILES[key]))
    if (!key) return new Response(null, { status: 404 })
    const json = JSON.stringify(input[key])
    const body = compress && key !== 'manifest' ? new Uint8Array(gzipSync(json)) : json
    return new Response(body)
  })
  vi.stubGlobal('fetch', fetchMock)
  const controller = new AbortController()
  expect(await loadAtlas('/atlas/demo/', controller.signal)).toEqual(input)
  expect(fetchMock).toHaveBeenCalledTimes(4)
  for (const file of Object.values(ATLAS_FILES)) {
    expect(fetchMock).toHaveBeenCalledWith(`/atlas/demo/${file}`, { signal: controller.signal })
  }
})

test('names the failed file and HTTP status', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
  await expect(loadAtlas('/missing')).rejects.toThrow('Could not load atlas file /missing/manifest.json: HTTP 404')
})

test('names the file when JSON is malformed', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Not JSON</html>')))
  await expect(loadAtlas('/broken')).rejects.toThrow('Could not load atlas file /broken/manifest.json:')
})

test('preserves cancellation', async () => {
  const controller = new AbortController()
  controller.abort()
  vi.stubGlobal('fetch', vi.fn(async () => { throw controller.signal.reason }))
  await expect(loadAtlas('/atlas', controller.signal)).rejects.toBe(controller.signal.reason)
})

test('accepts schema 0.4 with the home cluster of a track', () => {
  const input = atlasInput()
  input.manifest = { ...input.manifest, schema_version: '0.4' }
  const atlas = validateAtlas(input)
  expect(atlas.tracks[2].home_cluster_id).toBe(1)
  expect(atlas.tracks[0].home_cluster_id).toBeUndefined()
})

describe('alternate layout fields', () => {
  test('accepts a second position on tracks and clusters', () => {
    const input = atlasInput()
    input.manifest.schema_version = '0.5'
    input.tracks[0] = { ...input.tracks[0], alt_x: 1, alt_y: 2 }
    expect(validateAtlas(input).tracks[0]).toMatchObject({ alt_x: 1, alt_y: 2 })
  })

  test('rejects a half-written position pair', () => {
    const input = atlasInput()
    input.tracks[0] = { ...input.tracks[0], alt_x: 1 }
    expect(() => validateAtlas(input)).toThrow('tracks[0].alt_y')
  })
})
