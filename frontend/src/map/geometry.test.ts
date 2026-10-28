import { expect, test } from 'vitest'
import { atlasInput } from '../data/testFixtures'
import { fitView, fromCanvas, MAP_HEIGHT, MAP_WIDTH, toCanvas } from './geometry'

test('fits all points within the canvas and inverts the display transform for picking', () => {
  const tracks = atlasInput().tracks
  const view = fitView(tracks)
  for (const track of tracks) {
    const pixel = toCanvas(track, view)
    expect(pixel.x).toBeGreaterThanOrEqual(32)
    expect(pixel.x).toBeLessThanOrEqual(MAP_WIDTH - 32)
    expect(pixel.y).toBeGreaterThanOrEqual(32)
    expect(pixel.y).toBeLessThanOrEqual(MAP_HEIGHT - 32)
    const point = fromCanvas(pixel, view)
    expect(point.x).toBeCloseTo(track.x)
    expect(point.y).toBeCloseTo(track.y)
  }
})

test('handles empty and coincident points with a finite positive scale', () => {
  expect(fitView([])).toEqual({ x: 0, y: 0, scale: 1 })
  const track = atlasInput().tracks[0]
  const view = fitView([track, { ...track, id: 'coincident' }])
  expect(Number.isFinite(view.scale)).toBe(true)
  expect(view.scale).toBeGreaterThan(0)
  expect(toCanvas(track, view)).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 })
})
