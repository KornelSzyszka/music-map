import { expect, test } from 'vitest'
import { CLUSTER_BASE, HALO_BASE, SEQUENTIAL_BASE } from '../derive/colouring'
import { colourForSlot } from './colourPalette'

test('cluster colours remain stable beyond the theme series palette', () => {
  const firstGenerated = colourForSlot(CLUSTER_BASE + 7)
  expect(firstGenerated).toMatch(/^hsl\(/)
  expect(colourForSlot(CLUSTER_BASE + 7)).toBe(firstGenerated)
  expect(colourForSlot(CLUSTER_BASE + 8)).not.toBe(firstGenerated)
  expect(colourForSlot(HALO_BASE + 7)).toBe(firstGenerated)
})

test('slot ranges keep cluster colours separate from feature colours', () => {
  expect(colourForSlot(CLUSTER_BASE + 10)).not.toBe(
    `var(--seq-${CLUSTER_BASE + 10 - SEQUENTIAL_BASE + 1})`,
  )
  expect(colourForSlot(CLUSTER_BASE + 6)).toBe('var(--series-7)')
  expect(colourForSlot(SEQUENTIAL_BASE)).toBe('var(--seq-1)')
})

test('canvas colors resolve theme tokens to concrete CSS colors', () => {
  const tokens: Record<string, string> = {
    '--grey': '#777777',
    '--base': '#888888',
    '--series-1': '#112233',
    '--seq-1': '#223344',
  }
  const styles = { getPropertyValue: (name: string) => tokens[name] ?? '' }

  expect(colourForSlot(CLUSTER_BASE, styles)).toBe('#112233')
  expect(colourForSlot(HALO_BASE, styles)).toBe('#112233')
  expect(colourForSlot(SEQUENTIAL_BASE, styles)).toBe('#223344')
  expect(colourForSlot(-1, styles)).toBe('#777777')
  expect(colourForSlot(-2, styles)).toBe('#888888')
  expect(colourForSlot(CLUSTER_BASE, styles)).not.toContain('var(')
})

test('missing theme colors fail explicitly when resolving canvas colors', () => {
  expect(() => colourForSlot(CLUSTER_BASE, { getPropertyValue: () => '' })).toThrow(
    'Missing CSS colour token "--series-1"',
  )
})
