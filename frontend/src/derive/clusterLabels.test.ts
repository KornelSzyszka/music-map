import { describe, expect, it } from 'vitest'
import type { Cluster } from '../data/types'
import { layoutLabels } from './clusterLabels'

const OPTIONS = { width: 400, height: 200, charWidth: 10, lineHeight: 15, maxLabels: 10 }
const cluster = (id: number, size: number, x: number, y: number, label = 'rock'): Cluster => ({
  id, label, size, x, y, top_tags: [label],
})
const identity = (point: { x: number; y: number }) => point

describe('cluster label layout', () => {
  it('keeps the bigger cluster when two labels would overlap', () => {
    const labels = layoutLabels([cluster(1, 10, 200, 100), cluster(2, 50, 210, 104)], identity, OPTIONS)
    expect(labels.map((label) => label.id)).toEqual([2])
  })

  it('keeps both labels when they do not overlap', () => {
    const labels = layoutLabels([cluster(1, 10, 100, 50), cluster(2, 50, 300, 150)], identity, OPTIONS)
    expect(labels.map((label) => label.id).sort()).toEqual([1, 2])
  })

  it('drops labels that would leave the canvas', () => {
    const labels = layoutLabels([cluster(1, 10, 5, 100), cluster(2, 10, 200, -20), cluster(3, 10, 200, 100)], identity, OPTIONS)
    expect(labels.map((label) => label.id)).toEqual([3])
  })

  it('places at most maxLabels, biggest first', () => {
    const many = Array.from({ length: 6 }, (_, i) => cluster(i, i + 1, 50 + i * 60, 100, 'ab'))
    const labels = layoutLabels(many, identity, { ...OPTIONS, maxLabels: 3 })
    expect(labels.map((label) => label.id)).toEqual([5, 4, 3])
  })

  it('shows more labels once zooming spreads the clusters apart', () => {
    const near = [cluster(1, 10, 200, 100), cluster(2, 9, 215, 100)]
    const zoomed = (point: { x: number; y: number }) => ({ x: 200 + (point.x - 200) * 6, y: point.y })
    expect(layoutLabels(near, identity, OPTIONS)).toHaveLength(1)
    expect(layoutLabels(near, zoomed, { ...OPTIONS, width: 800 })).toHaveLength(2)
  })
})
