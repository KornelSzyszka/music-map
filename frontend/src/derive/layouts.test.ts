import { describe, expect, test } from 'vitest'
import { validateAtlas } from '../data/loader'
import { atlasInput } from '../data/testFixtures'
import { hasAlternateLayout, layoutLabel, withLayout } from './layouts'

function withAlternate() {
  const input = atlasInput()
  return validateAtlas({
    ...input,
    tracks: input.tracks.map((track, index) => ({ ...track, alt_x: 100 + index, alt_y: 200 + index })),
    clusters: input.clusters.map((item, index) => ({ ...item, alt_x: 300 + index, alt_y: 400 + index })),
  })
}

describe('alternate layout', () => {
  test('is absent from a plain export', () => {
    expect(hasAlternateLayout(validateAtlas(atlasInput()))).toBe(false)
  })

  test('needs a second position on every track and every cluster', () => {
    const atlas = withAlternate()
    expect(hasAlternateLayout(atlas)).toBe(true)
    const partial = { ...atlas, clusters: atlas.clusters.map(({ alt_x, alt_y, ...rest }) => (void alt_x, void alt_y, rest)) }
    expect(hasAlternateLayout(partial)).toBe(false)
  })

  test('swaps the position pairs of tracks and clusters, and swapping again restores them', () => {
    const atlas = withAlternate()
    const swapped = withLayout(atlas, 'alternate')
    expect(swapped.tracks[0]).toMatchObject({ x: 100, y: 200, alt_x: 0, alt_y: 0 })
    expect(swapped.clusters[1]).toMatchObject({ x: 301, y: 401, alt_x: 4, alt_y: 3 })
    expect(withLayout(swapped, 'alternate')).toEqual(atlas)
  })

  test('leaves everything but positions untouched and returns the atlas itself for the primary layout', () => {
    const atlas = withAlternate()
    expect(withLayout(atlas, 'primary')).toBe(atlas)
    const swapped = withLayout(atlas, 'alternate')
    expect(swapped.tracks.map((track) => track.id)).toEqual(atlas.tracks.map((track) => track.id))
    expect(swapped.neighbors).toBe(atlas.neighbors)
  })

  test('ignores a request for a layout the export does not carry', () => {
    const atlas = validateAtlas(atlasInput())
    expect(withLayout(atlas, 'alternate')).toBe(atlas)
  })

  test('names the known layouts and passes unknown ones through', () => {
    expect(layoutLabel('hierarchical')).toBe('Clusters first')
    expect(layoutLabel('grid')).toBe('grid')
  })
})
