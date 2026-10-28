import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { buildLookup, neighboursOfTrack } from '../derive/atlasLookup'
import { DEFAULT_LABEL_OPTIONS, layoutLabels } from '../derive/clusterLabels'
import { BASE, GREY, HALO_BASE, MAX_ARTIST_COLOURS, SEQUENTIAL_BASE, SEQUENTIAL_STEPS, SERIES_SLOTS } from '../derive/colouring'
import { nearestPoint } from '../derive/tracks'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import { fitView, fromCanvas, MAP_HEIGHT, MAP_WIDTH, panBy, toCanvas, zoomAt } from './geometry'

const CLICK_DISTANCE = 4
const WHEEL_STEP = 1.15
const KEY_STEP = 1.2
const PICK_RADIUS = 10
const NEIGHBOURS_SHOWN = 10
const LABEL_FONT = '600 12px system-ui, sans-serif'
const ALPHA = { grey: 0.35, halo: 0.45, base: 0.75, colour: 0.9 }

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

/** Resolve a colour slot to the current theme's value (tokens live in CSS, see docs/design.md). */
function slotColours(styles: CSSStyleDeclaration): (slot: number) => string {
  const read = (name: string): string => styles.getPropertyValue(name).trim()
  const series = Array.from({ length: SERIES_SLOTS }, (_, index) => read(`--series-${index + 1}`))
  const sequential = Array.from({ length: SEQUENTIAL_STEPS }, (_, index) => read(`--seq-${index + 1}`))
  const grey = read('--grey')
  const base = read('--base')
  return (slot) => {
    if (slot === GREY) return grey
    if (slot === BASE) return base
    if (slot >= HALO_BASE) return series[slot - HALO_BASE]
    return slot >= SEQUENTIAL_BASE ? sequential[slot - SEQUENTIAL_BASE] : series[slot]
  }
}

/** Changes whenever the theme does (explicit override or system preference), so that the canvas repaints. */
function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    media.removeEventListener('change', onChange)
  }
}

function themeSignature(): string {
  return `${document.documentElement.getAttribute('data-theme') ?? 'system'}|${window.matchMedia('(prefers-color-scheme: dark)').matches}`
}

export default function AtlasMap({ store }: { store: AtlasStore }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const { atlas, derived, selection, view, colourMode } = useAtlasStore(store)
  const theme = useSyncExternalStore(subscribeTheme, themeSignature)
  const lookup = useMemo(() => (atlas ? buildLookup(atlas) : null), [atlas])
  const indexById = useMemo(() => new Map((atlas?.tracks ?? []).map((track, index) => [track.id, index])), [atlas])
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
    const halo = styles.getPropertyValue('--canvas').trim() || '#ffffff'
    const colourOf = slotColours(styles)
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
    const radius = Math.min(6, 2.2 + Math.log2(Math.max(1, view.scale / fitScale)))

    // Grey first, then the faint tints, then full colour, so that colour reads on top.
    const passOf = (slot: number): 'grey' | 'halo' | 'rest' => (slot === GREY ? 'grey' : slot >= HALO_BASE ? 'halo' : 'rest')
    for (const pass of ['grey', 'halo', 'rest'] as const) {
      atlas.tracks.forEach((track, index) => {
        if (!derived.mask[index]) return
        const slot = derived.slots[index]
        if (passOf(slot) !== pass) return
        const point = toCanvas(track, view)
        if (point.x < -8 || point.x > MAP_WIDTH + 8 || point.y < -8 || point.y > MAP_HEIGHT + 8) return
        context.globalAlpha = pass === 'grey' ? ALPHA.grey : pass === 'halo' ? ALPHA.halo : slot === BASE ? ALPHA.base : ALPHA.colour
        context.beginPath()
        context.arc(point.x, point.y, radius, 0, 2 * Math.PI)
        context.fillStyle = colourOf(slot)
        context.fill()
        // Colour never works alone: highlighted artists also get an outline.
        if (colourMode === 'artist' && slot >= 0 && slot < MAX_ARTIST_COLOURS) {
          context.globalAlpha = 1
          context.strokeStyle = ink
          context.lineWidth = 1
          context.stroke()
        }
      })
    }
    context.globalAlpha = 1

    // Neighbour lines and rings follow the visibility mask like the points themselves.
    const selected = derived.selectedTrack
    const selectedIndex = selected ? indexById.get(selected.id) : undefined
    if (selected && lookup && selectedIndex !== undefined && derived.mask[selectedIndex]) {
      const from = toCanvas(selected, view)
      context.strokeStyle = ink
      context.lineWidth = 1
      const visible = (id: string): boolean => {
        const neighbourIndex = indexById.get(id)
        return neighbourIndex !== undefined && derived.mask[neighbourIndex] === 1
      }
      for (const { track } of neighboursOfTrack(lookup, selected.id, NEIGHBOURS_SHOWN, visible)) {
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
    const labels = layoutLabels(
      atlas.clusters.filter((cluster) => derived.visibleClusters.has(cluster.id)),
      (point) => toCanvas(point, view),
      { ...DEFAULT_LABEL_OPTIONS, width: MAP_WIDTH, height: MAP_HEIGHT },
    )
    for (const label of labels) {
      context.lineWidth = 4
      context.strokeStyle = halo
      context.strokeText(label.text, label.x, label.y)
      context.fillStyle = ink
      context.fillText(label.text, label.x, label.y)
    }
  }, [atlas, derived, lookup, indexById, selection, view, fitScale, theme, colourMode])

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
    />
  )
}
