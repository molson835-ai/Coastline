# Coastline Performance Budget

Last reviewed: 2026-10-13. These are engineering targets, not claims that current builds already meet them.

## Initial targets

| Metric | Target / guardrail | Measurement notes |
| --- | --- | --- |
| Mobile frame rate | Aim for 30 FPS or better on a representative mid-range phone | Validate with a real-device playtest; CI headless FPS is not representative. |
| Mobile frame time | p95 at or below 33.3 ms | Use rolling samples while driving in a repeatable route; note browser, device, and quality settings. |
| Desktop frame rate | Aim for 60 FPS where hardware allows | Treat as a goal, not a universal guarantee. |
| First rendered frame | Aim for 8 seconds or less on a representative mobile connection/device | Report actual first-frame time and distinguish it from network transfer time. |
| JavaScript heap | Track used/limit where browser exposes `performance.memory` | Unsupported browsers must report `null`; do not infer total GPU or process memory. |
| Active simulation | Initial reference: 54 vehicles, 110 pedestrians, 34 buildings plus scenery | Counts are telemetry baselines, not recommended final active counts. Profile before increasing them. |
| Renderer work | Track draw calls, triangles, geometries, textures | Establish a real-device baseline before setting strict numeric ceilings. |
| Runtime errors | Zero uncaught page errors during the release checklist | Console noise from unrelated browser features must be reviewed, not blindly ignored. |

## Telemetry contract

The in-game bug report and `window.__coastlineTest.state().performance` should expose:

- `fps`, `averageFrameMs`, `p95FrameMs`, `loadingMs`
- `deviceMemoryGb`, `jsHeapUsedMb`, `jsHeapLimitMb` (nullable when unsupported)
- `drawCalls`, `triangles`, `geometries`, `textures`
- counts for buildings, vehicles, pedestrians, and trees

Frame time is calculated from a rolling window of up to 120 animation-frame intervals. The browser heap API is non-standard and does not include all GPU or browser-process memory. `loadingMs` measures from the beginning of the game module to its first rendered frame, not a full network waterfall.

## Optimization order

1. Capture baseline on desktop and a real phone using the same route and play duration.
2. Reduce repeated all-entity work with nearby-agent/spatial queries.
3. Reuse geometry/materials and instance repeated props when profiling supports it.
4. Introduce distance-based simulation/visibility and region streaming.
5. Re-measure before increasing traffic, pedestrians, vegetation, or map size.

## CI policy

CI validates telemetry shape and guards against missing/invalid measurements. Avoid hard FPS gates in software-rendered headless CI; use those tests for regressions in behavior and metrics availability. Tight numeric thresholds can be introduced after a stable baseline is captured on agreed hardware.

## Selective shadow-caster budget (2026-10-25)

The Android diagnostic reports showed a strong association between the existing 4096 shadow map and higher scene submission cost. With shadows disabled, a baseline run recorded 55 FPS / 18.06 ms average frame time / 1,306 draw calls / 866,515 triangles. A separate run with balanced fog and 800-unit view distance but shadows enabled recorded 34 FPS / 30.13 ms / 3,750 draw calls / 1,360,376 triangles. Runs were separate and are not a fully controlled benchmark; the figures are evidence for testing, not proof that shadows alone explain every difference.

The draft selective-shadow change keeps the existing shadow map, full-resolution nearby geometry, materials, and shadow receiving behavior. It disables **shadow casting only** for tracked detailed roots beyond category-specific distances, and restores it as objects approach. Shadow toggles use the culler's existing throttled update and hysteresis to reduce flicker.

| Category | Shadow-casting range |
| --- | ---: |
| Buildings | 210 world units |
| Trees | 150 world units |
| Vehicles | 140 world units |
| Pedestrians | 85 world units |
| Wildlife | 100 world units |

These are conservative initial test values, not final tuning. Building/tree LOD proxies already do not cast shadows. The current player vehicle stays detailed and inside its own shadow range. The diagnostic snapshot exposes `trackedShadowCastersEnabled` and `trackedShadowCastersDisabled` for culler-managed roots; these are not a count of every shadow caster in the scene.

Validation requirements: run engine tests and browser regression tests; then repeat the same Android route and 50–60 second window with shadows enabled. Compare FPS, average/p95 frame time, draw calls, triangles, and visual shadow pop-in around the distance boundaries. Do not merge or promote based on CI alone.
