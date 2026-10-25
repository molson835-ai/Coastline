# Coastline fog and view-distance A/B diagnostic

Status: opt-in diagnostics only; no default visual-quality change intended.

## URL parameters

- `diagFog=baseline` — existing density (`0.00085`); this is the default.
- `diagFog=soft` — density `0.00105`.
- `diagFog=balanced` — density `0.0013`.
- `diagFog=dense` — density `0.00165`.
- `diagFog=off` — density `0`.
- `diagView=1400|1200|1000|800|650` — camera far plane in world units. Invalid values fall back to 1400.
- Existing `diagShadows=off` can be combined with these parameters for controlled comparisons.

Examples:

- Baseline: `game-v3.html`
- Balanced fog only: `game-v3.html?diagFog=balanced`
- Balanced fog + shorter view: `game-v3.html?diagFog=balanced&diagView=800`
- Same view/fog with shadows off: `game-v3.html?diagFog=balanced&diagView=800&diagShadows=off`

The diagnostics report now includes fog mode, fog density, and camera far distance alongside existing shadow and pixel-ratio data.

## Important interpretation

Fog is a visual fade, not a culling mechanism. A shorter camera far plane can reduce rendering of objects beyond the view frustum, but fog density and camera distance must be tested separately. Do not ship denser fog or a shorter view distance as a default based on FPS alone: compare road/building pop-in, coast/bridge skyline continuity, shadow quality, draw calls, triangles, average frame time and p95 frame time on the same device and route.

## Suggested device test matrix

Use the same Android device, browser, viewport, vehicle mode, route, and runtime window for each run:

1. Baseline: no diagnostic parameters.
2. Fog only: `diagFog=soft`, then `balanced`.
3. View distance only: `diagView=1200`, then `1000`, then `800`.
4. Combined: best acceptable fog with each promising view distance.
5. Repeat the promising combinations with `diagShadows=off` only as a diagnostic control.

Record FPS, average/p95 frame time, draw calls, triangles, heap, camera far/fog density, and whether buildings visibly pop or skyline/bridge silhouettes disappear. GPU timing may be unsupported on mobile Chrome; do not label CPU submit time as GPU execution time.

## Safety boundary

This PR is a measurement tool. It does not merge to production, change the default fog density, or reduce the default camera far plane. Do not treat it as proof that fog itself improves frame rate.
