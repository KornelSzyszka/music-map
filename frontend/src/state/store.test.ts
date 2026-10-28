import { expect, test, vi } from 'vitest'
import { validateAtlas } from '../data/loader'
import { atlasInput } from '../data/testFixtures'
import { createAtlasStore } from './store'

test('keeps stable snapshots, notifies subscribers and supports unsubscribe', () => {
  const store = createAtlasStore()
  expect(store.getSnapshot()).toBe(store.getSnapshot())
  const initial = store.getSnapshot()
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  store.startLoading()
  expect(store.getSnapshot()).not.toBe(initial)
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  store.failLoading('HTTP 404')
  expect(listener).toHaveBeenCalledTimes(1)
  expect(store.getSnapshot()).toMatchObject({ status: 'error', error: 'HTTP 404' })
})

test('derives masks, colours and tags once per relevant state change', () => {
  const store = createAtlasStore()
  const atlas = validateAtlas(atlasInput())
  store.setAtlas(atlas)
  const initial = store.getSnapshot()
  expect(initial.status).toBe('ready')
  expect(initial.derived.visibleCount).toBe(3)
  expect(initial.derived.tags).toEqual(['bright', 'calm', 'guitar', 'jazz', 'piano', 'rock'])
  store.setView({ x: 3, y: 5, scale: 2 })
  expect(store.getSnapshot().derived).toBe(initial.derived)
  store.setSelection('test:2')
  expect(store.getSnapshot().derived.selectedTrack?.title).toBe('Evening')
  expect(store.getSnapshot().derived.mask).toBe(initial.derived.mask)
  expect(store.getSnapshot().derived.colours).toBe(initial.derived.colours)
  store.setFilters({ text: 'sky', tags: ['piano'] })
  expect([...store.getSnapshot().derived.mask]).toEqual([0, 1, 0])
  expect(store.getSnapshot().derived.visibleCount).toBe(1)
  expect(store.getSnapshot().derived.colours).toBe(initial.derived.colours)
  const mask = store.getSnapshot().derived.mask
  store.setColourMode('tag')
  expect(store.getSnapshot().derived.mask).toBe(mask)
  expect(store.getSnapshot().derived.colours).not.toEqual(initial.derived.colours)
  store.setFilters({ text: '', tags: [] })
  expect(store.getSnapshot().derived.visibleCount).toBe(3)
  expect(store.getSnapshot().atlas).toBe(atlas)
})

test('copies filter and view inputs and rejects invalid selections or views', () => {
  const store = createAtlasStore()
  const filters = { text: '', tags: ['rock'] }
  const view = { x: 1, y: 2, scale: 3 }
  store.setFilters(filters)
  store.setView(view)
  filters.tags.push('jazz')
  view.x = 100
  expect(store.getSnapshot().filters.tags).toEqual(['rock'])
  expect(store.getSnapshot().view.x).toBe(1)
  expect(() => store.setSelection('missing')).toThrow('unknown track')
  expect(() => store.setView({ x: 0, y: 0, scale: 0 })).toThrow('positive finite scale')
  expect(() => store.setView({ x: NaN, y: 0, scale: 1 })).toThrow('finite coordinates')
})

test('retains user filters and colour mode while resetting stale data and selection on reload', () => {
  const store = createAtlasStore()
  store.setAtlas(validateAtlas(atlasInput()))
  store.setSelection('test:1')
  store.setFilters({ text: 'ada', tags: [] })
  store.setColourMode('tag')
  store.startLoading()
  expect(store.getSnapshot()).toMatchObject({ atlas: null, selection: null, status: 'loading' })
  expect(store.getSnapshot().derived.visibleCount).toBe(0)
  store.setAtlas(validateAtlas(atlasInput()))
  expect(store.getSnapshot()).toMatchObject({ selection: null, filters: { text: 'ada', tags: [] }, colourMode: 'tag' })
  expect(store.getSnapshot().derived.visibleCount).toBe(2)
})
