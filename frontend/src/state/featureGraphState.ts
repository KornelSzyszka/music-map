import type { FeatureFamily } from '../data/featureGraph'

export const DETAIL_TABS = ['distribution', 'genres', 'quartiles', 'tags', 'compare'] as const
export type DetailTab = (typeof DETAIL_TABS)[number]

export const MAX_HIGHLIGHTED_GENRES = 3

export interface FeatureGraphState {
  selected: string | null
  hovered: string | null
  hiddenFamilies: ReadonlySet<FeatureFamily>
  tab: DetailTab
  /** Feature on the other axis of the compare scatter; null means "most correlated". */
  compareId: string | null
  /** Genres drawn in colour in the compare scatter; null means "lowest and highest median". */
  highlighted: readonly string[] | null
}

export type FeatureGraphAction =
  | { type: 'select'; id: string | null }
  | { type: 'hover'; id: string | null }
  | { type: 'toggleFamily'; family: FeatureFamily }
  | { type: 'showAllFamilies' }
  | { type: 'setTab'; tab: DetailTab }
  | { type: 'setCompare'; id: string | null }
  | { type: 'toggleGenre'; genre: string; current: readonly string[] }

export const initialFeatureGraphState: FeatureGraphState = {
  selected: null,
  hovered: null,
  hiddenFamilies: new Set(),
  tab: 'distribution',
  compareId: null,
  highlighted: null,
}

export function featureGraphReducer(
  state: FeatureGraphState,
  action: FeatureGraphAction,
): FeatureGraphState {
  switch (action.type) {
    case 'select':
      // A new selection starts from the automatic compare feature and genres.
      return state.selected === action.id
        ? { ...state, selected: null }
        : { ...state, selected: action.id, compareId: null, highlighted: null }
    case 'hover':
      return { ...state, hovered: action.id }
    case 'toggleFamily': {
      const hiddenFamilies = new Set(state.hiddenFamilies)
      if (hiddenFamilies.has(action.family)) hiddenFamilies.delete(action.family)
      else hiddenFamilies.add(action.family)
      return { ...state, hiddenFamilies }
    }
    case 'showAllFamilies':
      return { ...state, hiddenFamilies: new Set() }
    case 'setTab':
      return { ...state, tab: action.tab }
    case 'setCompare':
      return { ...state, compareId: action.id }
    case 'toggleGenre': {
      const { current, genre } = action
      if (current.includes(genre)) {
        return { ...state, highlighted: current.filter((item) => item !== genre) }
      }
      // At most three genres stay coloured; the oldest one makes room for the new one.
      const next = [...current, genre]
      return { ...state, highlighted: next.slice(-MAX_HIGHLIGHTED_GENRES) }
    }
  }
}
