import { useEffect, useRef } from 'react'
import { nearestPoint } from '../derive/tracks'
import type { AtlasStore } from '../state/store'
import { useAtlasStore } from '../state/useAtlasStore'
import { fitView, fromCanvas, MAP_HEIGHT, MAP_WIDTH, toCanvas } from './geometry'

export default function AtlasMap({ store }: { store: AtlasStore }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { atlas, derived, selection, view } = useAtlasStore(store)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
    atlas?.tracks.forEach((track, index) => {
      if (!derived.mask[index]) return
      const point = toCanvas(track, view)
      context.beginPath()
      context.arc(point.x, point.y, 3, 0, 2 * Math.PI)
      context.fillStyle = derived.colours[index]
      context.fill()
      if (track.id === selection) {
        context.beginPath()
        context.arc(point.x, point.y, 7, 0, 2 * Math.PI)
        context.strokeStyle = '#111111'
        context.lineWidth = 2
        context.stroke()
      }
    })
  }, [atlas, derived, selection, view])

  function selectAt(x: number, y: number): void {
    const point = fromCanvas({ x, y }, view)
    const nearest = nearestPoint(atlas?.tracks ?? [], point, derived.mask, 10 / view.scale)
    store.setSelection(nearest?.id ?? null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      style={{ width: '100%', maxWidth: MAP_WIDTH, height: 'auto', outline: '1px solid #aaaaaa', display: 'block' }}
      role="img"
      aria-label="Music atlas points. Arrow keys pan, plus and minus zoom, Home fits all points, Enter selects at the centre, Escape clears selection."
      tabIndex={0}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        selectAt((event.clientX - bounds.left) * MAP_WIDTH / bounds.width,
          (event.clientY - bounds.top) * MAP_HEIGHT / bounds.height)
      }}
      onKeyDown={(event) => {
        const step = 40 / view.scale
        const moves: Record<string, { x: number; y: number }> = {
          ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
          ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
        }
        const move = moves[event.key]
        if (move) store.setView({ ...view, x: view.x + move.x, y: view.y + move.y })
        else if (event.key === '+' || event.key === '=') store.setView({ ...view, scale: Math.min(10000, view.scale * 1.2) })
        else if (event.key === '-') store.setView({ ...view, scale: Math.max(0.01, view.scale / 1.2) })
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
