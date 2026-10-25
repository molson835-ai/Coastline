# Selective shadow-culling handoff — 2026-10-25

## State

- Work branch: `perf/selective-shadow-culling`
- Base: `perf/spatial-render-culling`, PR #102 (draft and unmerged)
- Intended PR: draft stacked on PR #102
- Production deployment / merge: not performed or authorized
- Code changes in this branch: distance-aware shadow-caster toggles in `render-culling.js`, category shadow ranges in `game-v3.html`, unit tests, and this handoff/performance note.

## Evidence motivating the change

Android Chrome 155 on Android 10, 384×721 viewport, pixel ratio 2.8125, vehicle mode:

| Diagnostic | FPS | Average frame | p95 frame | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline, shadows off | 55 | 18.06 ms | 33.3 ms | 1,306 | 866,515 |
| Balanced fog + view 800, shadows off | 47 | 21.38 ms | 33.4 ms | 1,379 | 867,815 |
| Balanced fog + view 800, shadows on | 34 | 30.13 ms | 33.4 ms | 3,750 | 1,360,376 |

The runs were separate and not perfectly controlled. GPU timer queries were unsupported. CPU scene submission and render timings dominated the measured work, while gameplay-system timings were small. These results justify testing selective shadow casting but do not establish that shadows are the only bottleneck.

## Implementation

The existing shadow map remains enabled at its existing size. Full detail, materials, and shadow receiving are preserved. For culler-managed detailed roots, only the `castShadow` flag is toggled according to player distance:

- Buildings: 210 world units
- Trees: 150 world units
- Vehicles: 140 world units
- Pedestrians: 85 world units
- Wildlife: 100 world units

The culler caches each tracked root's initially shadow-casting meshes and changes flags only when the shadow state transitions. It reuses the culler's throttled update and hysteresis. Distant building/tree proxies already do not cast shadows. The current player vehicle is always retained and is located at the player's position during normal play. Shadow receiving is not changed.

Performance diagnostics now report `trackedShadowCastersEnabled` and `trackedShadowCastersDisabled`; these count casters in culler-managed roots only, not every scene caster.

## Tests and next steps

New tests cover shadow-caster distance cutoffs, hysteresis, re-enabling shadows on approach, and retaining detailed geometry beyond shadow range. Run the engine and browser suites on the final PR head; do not infer test success from the existence of test code.

After CI, use the same Android device, route, vehicle mode, and 50–60 second runtime with shadows enabled. Export the diagnostic report and visually inspect buildings, trees, vehicles, pedestrian shadows, and shadow pop-in at range boundaries. Compare FPS, average/p95 frame time, draw calls, triangles, heap, and runtime errors.

If shadows improve but pop-in is objectionable, adjust category ranges in small increments and repeat the same route. Do not disable all shadows or reduce visual fidelity as a first resort. Do not merge or promote until CI and real-device/visual validation are reviewed.
