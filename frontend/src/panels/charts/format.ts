/** Compact number formatting for axis labels and statistics. */
export function formatNumber(value: number): string {
  if (value === 0) return '0'
  const magnitude = Math.abs(value)
  if (magnitude >= 1000) return value.toFixed(0)
  if (magnitude >= 10) return value.toFixed(1)
  if (magnitude >= 0.01) return value.toFixed(3)
  return value.toExponential(2)
}

/** Colour slot for a highlighted genre; the first three slots validate for scatter plots. */
export function genreSlot(genre: string | null, highlighted: readonly string[]): number | null {
  if (genre === null) return null
  const index = highlighted.indexOf(genre)
  return index < 0 ? null : index
}
