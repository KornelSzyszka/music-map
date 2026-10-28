import { describe, expect, it } from 'vitest'
import { makeGraph, makeNode, makeSample } from '../data/featureGraphFixture'
import {
  defaultCompare,
  defaultHighlight,
  genresByMedian,
  pearson,
  ridgelineRows,
  robustAxis,
  scatterPoints,
  tagBars,
} from './featureCharts'

const QUANTILES = [10, 25, 50, 75, 90]

describe('feature chart derivations', () => {
  it('draws a closed outline per genre scaled to its own tallest bin', () => {
    const [rock] = ridgelineRows(makeNode(), ['rock'], 30, 10)
    expect(rock.points[0]).toEqual({ x: 0, y: 10 })
    expect(rock.points[rock.points.length - 1]).toEqual({ x: 30, y: 10 })
    // The 0.5 bin is the tallest of the rock histogram, so it reaches the top.
    expect(Math.min(...rock.points.map((point) => point.y))).toBe(0)
  })

  it('skips genres that have no histogram', () => {
    expect(ridgelineRows(makeNode(), ['rock', 'polka'], 30, 10).map((row) => row.genre)).toEqual(['rock'])
  })

  it('orders genres by median and picks the extremes to highlight', () => {
    const node = makeNode()
    expect(genresByMedian(node, QUANTILES)).toEqual(['jazz', 'rock'])
    expect(defaultHighlight(node, QUANTILES)).toEqual(['jazz', 'rock'])
    const wide = makeNode({
      genre_profile: { a: [0, 0, 3, 0, 0], b: [0, 0, 1, 0, 0], c: [0, 0, 2, 0, 0] },
    })
    expect(defaultHighlight(wide, QUANTILES)).toEqual(['b', 'a'])
  })

  it('scales tag bars to the largest absolute mean and keeps the sign', () => {
    const bars = tagBars(makeNode().tag_profile)
    expect(bars.map((bar) => bar.tag)).toEqual(['trance', 'hiphop'])
    expect(bars[0].fraction).toBeCloseTo(1)
    expect(bars[1].fraction).toBeCloseTo(-0.42 / 0.44)
  })

  it('computes the Pearson correlation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1)
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0)
    expect(pearson([1], [2])).toBe(0)
  })

  it('ignores outliers when choosing an axis range', () => {
    const values = [...Array.from({ length: 200 }, (_, i) => i), 1_000_000]
    expect(robustAxis(values).max).toBeLessThan(250)
    expect(robustAxis([5, 5, 5])).toEqual({ min: 5, max: 6 })
    expect(robustAxis([])).toEqual({ min: 0, max: 1 })
  })

  it('pairs two feature columns with the genre of each sampled track', () => {
    const points = scatterPoints(makeSample(), 'rhythm.bpm', 'lowlevel.mfcc.mean[0]')
    expect(points).toHaveLength(4)
    expect(points[1]).toEqual({ x: 120, y: -8, genre: 'jazz' })
    expect(scatterPoints(makeSample(), 'rhythm.bpm', 'missing')).toEqual([])
  })

  it('compares with the most correlated feature, else any other one', () => {
    const graph = makeGraph()
    expect(defaultCompare(graph, 'rhythm.bpm')).toBe('lowlevel.mfcc.mean[0]')
    expect(defaultCompare(graph, 'tonal.key_strength')).toBe('rhythm.bpm')
  })
})
