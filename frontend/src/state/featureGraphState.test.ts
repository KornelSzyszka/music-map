import { describe, expect, it } from 'vitest'
import { featureGraphReducer, initialFeatureGraphState } from './featureGraphState'

describe('featureGraphReducer', () => {
  it('selects a feature and deselects it on a second click', () => {
    const selected = featureGraphReducer(initialFeatureGraphState, { type: 'select', id: 'a' })
    expect(selected.selected).toBe('a')
    expect(featureGraphReducer(selected, { type: 'select', id: 'a' }).selected).toBeNull()
    expect(featureGraphReducer(selected, { type: 'select', id: 'b' }).selected).toBe('b')
  })

  it('tracks hover independently of selection', () => {
    const state = featureGraphReducer(initialFeatureGraphState, { type: 'hover', id: 'a' })
    expect(state.hovered).toBe('a')
    expect(state.selected).toBeNull()
  })

  it('toggles a family without mutating the previous state', () => {
    const hidden = featureGraphReducer(initialFeatureGraphState, { type: 'toggleFamily', family: 'mfcc' })
    expect(hidden.hiddenFamilies.has('mfcc')).toBe(true)
    expect(initialFeatureGraphState.hiddenFamilies.has('mfcc')).toBe(false)
    expect(featureGraphReducer(hidden, { type: 'toggleFamily', family: 'mfcc' }).hiddenFamilies.size).toBe(0)
  })

  it('shows all families again', () => {
    const hidden = featureGraphReducer(initialFeatureGraphState, { type: 'toggleFamily', family: 'tonal' })
    expect(featureGraphReducer(hidden, { type: 'showAllFamilies' }).hiddenFamilies.size).toBe(0)
  })

  it('keeps the chosen tab across selections but resets the compare choices', () => {
    let state = featureGraphReducer(initialFeatureGraphState, { type: 'select', id: 'a' })
    state = featureGraphReducer(state, { type: 'setTab', tab: 'compare' })
    state = featureGraphReducer(state, { type: 'setCompare', id: 'b' })
    state = featureGraphReducer(state, { type: 'toggleGenre', genre: 'rock', current: [] })
    expect(state).toMatchObject({ tab: 'compare', compareId: 'b', highlighted: ['rock'] })
    const next = featureGraphReducer(state, { type: 'select', id: 'c' })
    expect(next).toMatchObject({ tab: 'compare', compareId: null, highlighted: null })
  })

  it('colours at most three genres, dropping the oldest', () => {
    let state = initialFeatureGraphState
    let current: readonly string[] = []
    for (const genre of ['a', 'b', 'c', 'd']) {
      state = featureGraphReducer(state, { type: 'toggleGenre', genre, current })
      current = state.highlighted ?? []
    }
    expect(state.highlighted).toEqual(['b', 'c', 'd'])
    state = featureGraphReducer(state, { type: 'toggleGenre', genre: 'c', current })
    expect(state.highlighted).toEqual(['b', 'd'])
  })
})
