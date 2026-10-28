import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { FeatureGraph } from '../data/featureGraph'
import { maxPower, neighboursOf, nodeRadius, toPixels, visibleIds } from '../derive/featureGraph'
import {
  createSimulation,
  DEFAULT_SIM_PARAMS,
  isSettled,
  reheat,
  settle,
  tick,
  type SimLink,
  type Simulation,
} from '../derive/simulation'
import type { FeatureGraphAction, FeatureGraphState } from '../state/featureGraphState'

const GRAPH_WIDTH = DEFAULT_SIM_PARAMS.width
const GRAPH_HEIGHT = DEFAULT_SIM_PARAMS.height
const PADDING = 36
const LABELLED_RELATED = 3
const DRAG_HEAT = 0.3
const CLICK_DISTANCE = 4
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 1.15
const BUTTON_ZOOM = 1.25
const REDUCED_MOTION_TICKS = 12

interface Props {
  graph: FeatureGraph
  state: FeatureGraphState
  dispatch: (action: FeatureGraphAction) => void
}

interface View {
  k: number
  tx: number
  ty: number
}

interface Gesture {
  kind: 'node' | 'pan'
  index: number
  startX: number
  startY: number
  moved: number
  startView: View
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function buildSimulation(graph: FeatureGraph): { sim: Simulation; indexOf: Map<string, number> } {
  const strongest = maxPower(graph)
  const indexOf = new Map(graph.features.map((feature, index) => [feature.id, index]))
  const links: SimLink[] = graph.edges.map((edge) => ({
    source: indexOf.get(edge.source) ?? 0,
    target: indexOf.get(edge.target) ?? 0,
    strength: Math.abs(edge.r),
  }))
  const seeds = graph.features.map((feature) => ({
    id: feature.id,
    ...toPixels(feature, GRAPH_WIDTH, GRAPH_HEIGHT, PADDING),
    radius: nodeRadius(feature.power, strongest),
  }))
  const sim = createSimulation(seeds, links)
  // Users who prefer reduced motion get the settled layout without the animation.
  if (prefersReducedMotion()) settle(sim)
  return { sim, indexOf }
}

/** Convert client coordinates to the svg's viewBox coordinates. */
function toLocal(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const matrix = svg.getScreenCTM()
  if (!matrix) return { x: clientX, y: clientY }
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
  return { x: point.x, y: point.y }
}

/** Zoom around a point of the viewBox so that the point under the cursor stays put. */
function zoomAt(view: View, around: { x: number; y: number }, factor: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor))
  const ratio = k / view.k
  return { k, tx: around.x - (around.x - view.tx) * ratio, ty: around.y - (around.y - view.ty) * ratio }
}

type Positions = ReadonlyArray<{ x: number; y: number }>

function snapshot(sim: Simulation): Positions {
  return sim.nodes.map((node) => ({ x: node.x, y: node.y }))
}

export default function FeatureGraphMap({ graph, state, dispatch }: Props) {
  const [initial] = useState(() => buildSimulation(graph))
  // The simulation is mutable, so handlers reach it through a ref; rendering only reads
  // the immutable position snapshots that the animation loop publishes as state.
  const simRef = useRef<Simulation>(initial.sim)
  const [positions, setPositions] = useState<Positions>(() => snapshot(initial.sim))
  const { indexOf } = initial
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const viewRef = useRef(view)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let handle = 0
    const loop = (): void => {
      const sim = simRef.current
      if (!isSettled(sim)) {
        tick(sim)
        setPositions(snapshot(sim))
      }
      handle = requestAnimationFrame(loop)
    }
    handle = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const local = toLocal(svg, event.clientX, event.clientY)
      setView((current) => zoomAt(current, local, event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP))
    }
    // Non-passive so that scrolling over the graph zooms it instead of the page.
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const strongest = maxPower(graph)
  const visible = visibleIds(graph, state.hiddenFamilies)
  const focus = state.hovered ?? state.selected
  const related = focus ? neighboursOf(graph, focus) : null
  const labelledRelated = new Set(
    [...(related ?? [])]
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, LABELLED_RELATED)
      .map(([id]) => id),
  )

  function advance(): void {
    // Without animation frames (reduced motion) a drag still has to move the neighbours.
    if (!prefersReducedMotion()) return
    const sim = simRef.current
    for (let i = 0; i < REDUCED_MOTION_TICKS; i += 1) tick(sim)
    setPositions(snapshot(sim))
  }

  function onNodeDown(event: ReactPointerEvent<SVGCircleElement>, index: number): void {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const sim = simRef.current
    sim.nodes[index].pinned = true
    sim.alphaTarget = DRAG_HEAT
    reheat(sim, DRAG_HEAT)
    gesture.current = {
      kind: 'node',
      index,
      startX: event.clientX,
      startY: event.clientY,
      moved: 0,
      startView: viewRef.current,
    }
  }

  function onMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const active = gesture.current
    const svg = svgRef.current
    if (!active || !svg) return
    active.moved = Math.max(active.moved, Math.hypot(event.clientX - active.startX, event.clientY - active.startY))
    if (active.kind === 'node') {
      const local = toLocal(svg, event.clientX, event.clientY)
      const current = viewRef.current
      const node = simRef.current.nodes[active.index]
      node.x = (local.x - current.tx) / current.k
      node.y = (local.y - current.ty) / current.k
      setPositions(snapshot(simRef.current))
      advance()
    } else {
      const now = toLocal(svg, event.clientX, event.clientY)
      const before = toLocal(svg, active.startX, active.startY)
      setView({
        k: active.startView.k,
        tx: active.startView.tx + now.x - before.x,
        ty: active.startView.ty + now.y - before.y,
      })
    }
  }

  function onUp(): void {
    const active = gesture.current
    gesture.current = null
    if (!active || active.kind !== 'node') return
    const sim = simRef.current
    sim.nodes[active.index].pinned = false
    sim.alphaTarget = 0
    if (active.moved < CLICK_DISTANCE) dispatch({ type: 'select', id: sim.nodes[active.index].id })
  }

  function onBackgroundDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.target !== event.currentTarget && !(event.target instanceof SVGRectElement)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      kind: 'pan',
      index: -1,
      startX: event.clientX,
      startY: event.clientY,
      moved: 0,
      startView: viewRef.current,
    }
  }

  function zoomBy(factor: number): void {
    setView((current) => zoomAt(current, { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }, factor))
  }

  return (
    <div className="graph-frame">
      <svg
        ref={svgRef}
        className="feature-graph"
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        role="group"
        aria-label="Feature graph. Nodes are features and repel each other, lines are springs between strongly correlated features, node size is how well a feature separates genres. Drag a node, scroll to zoom."
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <rect className="graph-background" x={0} y={0} width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="transparent" />
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          <g>
            {graph.edges.map((edge) => {
              if (!visible.has(edge.source) || !visible.has(edge.target)) return null
              const from = positions[indexOf.get(edge.source) ?? 0]
              const to = positions[indexOf.get(edge.target) ?? 0]
              const touchesFocus = focus !== null && (edge.source === focus || edge.target === focus)
              return (
                <line
                  key={`${edge.source}|${edge.target}`}
                  className={touchesFocus ? 'edge edge-focus' : 'edge'}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeWidth={0.6 + 2.4 * Math.abs(edge.r) ** 3}
                  opacity={focus === null ? 0.35 : touchesFocus ? 0.9 : 0.08}
                />
              )
            })}
          </g>
          <g>
            {graph.features.map((feature, index) => {
              if (!visible.has(feature.id)) return null
              const node = positions[index]
              const radius = nodeRadius(feature.power, strongest)
              const isFocus = feature.id === focus
              const isRelated = related?.has(feature.id) ?? false
              const dimmed = focus !== null && !isFocus && !isRelated
              const labelled = isFocus || labelledRelated.has(feature.id) || feature.id === state.selected
              return (
                <g key={feature.id} opacity={dimmed ? 0.25 : 1}>
                  <circle
                    className={`node family-${feature.family}${feature.id === state.selected ? ' node-selected' : ''}`}
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    role="button"
                    tabIndex={0}
                    aria-pressed={feature.id === state.selected}
                    aria-label={`${feature.label}, separation power ${feature.power.toFixed(2)}`}
                    onPointerDown={(event) => onNodeDown(event, index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        dispatch({ type: 'select', id: feature.id })
                      }
                    }}
                    onPointerEnter={() => dispatch({ type: 'hover', id: feature.id })}
                    onPointerLeave={() => dispatch({ type: 'hover', id: null })}
                    onFocus={() => dispatch({ type: 'hover', id: feature.id })}
                    onBlur={() => dispatch({ type: 'hover', id: null })}
                  />
                  {labelled ? (
                    <text className="node-label" x={node.x} y={node.y - radius - 5} textAnchor="middle">
                      {feature.label}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        </g>
      </svg>
      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(BUTTON_ZOOM)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / BUTTON_ZOOM)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="Reset zoom">⌂</button>
      </div>
    </div>
  )
}
