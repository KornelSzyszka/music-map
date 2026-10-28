import { describe, expect, it } from 'vitest'
import {
  createSimulation,
  DEFAULT_SIM_PARAMS,
  isSettled,
  reheat,
  settle,
  tick,
  type SimLink,
} from './simulation'

const seeds = (points: Array<[number, number]>) =>
  points.map(([x, y], index) => ({ id: `n${index}`, x, y, radius: 6 }))

const distance = (sim: ReturnType<typeof createSimulation>, a: number, b: number): number =>
  Math.hypot(sim.nodes[a].x - sim.nodes[b].x, sim.nodes[a].y - sim.nodes[b].y)

describe('force simulation', () => {
  it('pulls linked nodes towards their rest length from far away', () => {
    const links: SimLink[] = [{ source: 0, target: 1, strength: 0.9 }]
    const sim = createSimulation(seeds([[100, 280], [660, 280]]), links)
    const before = distance(sim, 0, 1)
    settle(sim)
    const rest = DEFAULT_SIM_PARAMS.restLengthMin + DEFAULT_SIM_PARAMS.restLengthRange * 0.1
    expect(distance(sim, 0, 1)).toBeLessThan(before / 2)
    expect(distance(sim, 0, 1)).toBeGreaterThan(rest * 0.5)
  })

  it('keeps stronger links shorter than weaker ones', () => {
    const run = (strength: number): number => {
      const sim = createSimulation(seeds([[300, 280], [460, 280]]), [{ source: 0, target: 1, strength }])
      settle(sim)
      return distance(sim, 0, 1)
    }
    expect(run(0.95)).toBeLessThan(run(0.7))
  })

  it('pushes overlapping unlinked nodes apart', () => {
    const sim = createSimulation(seeds([[380, 280], [382, 280]]), [])
    settle(sim)
    expect(distance(sim, 0, 1)).toBeGreaterThan(12)
  })

  it('splits exactly coincident nodes instead of dividing by zero', () => {
    const sim = createSimulation(seeds([[380, 280], [380, 280]]), [])
    settle(sim)
    expect(distance(sim, 0, 1)).toBeGreaterThan(12)
    expect(sim.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
  })

  it('never moves a pinned node but still moves the others', () => {
    const sim = createSimulation(seeds([[380, 280], [390, 280]]), [{ source: 0, target: 1, strength: 0.8 }])
    sim.nodes[0].pinned = true
    const start = { x: sim.nodes[0].x, y: sim.nodes[0].y }
    const other = sim.nodes[1].x
    settle(sim)
    expect({ x: sim.nodes[0].x, y: sim.nodes[0].y }).toEqual(start)
    expect(sim.nodes[1].x).not.toBe(other)
  })

  it('is deterministic', () => {
    const build = () => createSimulation(seeds([[100, 100], [300, 200], [500, 400]]), [
      { source: 0, target: 1, strength: 0.8 },
      { source: 1, target: 2, strength: 0.75 },
    ])
    const a = build()
    const b = build()
    settle(a)
    settle(b)
    expect(a.nodes.map((n) => [n.x, n.y])).toEqual(b.nodes.map((n) => [n.x, n.y]))
  })

  it('cools down and rests, and wakes up again when reheated', () => {
    const sim = createSimulation(seeds([[200, 200], [500, 300]]), [{ source: 0, target: 1, strength: 0.8 }])
    const ticks = settle(sim)
    expect(isSettled(sim)).toBe(true)
    expect(ticks).toBeLessThan(600)
    reheat(sim)
    expect(isSettled(sim)).toBe(false)
  })

  it('stays awake while a drag holds the target heat above zero', () => {
    const sim = createSimulation(seeds([[200, 200], [500, 300]]), [])
    sim.alphaTarget = 0.3
    for (let i = 0; i < 400; i += 1) tick(sim)
    expect(isSettled(sim)).toBe(false)
    expect(sim.alpha).toBeGreaterThan(0.2)
  })

  it('limits node speed so a violent start cannot explode', () => {
    const sim = createSimulation(seeds([[0, 0], [1, 0], [2, 0]]), [], 5)
    tick(sim)
    for (const node of sim.nodes) {
      expect(Math.hypot(node.vx, node.vy)).toBeLessThanOrEqual(DEFAULT_SIM_PARAMS.maxSpeed + 1e-9)
    }
  })
})
