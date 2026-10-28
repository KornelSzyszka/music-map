# Synthetic atlas fixture

These 2,000 fictional tracks contain no downloaded music or metadata. The manifest
uses schema 0.1 and seed 42. Tracks, clusters and neighbours use the same gzip JSON
filenames as the pipeline export. The loader handles both HTTP-decoded responses
and raw gzip bytes from a static server.

Five Gaussian map clouds are illustrative positions, not a projection quality
claim. Noise tracks have a null cluster id. Features are synthetic BPM and energy.
The five neighbours per track use Euclidean distance over those two features,
standardised using population means and standard deviations over all 2,000 tracks.
They are independent of map distances. Distances are rounded to six decimals.

`src/data/fixture.test.ts` checks the shipped files against the loader contract,
point count, noise, tag coverage and feature-space neighbour distances. This is
test data for frontend development, not evidence about real music or rendering
performance at the intended dataset scale.
