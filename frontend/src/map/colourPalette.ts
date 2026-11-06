import {
  BASE,
  CLUSTER_BASE,
  GREY,
  HALO_BASE,
  SEQUENTIAL_BASE,
  SEQUENTIAL_STEPS,
  SERIES_SLOTS,
} from '../derive/colouring'

const GOLDEN_ANGLE = 137.508

type ColourStyles = Pick<CSSStyleDeclaration, 'getPropertyValue'>

function tokenColour(name: string, styles?: ColourStyles): string {
  if (!styles) return `var(${name})`
  const colour = styles.getPropertyValue(name).trim()
  if (!colour) throw new Error(`Missing CSS colour token "${name}"`)
  return colour
}

function clusterColour(index: number, styles?: ColourStyles): string {
  if (index < SERIES_SLOTS) return tokenColour(`--series-${index + 1}`, styles)
  const hue = ((index * GOLDEN_ANGLE) % 360).toFixed(3)
  return `hsl(${hue} 68% 50%)`
}

export function colourForSlot(slot: number, styles?: ColourStyles): string {
  if (slot === GREY) return tokenColour('--grey', styles)
  if (slot === BASE) return tokenColour('--base', styles)
  if (slot >= HALO_BASE) return clusterColour(slot - HALO_BASE, styles)
  if (slot >= CLUSTER_BASE) return clusterColour(slot - CLUSTER_BASE, styles)
  if (slot >= SEQUENTIAL_BASE && slot < SEQUENTIAL_BASE + SEQUENTIAL_STEPS) {
    return tokenColour(`--seq-${slot - SEQUENTIAL_BASE + 1}`, styles)
  }
  if (slot >= 0 && slot < SERIES_SLOTS) return tokenColour(`--series-${slot + 1}`, styles)
  return tokenColour('--grey', styles)
}
