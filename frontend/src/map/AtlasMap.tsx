import { useEffect, useMemo, useRef } from 'react'
import { buildLookup, neighboursOfTrack } from '../derive/atlasLookup'
import { DEFAULT_LABEL_OPTIONS, layoutLabels } from '../derive/clusterLabels'
import { nearestPoint, NEUTRAL_COLOUR } from '../derive/tracks'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import { fitView, fromCanvas, MAP_HEIGHT, MAP_WIDTH, panBy, toCanvas, zoomAt } from './geometry'

const CLICK_DISTANCE = 4
const WHEEL_STEP = 1.15
const KEY_STEP = 1.2
const PICK_RADIUS = 10
const NEIGHBOURS_SHOWN = 10
const LABEL_FONT = '600 12px system-ui, sans-serif'

interface Drag {
  startX: number
  startY: number
  lastX: number
  lastY: number
  moved: number
}

/** Convert a pointer position into canvas pixels (the canvas is CSS-scaled). */
function canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect()
  return { x: ((clientX - bounds.left) * MAP_WIDTH) / bounds.width, y: ((clientY - bounds.top) * MAP_HEIGHT) / bounds.height }
}

export default function AtlasMap({ store }: { store: AtlasStore }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const { atlas, derived, selection, view } = useAtlasStore(store)
  const lookup = useMemo(() => (atlas ? buildLookup(atlas) : null), [atlas])
  const fitScale = useMemo(() => fitView(atlas?.tracks ?? []).scale, [atlas])
  const viewRef = useRef(view)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !atlas) return
    const styles = getComputedStyle(canvas)
    const ink = styles.getPropertyValue('--text').trim() || '#111111'
    const halo = styles.getPropertyValue('--surface-raised').trim() || '#ffffff'
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
    const radius = Math.min(6, 2.2 + Math.log2(Math.max(1, view.scale / fitScale)))

    // Unclustered tracks first and faint, so that clusters read on top of them.
    for (const pass of ['background', 'clusters'] as const) {
      context.globalAlpha = pass === 'background' ? 0.4 : 0.9
      atlas.tracks.forEach((track, index) => {
        if (!derived.mask[index]) return
        const isBackground = derived.colours[index] === NEUTRAL_COLOUR
        if (isBackground !== (pass === 'background')) return
        const point = toCanvas(track, view)
        if (point.x < -8 || point.x > MAP_WIDTH + 8 || point.y < -8 || point.y > MAP_HEIGHT + 8) return
        context.beginPath()
        context.arc(point.x, point.y, radius, 0, 2 * Math.PI)
        context.fillStyle = derived.colours[index]
        context.fill()
      })
    }
    context.globalAlpha = 1

    const selected = derived.selectedTrack
    if (selected && lookup) {
      const from = toCanvas(selected, view)
      context.strokeStyle = ink
      context.lineWidth = 1
      for (const { track } of neighboursOfTrack(lookup, selected.id, NEIGHBOURS_SHOWN)) {
        const to = toCanvas(track, view)
        context.globalAlpha = 0.35
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(to.x, to.y)
        context.stroke()
        context.globalAlpha = 1
        context.beginPath()
        context.arc(to.x, to.y, radius + 3, 0, 2 * Math.PI)
        context.stroke()
      }
      context.beginPath()
      context.arc(from.x, from.y, radius + 5, 0, 2 * Math.PI)
      context.lineWidth = 2.5
      context.stroke()
    }

    context.font = LABEL_FONT
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const labels = layoutLabels(atlas.clusters, (point) => toCanvas(point, view), {
      ...DEFAULT_LABEL_OPTIONS,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    })
    for (const label of labels) {
      context.lineWidth = 4
      context.strokeStyle = halo
      context.strokeText(label.text, label.x, label.y)
      context.fillStyle = ink
      context.fillText(label.text, label.x, label.y)
    }
  }, [atlas, derived, lookup, selection, view, fitScale])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const around = canvasPoint(canvas, event.clientX, event.clientY)
      store.setView(zoomAt(viewRef.current, around, event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP))
    }
    // Non-passive so that scrolling over the map zooms it instead of the page.
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [store])

  function selectAt(x: number, y: number): void {
    const point = fromCanvas({ x, y }, view)
    const nearest = nearestPoint(atlas?.tracks ?? [], point, derived.mask, PICK_RADIUS / view.scale)
    store.setSelection(nearest?.id ?? null)
  }

  return (
    <canvas
      ref={canvasRef}
      className="atlas-canvas"
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      role="img"
      aria-label="Music atlas points. Scroll to zoom, drag to pan. With the keyboard: arrow keys pan, plus and minus zoom, Home fits all points, Enter selects at the centre, Escape clears selection."
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        const point = canvasPoint(event.currentTarget, event.clientX, event.clientY)
        drag.current = { startX: point.x, startY: point.y, lastX: point.x, lastY: point.y, moved: 0 }
      }}
      onPointerMove={(event) => {
        const active = drag.current
        if (!active) return
        const point = canvasPoint(event.currentTarget, event.clientX, event.clientY)
        active.moved = Math.max(active.moved, Math.hypot(point.x - active.startX, point.y - active.startY))
        if (active.moved >= CLICK_DISTANCE) {
          store.setView(panBy(viewRef.current, point.x - active.lastX, point.y - active.lastY))
        }
        active.lastX = point.x
        active.lastY = point.y
      }}
      onPointerUp={() => {
        const active = drag.current
        drag.current = null
        if (active && active.moved < CLICK_DISTANCE) selectAt(active.startX, active.startY)
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        const step = 40
        const moves: Record<string, { dx: number; dy: number }> = {
          ArrowLeft: { dx: step, dy: 0 }, ArrowRight: { dx: -step, dy: 0 },
          ArrowUp: { dx: 0, dy: step }, ArrowDown: { dx: 0, dy: -step },
        }
        const move = moves[event.key]
        const centre = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
        if (move) store.setView(panBy(view, move.dx, move.dy))
        else if (event.key === '+' || event.key === '=') store.setView(zoomAt(view, centre, KEY_STEP))
        else if (event.key === '-') store.setView(zoomAt(view, centre, 1 / KEY_STEP))
        else if (event.key === 'Home') store.setView(fitView(atlas?.tracks ?? []))
        else if (event.key === 'Enter') selectAt(MAP_WIDTH / 2, MAP_HEIGHT / 2)
        else if (event.key === 'Escape') store.setSelection(null)
        else return
        event.preventDefault()
      }}
    >
      Your browser must support Canvas 2D to display the atlas. Use the controls to search and filter tracks.
    </canvas>
  )
}
