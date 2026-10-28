import { expect, test, vi } from 'vitest'
import { validateAtlas } from '../data/loader'
import { atlasInput } from '../data/testFixtures'
import { EMPTY_FILTERS } from '../derive/filters'
import { createAtlasStore } from './store'

const loaded = () => {
  const store = createAtlasStore()
  const atlas = validateAtlas(atlasInput())
  store.setAtlas(atlas)
  return { store, atlas }
}

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

test('starts with the neutral colour mode and every track visible', () => {
  const { store } = loaded()
  const { derived, colourMode } = store.getSnapshot()
  expect(colourMode).toBe('none')
  expect(derived.visibleCount).toBe(3)
  expect(derived.legend).toEqual({ kind: 'none' })
  expect(derived.tags).toEqual(['bright', 'calm', 'guitar', 'jazz', 'piano', 'rock'])
  expect(derived.artists.map((option) => option.label)).toEqual(['Ada (2)', 'Sky Trio (1)'])
  expect(derived.features).toEqual(['energy'])
})

test('derives masks and colours only when their inputs change', () => {
  const { store, atlas } = loaded()
  const initial = store.getSnapshot()
  store.setView({ x: 3, y: 5, scale: 2 })
  expect(store.getSnapshot().derived).toBe(initial.derived)
  store.setSelection('test:2')
  expect(store.getSnapshot().derived.selectedTrack?.title).toBe('Evening')
  expect(store.getSnapshot().derived.mask).toBe(initial.derived.mask)
  expect(store.getSnapshot().derived.slots).toBe(initial.derived.slots)
  store.setFilters({ ...EMPTY_FILTERS, text: 'sky', tags: ['piano'] })
  expect([...store.getSnapshot().derived.mask]).toEqual([0, 1, 0])
  expect(store.getSnapshot().derived.visibleCount).toBe(1)
  expect([...store.getSnapshot().derived.visibleClusters]).toEqual([2])
  expect(store.getSnapshot().derived.slots).toBe(initial.derived.slots)
  const mask = store.getSnapshot().derived.mask
  store.setColourMode('cluster')
  expect(store.getSnapshot().derived.mask).toBe(mask)
  expect(store.getSnapshot().derived.slots).not.toBe(initial.derived.slots)
  store.setFilters(EMPTY_FILTERS)
  expect(store.getSnapshot().derived.visibleCount).toBe(3)
  expect(store.getSnapshot().atlas).toBe(atlas)
})

test('artist colouring follows the chosen artists while other modes ignore them', () => {
  const { store } = loaded()
  store.setFilters({ ...EMPTY_FILTERS, artists: ['artist:ada'] })
  expect(store.getSnapshot().derived.legend.kind).toBe('none')
  store.setColourMode('artist')
  expect([...store.getSnapshot().derived.slots]).toEqual([0, -1, 0])
  store.setFilters({ ...EMPTY_FILTERS, artists: ['artist:trio'] })
  expect([...store.getSnapshot().derived.slots]).toEqual([-1, 0, -1])
})

test('feature colouring needs a feature and reacts to changing it', () => {
  const { store } = loaded()
  expect(store.getSnapshot().colourFeature).toBe('energy')
  store.setColourMode('feature')
  store.setColourFeature('energy')
  expect(store.getSnapshot().colourFeature).toBe('energy')
  store.setColourFeature(null)
  expect(store.getSnapshot().derived.legend.kind).toBe('none')
})

test('copies filter and view inputs and rejects invalid selections or views', () => {
  const store = createAtlasStore()
  const filters = { ...EMPTY_FILTERS, tags: ['rock'] }
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
  const { store } = loaded()
  store.setSelection('test:1')
  store.setFilters({ ...EMPTY_FILTERS, text: 'ada' })
  store.setColourMode('cluster')
  store.startLoading()
  expect(store.getSnapshot()).toMatchObject({ atlas: null, selection: null, status: 'loading' })
  expect(store.getSnapshot().derived.visibleCount).toBe(0)
  store.setAtlas(validateAtlas(atlasInput()))
  expect(store.getSnapshot()).toMatchObject({ selection: null, filters: { text: 'ada' }, colourMode: 'cluster' })
  expect(store.getSnapshot().derived.visibleCount).toBe(2)
})

test('opens and closes the settings panel without recomputing anything', () => {
  const { store } = loaded()
  const derived = store.getSnapshot().derived
  store.setSettingsOpen(true)
  expect(store.getSnapshot().settingsOpen).toBe(true)
  expect(store.getSnapshot().derived).toBe(derived)
})
