# Map

`AtlasMap.tsx` is the frontend-base task's minimal Canvas 2D renderer. It reads
cached colours and the visibility mask from the store; interactions update only
store state. Coordinates remain in atlas units with positive Y upwards.

Click picks a visible point within ten logical canvas pixels. Arrow keys pan,
plus/minus zoom, Home fits the complete atlas, Enter picks at the map centre,
and Escape clears selection. The controls also expose zoom and fit buttons.
The canvas scales to its container while retaining a 960 by 600 drawing buffer.

`geometry.ts` owns the fit and inverse transforms used for drawing and picking.
Picking is a map interaction, not musical similarity: musical neighbours come
from the exported feature-space distances. The render spike still decides the
final renderer and measures performance at the intended dataset scale.
