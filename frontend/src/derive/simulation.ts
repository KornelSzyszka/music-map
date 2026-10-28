/**
 * Small force simulation in the spirit of Obsidian's graph view: nodes repel each
 * other, links act as springs (stronger correlation, shorter and stiffer), a weak
 * pull keeps everything near the centre, and an `alpha` value cools the system
 * until it rests. Dragging pins a node and reheats the others.
 *
 * Deterministic: no random numbers, so the same input always settles the same way.
 */

export interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  /** A pinned node follows the pointer and ignores forces. */
  pinned: boolean
}

export interface SimLink {
  source: number
  target: number
  /** Absolute correlation in [0, 1]. */
  strength: number
}

export interface Simulation {
  nodes: SimNode[]
  links: SimLink[]
  alpha: number
  alphaTarget: number
}

export interface SimParams {
  width: number
  height: number
  repulsion: number
  linkStiffness: number
  restLengthMin: number
  restLengthRange: number
  centreGravity: number
  collisionPadding: number
  damping: number
  alphaDecay: number
  alphaMin: number
  maxSpeed: number
}

export const DEFAULT_SIM_PARAMS: SimParams = {
  width: 760,
  height: 560,
  repulsion: 1500,
  linkStiffness: 0.025,
  restLengthMin: 40,
  restLengthRange: 170,
  centreGravity: 0.012,
  collisionPadding: 5,
  damping: 0.78,
  alphaDecay: 0.0228,
  alphaMin: 0.004,
  maxSpeed: 24,
}

export function createSimulation(
  seeds: ReadonlyArray<{ id: string; x: number; y: number; radius: number }>,
  links: readonly SimLink[],
  alpha = 0.6,
): Simulation {
  return {
    nodes: seeds.map((seed) => ({ ...seed, vx: 0, vy: 0, pinned: false })),
    links: links.map((link) => ({ ...link })),
    alpha,
    alphaTarget: 0,
  }
}

export function isSettled(sim: Simulation, params: SimParams = DEFAULT_SIM_PARAMS): boolean {
  return sim.alpha < params.alphaMin && sim.alphaTarget === 0
}

/** Heat the system so that it moves again (after a drag or a reset). */
export function reheat(sim: Simulation, alpha = 0.5): void {
  sim.alpha = Math.max(sim.alpha, alpha)
}

/** Advance the simulation by one step; mutates `sim` for speed. */
export function tick(sim: Simulation, params: SimParams = DEFAULT_SIM_PARAMS): void {
  const { nodes, links } = sim
  const forceX = new Float64Array(nodes.length)
  const forceY = new Float64Array(nodes.length)

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      let dx = nodes[j].x - nodes[i].x
      let dy = nodes[j].y - nodes[i].y
      let distance = Math.hypot(dx, dy)
      if (distance === 0) {
        // Coincident nodes have no direction; split them along x by index.
        dx = 1
        dy = 0
        distance = 1
      }
      const ux = dx / distance
      const uy = dy / distance
      const push = params.repulsion / Math.max(distance * distance, 25)
      const minimum = nodes[i].radius + nodes[j].radius + params.collisionPadding
      const overlap = distance < minimum ? (minimum - distance) * 0.5 : 0
      const total = push + overlap
      forceX[i] -= ux * total
      forceY[i] -= uy * total
      forceX[j] += ux * total
      forceY[j] += uy * total
    }
  }

  for (const link of links) {
    const a = nodes[link.source]
    const b = nodes[link.target]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const distance = Math.hypot(dx, dy) || 1
    const rest = params.restLengthMin + params.restLengthRange * (1 - link.strength)
    const pull = params.linkStiffness * link.strength * (distance - rest)
    const fx = (dx / distance) * pull
    const fy = (dy / distance) * pull
    forceX[link.source] += fx
    forceY[link.source] += fy
    forceX[link.target] -= fx
    forceY[link.target] -= fy
  }

  const cx = params.width / 2
  const cy = params.height / 2
  nodes.forEach((node, index) => {
    if (node.pinned) {
      node.vx = 0
      node.vy = 0
      return
    }
    forceX[index] += (cx - node.x) * params.centreGravity
    forceY[index] += (cy - node.y) * params.centreGravity
    node.vx = (node.vx + forceX[index] * sim.alpha) * params.damping
    node.vy = (node.vy + forceY[index] * sim.alpha) * params.damping
    const speed = Math.hypot(node.vx, node.vy)
    if (speed > params.maxSpeed) {
      node.vx *= params.maxSpeed / speed
      node.vy *= params.maxSpeed / speed
    }
    node.x += node.vx
    node.y += node.vy
  })

  sim.alpha += (sim.alphaTarget - sim.alpha) * params.alphaDecay * 4
}

/** Run until settled (or `maxTicks`), for users who prefer reduced motion and for tests. */
export function settle(sim: Simulation, params: SimParams = DEFAULT_SIM_PARAMS, maxTicks = 600): number {
  let ticks = 0
  while (!isSettled(sim, params) && ticks < maxTicks) {
    tick(sim, params)
    ticks += 1
  }
  return ticks
}
