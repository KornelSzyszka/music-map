import type { FeatureGraph, FeatureNode, FeatureSample } from './featureGraph'

export function makeNode(overrides: Partial<FeatureNode> = {}): FeatureNode {
  return {
    id: 'rhythm.bpm',
    label: 'bpm',
    family: 'rhythm',
    x: 0.5,
    y: -0.5,
    power: 0.2,
    stats: { min: 60, p25: 100, median: 120, p75: 140, max: 190, mean: 121, std: 25, skew: 0.1 },
    histogram: { edges: [60, 100, 140, 180], counts: [10, 30, 20], below: 2, above: 3 },
    genre_profile: { rock: [90, 105, 120, 135, 150], jazz: [70, 90, 100, 120, 140] },
    genre_histogram: { rock: [0.2, 0.5, 0.3], jazz: [0.5, 0.4, 0.1] },
    tag_profile: [
      { tag: 'trance', category: 'genre', mean_z: 0.44, n: 1528 },
      { tag: 'hiphop', category: 'genre', mean_z: -0.42, n: 2657 },
    ],
    ...overrides,
  }
}

export function makeSample(): FeatureSample {
  return {
    feature_set_id: 'test-v1',
    features: ['rhythm.bpm', 'lowlevel.mfcc.mean[0]'],
    genres: ['rock', 'jazz', null, 'rock'],
    values: [
      [100, -10],
      [120, -8],
      [140, -6],
      [160, -4],
    ],
  }
}

export function makeGraph(): FeatureGraph {
  return {
    feature_set_id: 'test-v1',
    genre_quantiles: [10, 25, 50, 75, 90],
    min_abs_correlation: 0.7,
    track_count: 65,
    features: [
      makeNode(),
      makeNode({ id: 'lowlevel.mfcc.mean[0]', label: 'mfcc 0 (mean)', family: 'mfcc', x: -1, y: 1, power: 0.4 }),
      makeNode({ id: 'tonal.key_strength', label: 'key strength', family: 'tonal', x: 0, y: 0, power: 0 }),
    ],
    edges: [{ source: 'rhythm.bpm', target: 'lowlevel.mfcc.mean[0]', r: -0.82 }],
  }
}
