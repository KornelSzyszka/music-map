/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { expect, test } from 'vitest'
import { ATLAS_FILES, validateAtlas } from './loader'

test('the shipped 2000-point fixture satisfies the contract and uses feature-space neighbors', () => {
  const input = Object.fromEntries(Object.entries(ATLAS_FILES).map(([key, file]) => {
    const bytes = readFileSync(new URL(`../../public/fixtures/${file}`, import.meta.url))
    const json = file.endsWith('.gz') ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8')
    return [key, JSON.parse(json) as unknown]
  }))
  const atlas = validateAtlas({ manifest: input.manifest, tracks: input.tracks,
    clusters: input.clusters, neighbors: input.neighbors })
  expect(atlas.manifest.track_count).toBe(2000)
  expect(atlas.manifest.seed).toBe(42)
  expect(atlas.manifest.dataset_version).toBe('synthetic-2000-v1')
  expect(atlas.clusters).toHaveLength(5)
  expect(atlas.tracks.some((track) => track.cluster_id === null)).toBe(true)
  expect(new Set(atlas.tracks.flatMap((track) => track.genres)).size).toBe(5)

  const keys = ['bpm', 'energy']
  const means = keys.map((key) => atlas.tracks.reduce((sum, track) => sum + track.features[key], 0) / atlas.tracks.length)
  const scales = keys.map((key, index) => Math.sqrt(atlas.tracks.reduce((sum, track) =>
    sum + (track.features[key] - means[index]) ** 2, 0) / atlas.tracks.length))
  const features = atlas.tracks.map((track) => keys.map((key, index) => (track.features[key] - means[index]) / scales[index]))
  const indexById = new Map(atlas.tracks.map((track, index) => [track.id, index]))
  atlas.neighbors.forEach((record) => {
    expect(record.neighbors).toHaveLength(5)
    const sourceIndex = indexById.get(record.track_id)
    if (sourceIndex === undefined) throw new Error(`Unknown fixture track ${record.track_id}`)
    record.neighbors.forEach((neighbor) => {
      const targetIndex = indexById.get(neighbor.id)
      if (targetIndex === undefined) throw new Error(`Unknown fixture neighbor ${neighbor.id}`)
      const distance = Math.hypot(features[sourceIndex][0] - features[targetIndex][0],
        features[sourceIndex][1] - features[targetIndex][1])
      expect(neighbor.distance).toBeCloseTo(distance, 5)
    })
  })
  for (const sourceIndex of [0, 999, 1999]) {
    const distances = features.map((feature, index) => ({ index,
      distance: Math.hypot(feature[0] - features[sourceIndex][0], feature[1] - features[sourceIndex][1]) }))
      .filter(({ index }) => index !== sourceIndex)
      .sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, 5)
    expect(atlas.neighbors[sourceIndex].neighbors.map((neighbor) => neighbor.id))
      .toEqual(distances.map(({ index }) => atlas.tracks[index].id))
  }
})
