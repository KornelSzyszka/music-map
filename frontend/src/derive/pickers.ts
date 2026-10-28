import type { Option } from './options'

export interface PickerOption extends Option {
  readonly disabled?: boolean
}

export const MAX_SUGGESTIONS = 40

/** Options matching a typed query: names that start with it first, then names that contain it. */
export function filterOptions(options: readonly PickerOption[], query: string, limit = MAX_SUGGESTIONS): PickerOption[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return options.slice(0, limit)
  const starts: PickerOption[] = []
  const contains: PickerOption[] = []
  for (const option of options) {
    const label = option.label.toLowerCase()
    if (label.startsWith(needle)) starts.push(option)
    else if (label.includes(needle)) contains.push(option)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

/** Next enabled index in a direction, wrapping around; -1 when nothing can be chosen. */
export function stepIndex(current: number, delta: 1 | -1, options: readonly { readonly disabled?: boolean }[]): number {
  const count = options.length
  if (count === 0) return -1
  for (let step = 1; step <= count; step += 1) {
    const index = (((current + delta * step) % count) + count) % count
    if (!options[index].disabled) return index
  }
  return -1
}

/** First or last enabled index, for Home and End. */
export function edgeIndex(edge: 'first' | 'last', options: readonly { readonly disabled?: boolean }[]): number {
  const indices = options.map((_, index) => index).filter((index) => !options[index].disabled)
  if (indices.length === 0) return -1
  return edge === 'first' ? indices[0] : indices[indices.length - 1]
}
