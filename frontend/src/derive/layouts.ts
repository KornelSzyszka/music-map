import type { Atlas } from '../data/loader'

/** Which of the two exported layouts is shown: the one behind x and y, or the one behind alt_x and alt_y. */
export type LayoutChoice = 'primary' | 'alternate'

const LAYOUT_LABELS: Readonly<Record<string, string>> = { umap: 'UMAP', hierarchical: 'Clusters first' }

export function layoutLabel(name: string): string {
  return LAYOUT_LABELS[name] ?? name
}

/** True when every track and every cluster carries a second position. */
export function hasAlternateLayout(atlas: Atlas): boolean {
  return (
    atlas.tracks.length > 0 &&
    atlas.tracks.every((track) => track.alt_x !== undefined && track.alt_y !== undefined) &&
    atlas.clusters.every((cluster) => cluster.alt_x !== undefined && cluster.alt_y !== undefined)
  )
}

/**
 * The atlas seen through one layout. The alternate view swaps the two position pairs, so
 * everything downstream keeps reading x and y, and switching back is the same swap.
 */
export function withLayout(atlas: Atlas, choice: LayoutChoice): Atlas {
  if (choice === 'primary' || !hasAlternateLayout(atlas)) return atlas
  return {
    ...atlas,
    tracks: atlas.tracks.map((track) => ({ ...track, x: track.alt_x ?? track.x, y: track.alt_y ?? track.y, alt_x: track.x, alt_y: track.y })),
    clusters: atlas.clusters.map((item) => ({ ...item, x: item.alt_x ?? item.x, y: item.alt_y ?? item.y, alt_x: item.x, alt_y: item.y })),
  }
}
