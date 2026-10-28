import type { Cluster } from '../data/types'

export interface LabelBox {
  readonly id: number
  readonly text: string
  /** Centre of the label in canvas pixels. */
  readonly x: number
  readonly y: number
  readonly width: number
}

export interface LabelOptions {
  readonly width: number
  readonly height: number
  readonly charWidth: number
  readonly lineHeight: number
  readonly maxLabels: number
}

export const DEFAULT_LABEL_OPTIONS: Omit<LabelOptions, 'width' | 'height'> = {
  charWidth: 6.4,
  lineHeight: 15,
  maxLabels: 30,
}

function overlaps(a: LabelBox, b: LabelBox, lineHeight: number): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < lineHeight
}

/**
 * Choose cluster labels that fit: biggest clusters first, skipping labels that
 * would overlap one already placed or fall outside the canvas. Zooming in frees
 * space, so more labels appear.
 */
export function layoutLabels(
  clusters: readonly Cluster[],
  project: (point: { x: number; y: number }) => { x: number; y: number },
  options: LabelOptions,
): LabelBox[] {
  const placed: LabelBox[] = []
  const bySize = [...clusters].sort((a, b) => b.size - a.size || a.id - b.id)
  for (const cluster of bySize) {
    if (placed.length >= options.maxLabels) break
    const text = cluster.label
    const point = project(cluster)
    const width = text.length * options.charWidth
    const box: LabelBox = { id: cluster.id, text, x: point.x, y: point.y, width }
    const inside =
      point.x - width / 2 >= 0 && point.x + width / 2 <= options.width &&
      point.y - options.lineHeight / 2 >= 0 && point.y + options.lineHeight / 2 <= options.height
    if (inside && !placed.some((other) => overlaps(box, other, options.lineHeight))) placed.push(box)
  }
  return placed
}
