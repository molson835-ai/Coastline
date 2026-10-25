# Coastline distance-based render culling

Status: implementation on the `perf/spatial-render-culling` branch; not merged or production-deployed.

## Design

- Keep detailed building facades for nearby play; swap distant buildings to a single body-mesh proxy, then cull beyond the proxy range.
- Keep detailed trees nearby; swap distant trees to one shared-geometry crown proxy, then cull beyond the tree range.
- Distance-cull non-player vehicles, pedestrians, wildlife, and bird flocks. The current player vehicle is always retained.
- Use a 180 ms update interval and 24-world-unit hysteresis to avoid doing a distance check on every frame and reduce threshold flicker.
- Respect explicit gameplay visibility overrides, including hiding a building exterior while its interior is open.
- Culling is render visibility only: it does not delete entities, remove collision data, alter save state, or stop simulation updates.

## Initial thresholds (world units)

| Category | Detailed range | Proxy/render range |
| --- | ---: | ---: |
| Buildings | 440 | 1,180 |
| Trees | 340 | 660 |
| Vehicles | 520 | 520 |
| Pedestrians | 220 | 220 |
| Wildlife | 340 | 340 |
| Bird flocks | 820 | 820 |

These are starting values for a controlled test, not claimed optimal values. Distant building and tree proxies do not cast shadows, which reduces shadow work but can make distant shadowing less detailed. Nearby detailed objects retain their existing materials and geometry.

## Diagnostics

The existing performance snapshot now includes `renderCulling` with update count, detailed roots, proxy roots, culled roots, and per-category counts.

Compare the same Android device, browser, route, player mode, and runtime window before/after:
- FPS, average frame time, p95 frame time, draw calls, triangles, heap, and render-pass timings.
- Facade/tree pop-in while approaching and leaving thresholds.
- Skyline, coast, bridge, road and terrain continuity.
- Current player vehicle visibility after entering/exiting vehicles and during world transitions.

Headless CI can verify logic and startup/regressions but is not evidence of physical-device FPS. Do not merge or deploy based on CI alone.

## Rollback

Revert the culling module/integration commit or use the parent revision. No scene geometry is deleted, so disabling the culler and removing the proxies restores the previous rendering path.
