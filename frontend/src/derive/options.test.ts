import { describe, expect, test } from 'vitest'
import { atlasInput } from '../data/testFixtures'
import { artistOptions, clusterOptions, featureExtent, featureKeys, featureLabel, tagOptions, uniqueLabels } from './options'

const { tracks, clusters } = atlasInput()

describe('option lists', () => {
  test('lists artists once with their track count, alphabetically', () => {
    expect(artistOptions(tracks)).toEqual([
      { value: 'artist:ada', label: 'Ada (2)' },
      { value: 'artist:trio', label: 'Sky Trio (1)' },
    ])
  })

  test('skips tracks that have no artist id', () => {
    expect(artistOptions(tracks.map((track) => ({ ...track, artist_id: undefined })))).toEqual([])
  })

  test('lists clusters biggest first with the size, keeping equal labels apart', () => {
    const options = clusterOptions([{ ...clusters[0], size: 5 }, { ...clusters[0], id: 9, size: 7 }])
    expect(options.map((option) => option.value)).toEqual(['9', '1'])
    expect(options[0].label).toBe('Rock · 7')
  })

  test('collects tags and feature keys in a stable order and labels known features', () => {
    expect(tagOptions(tracks)).toEqual(['bright', 'calm', 'guitar', 'jazz', 'piano', 'rock'])
    expect(featureKeys(tracks)).toEqual(['energy'])
    expect(featureLabel('bpm')).toBe('BPM')
    expect(featureLabel('energy')).toBe('energy')
  })
})

describe('feature extent', () => {
  test('spans every value of the feature and is null when nothing has it', () => {
    const withValues = tracks.map((track, index) => ({ ...track, features: { bpm: 100 + index * 10 } }))
    expect(featureExtent(withValues, 'bpm')).toEqual({ min: 100, max: 120 })
    expect(featureExtent(tracks, 'bpm')).toBeNull()
  })
})

describe('unique labels', () => {
  test('keeps every label distinct so that picking by label is unambiguous', () => {
    const clashing = clusterOptions([
      { id: 1, label: 'Rock', size: 5, x: 0, y: 0, top_tags: [] },
      { id: 2, label: 'Rock', size: 5, x: 0, y: 0, top_tags: [] },
    ])
    expect(new Set(clashing.map((option) => option.label)).size).toBe(2)
    expect(clashing.map((option) => option.value)).toEqual(['1', '2'])
  })

  test('keeps artists with the same name and track count apart', () => {
    const twins = tracks.flatMap((track) => [
      { ...track, id: `${track.id}:a`, artist: 'Same', artist_id: 'artist:one' },
      { ...track, id: `${track.id}:b`, artist: 'Same', artist_id: 'artist:two' },
    ])
    const labels = artistOptions(twins).map((option) => option.label)
    expect(new Set(labels).size).toBe(2)
  })

  test('leaves already distinct labels untouched', () => {
    const options = [{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }]
    expect(uniqueLabels(options)).toEqual(options)
  })
})
