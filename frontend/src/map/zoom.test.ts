import { describe, expect, it } from 'vitest'
import { fromCanvas, MAP_HEIGHT, MAP_WIDTH, MAX_SCALE, MIN_SCALE, panBy, zoomAt } from './geometry'

const VIEW = { x: 3, y: -2, scale: 40 }

describe('map zoom and pan', () => {
  it('keeps the map point under the cursor fixed while zooming', () => {
    const cursor = { x: MAP_WIDTH * 0.8, y: MAP_HEIGHT * 0.3 }
    const before = fromCanvas(cursor, VIEW)
    const after = fromCanvas(cursor, zoomAt(VIEW, cursor, 1.5))
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('zooms in and out by the given factor', () => {
    const center = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
    expect(zoomAt(VIEW, center, 2).scale).toBe(80)
    expect(zoomAt(VIEW, center, 0.5).scale).toBe(20)
  })

  it('clamps the scale to the supported range', () => {
    const center = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
    expect(zoomAt(VIEW, center, 1e9).scale).toBe(MAX_SCALE)
    expect(zoomAt(VIEW, center, 1e-9).scale).toBe(MIN_SCALE)
  })

  it('pans so that dragging right moves the map right and dragging down moves it down', () => {
    const moved = panBy(VIEW, 40, 40)
    expect(moved.x).toBeCloseTo(2)
    expect(moved.y).toBeCloseTo(-1)
    expect(moved.scale).toBe(VIEW.scale)
  })
})
