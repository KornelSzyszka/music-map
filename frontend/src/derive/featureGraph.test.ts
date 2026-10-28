import { describe, expect, it } from 'vitest'
import { makeGraph, makeNode } from '../data/featureGraphFixture'
import {
  axisPosition,
  boxRows,
  histogramBars,
  MAX_RADIUS,
  maxPower,
  MIN_RADIUS,
  neighboursOf,
  nodeRadius,
  toPixels,
  visibleIds,
} from './featureGraph'

describe('feature graph derivations', () => {
  const graph = makeGraph()

  it('scales node radius with the square root of the separation power', () => {
    const strongest = maxPower(graph)
    expect(strongest).toBe(0.4)
    expect(nodeRadius(0, strongest)).toBe(MIN_RADIUS)
    expect(nodeRadius(0.4, strongest)).toBe(MAX_RADIUS)
    expect(nodeRadius(0.1, strongest)).toBeCloseTo((MIN_RADIUS + MAX_RADIUS) / 2)
    expect(nodeRadius(0.3, 0)).toBe(MIN_RADIUS)
  })

  it('maps layout corners to the padded pixel box with y pointing down', () => {
    expect(toPixels({ x: -1, y: 1 }, 400, 200, 20)).toEqual({ x: 20, y: 20 })
    expect(toPixels({ x: 1, y: -1 }, 400, 200, 20)).toEqual({ x: 380, y: 180 })
    expect(toPixels({ x: 0, y: 0 }, 400, 200, 20)).toEqual({ x: 200, y: 100 })
  })

  it('finds the correlated neighbours of a feature from either edge end', () => {
    expect(neighboursOf(graph, 'rhythm.bpm').get('lowlevel.mfcc.mean[0]')).toBe(-0.82)
    expect(neighboursOf(graph, 'lowlevel.mfcc.mean[0]').get('rhythm.bpm')).toBe(-0.82)
    expect(neighboursOf(graph, 'tonal.key_strength').size).toBe(0)
  })

  it('hides features of hidden families', () => {
    expect([...visibleIds(graph, new Set(['mfcc']))].sort()).toEqual(['rhythm.bpm', 'tonal.key_strength'])
  })

  it('scales histogram bars to the tallest bin with the baseline at the bottom', () => {
    const bars = histogramBars(makeNode().histogram, 90, 60)
    expect(bars.map((bar) => bar.height)).toEqual([20, 60, 40])
    expect(bars.every((bar) => bar.y + bar.height === 60)).toBe(true)
    expect(bars.map((bar) => bar.x)).toEqual([0, 30, 60])
  })

  it('clamps axis positions into the plotted range', () => {
    const { histogram } = makeNode()
    expect(axisPosition(histogram, 120, 120)).toBe(60)
    expect(axisPosition(histogram, 0, 120)).toBe(0)
    expect(axisPosition(histogram, 999, 120)).toBe(120)
  })

  it('orders genre rows by median and names the quantiles it reads', () => {
    const rows = boxRows(makeNode(), [10, 25, 50, 75, 90])
    expect(rows.map((row) => row.genre)).toEqual(['jazz', 'rock'])
    expect(rows[1]).toMatchObject({ p10: 90, p25: 105, median: 120, p75: 135, p90: 150 })
  })

  it('refuses an export that lacks a needed percentile', () => {
    expect(() => boxRows(makeNode(), [5, 25, 50, 75, 95])).toThrow(/10th percentile/)
  })
})
