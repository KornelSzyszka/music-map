import type { Track } from '../data/types'
import type { View } from '../state/store'

export const MAP_WIDTH = 960
export const MAP_HEIGHT = 600
const PADDING = 32
export const MIN_SCALE = 0.01
export const MAX_SCALE = 10000

export function fitView(tracks: readonly Track[]): View {
  if (tracks.length === 0) return { x: 0, y: 0, scale: 1 }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const track of tracks) {
    minX = Math.min(minX, track.x)
    maxX = Math.max(maxX, track.x)
    minY = Math.min(minY, track.y)
    maxY = Math.max(maxY, track.y)
  }
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    scale: Math.min((MAP_WIDTH - 2 * PADDING) / Math.max(1, maxX - minX),
      (MAP_HEIGHT - 2 * PADDING) / Math.max(1, maxY - minY)),
  }
}

export function toCanvas(point: { x: number; y: number }, view: View) {
  return { x: MAP_WIDTH / 2 + (point.x - view.x) * view.scale,
    y: MAP_HEIGHT / 2 - (point.y - view.y) * view.scale }
}

export function fromCanvas(point: { x: number; y: number }, view: View) {
  return { x: view.x + (point.x - MAP_WIDTH / 2) / view.scale,
    y: view.y - (point.y - MAP_HEIGHT / 2) / view.scale }
}

/** Zoom by `factor` around a canvas point so that the map point under it stays put. */
export function zoomAt(view: View, around: { x: number; y: number }, factor: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
  const before = fromCanvas(around, view)
  const after = fromCanvas(around, { ...view, scale })
  return { x: view.x + before.x - after.x, y: view.y + before.y - after.y, scale }
}

/** Move the view as if the map were dragged by (dx, dy) canvas pixels. */
export function panBy(view: View, dx: number, dy: number): View {
  return { x: view.x - dx / view.scale, y: view.y + dy / view.scale, scale: view.scale }
}
