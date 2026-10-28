import { describe, expect, test } from 'vitest'
import { edgeIndex, filterOptions, stepIndex, type PickerOption } from './pickers'

const options: PickerOption[] = [
  { value: 'a', label: 'Rock' },
  { value: 'b', label: 'Punk rock' },
  { value: 'c', label: 'Jazz' },
  { value: 'd', label: 'Rockabilly' },
]

describe('filterOptions', () => {
  test('returns the first options for an empty query, up to the limit', () => {
    expect(filterOptions(options, '', 2).map((o) => o.value)).toEqual(['a', 'b'])
    expect(filterOptions(options, '   ').map((o) => o.value)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('puts names that start with the query before names that only contain it', () => {
    expect(filterOptions(options, 'rock').map((o) => o.value)).toEqual(['a', 'd', 'b'])
  })

  test('ignores case and gives nothing for an unknown query', () => {
    expect(filterOptions(options, 'JAZ').map((o) => o.value)).toEqual(['c'])
    expect(filterOptions(options, 'zzz')).toEqual([])
  })

  test('caps the number of suggestions', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ value: String(i), label: `tag ${i}` }))
    expect(filterOptions(many, 'tag')).toHaveLength(40)
  })
})

describe('keyboard stepping', () => {
  const mixed = [{ disabled: false }, { disabled: true }, { disabled: false }, { disabled: true }]

  test('moves to the next enabled option and wraps around', () => {
    expect(stepIndex(0, 1, mixed)).toBe(2)
    expect(stepIndex(2, 1, mixed)).toBe(0)
    expect(stepIndex(0, -1, mixed)).toBe(2)
    expect(stepIndex(2, -1, mixed)).toBe(0)
  })

  test('returns -1 when nothing is selectable', () => {
    expect(stepIndex(0, 1, [])).toBe(-1)
    expect(stepIndex(0, 1, [{ disabled: true }])).toBe(-1)
  })

  test('finds the first and last enabled option', () => {
    expect(edgeIndex('first', mixed)).toBe(0)
    expect(edgeIndex('last', mixed)).toBe(2)
    expect(edgeIndex('first', [{ disabled: true }])).toBe(-1)
  })
})
