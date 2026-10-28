import { describe, expect, it } from 'vitest'
import { validateFeatureGraph, validateFeatureSample } from './featureGraph'
import { makeGraph, makeSample } from './featureGraphFixture'

describe('validateFeatureGraph', () => {
  it('accepts a well-formed export unchanged', () => {
    const graph = makeGraph()
    expect(validateFeatureGraph(structuredClone(graph))).toEqual(graph)
  })

  it('rejects an unknown feature family', () => {
    const graph = structuredClone(makeGraph()) as unknown as { features: Array<{ family: string }> }
    graph.features[0].family = 'harmony'
    expect(() => validateFeatureGraph(graph)).toThrow(/features\[0\]\.family/)
  })

  it('rejects a histogram whose edges do not match its counts', () => {
    const graph = structuredClone(makeGraph())
    graph.features[0].histogram.edges.pop()
    expect(() => validateFeatureGraph(graph)).toThrow(/histogram/)
  })

  it('rejects an edge that names a missing feature', () => {
    const graph = structuredClone(makeGraph())
    graph.edges[0].target = 'nope'
    expect(() => validateFeatureGraph(graph)).toThrow(/edges\[0\]/)
  })

  it('rejects a genre profile with the wrong number of quantiles', () => {
    const graph = structuredClone(makeGraph())
    graph.features[0].genre_profile.rock = [1, 2]
    expect(() => validateFeatureGraph(graph)).toThrow(/genre_profile\.rock/)
  })

  it('rejects duplicate feature ids and non-finite numbers', () => {
    const duplicate = structuredClone(makeGraph())
    duplicate.features[1].id = duplicate.features[0].id
    expect(() => validateFeatureGraph(duplicate)).toThrow(/unique/)
    const infinite = structuredClone(makeGraph())
    infinite.features[0].power = Number.POSITIVE_INFINITY
    expect(() => validateFeatureGraph(infinite)).toThrow(/finite/)
  })
})

describe('validateFeatureGraph profiles', () => {
  it('rejects a genre histogram whose bin count differs from the histogram', () => {
    const graph = structuredClone(makeGraph())
    graph.features[0].genre_histogram.rock = [0.5, 0.5]
    expect(() => validateFeatureGraph(graph)).toThrow(/genre_histogram\.rock/)
  })

  it('rejects a malformed tag entry', () => {
    const graph = structuredClone(makeGraph()) as unknown as { features: Array<{ tag_profile: unknown[] }> }
    graph.features[0].tag_profile = [{ tag: 'rock', category: 'genre', mean_z: 'high', n: 3 }]
    expect(() => validateFeatureGraph(graph)).toThrow(/tag_profile\[0\]\.mean_z/)
  })
})

describe('validateFeatureSample', () => {
  it('accepts a well-formed sample unchanged', () => {
    const sample = makeSample()
    expect(validateFeatureSample(structuredClone(sample))).toEqual(sample)
  })

  it('rejects a row with the wrong number of values', () => {
    const sample = structuredClone(makeSample())
    sample.values[1] = [1]
    expect(() => validateFeatureSample(sample)).toThrow(/values\[1\]/)
  })

  it('rejects genres that do not match the rows', () => {
    const sample = structuredClone(makeSample())
    sample.genres.pop()
    expect(() => validateFeatureSample(sample)).toThrow(/genres/)
  })

  it('rejects non-finite values', () => {
    const sample = structuredClone(makeSample())
    sample.values[0][0] = Number.NaN
    expect(() => validateFeatureSample(sample)).toThrow(/finite/)
  })
})
