# Coastline Runtime Performance Audit — 2026-10-24

## Status

Investigation only. No optimization or visual-quality reduction has been made as part of this audit. Keep the CTM repair separate, do not merge automatically, and do not request a Vercel deployment for diagnostic work.

## Real-device baseline supplied by player

- Android 10 / Chrome 155, viewport 384 × 721, reported device pixel ratio 2.8125.
- 132 seconds of runtime, vehicle mode, no captured runtime errors.
- Snapshot: 59 FPS, 16.8 ms average and p95 frame time, loading 2,186 ms.
- Entities: 48 buildings, 81 vehicles, 110 pedestrians, 74 trees.
- Reported renderer memory counters: 15,381 geometries, 77 textures.
- The current low-power detection should cap renderer pixel ratio at 0.9 for this viewport; device-reported DPR is not the effective render DPR.
- The snapshot's 59 FPS is a good point-in-time result, not proof that sustained driving or transition loads have no spikes.

## Source-level findings to test

1. `updatePedestrians(dt)` iterates all pedestrians and scans the full vehicle list twice per pedestrian: once for nearby fast-vehicle threat selection and once for collision checks. With the reported population, that is up to roughly 17,820 pedestrian/vehicle distance checks per simulation frame before other pedestrian work. This is a concrete candidate, not yet proven to be the dominant bottleneck.
2. `updateAI(dt)` updates every eligible AI vehicle each frame; no distance-based LOD is applied in that loop.
3. After simulation updates, the main loop synchronizes moving vehicles and pedestrians into `worldArchitecture.runtime`. Each `runtime.move` updates a spatial hash and chunk bookkeeping. This may be redundant if those registry positions are not needed every frame by active consumers; usage must be checked before changing it.
4. The city scene creates many individual meshes/geometries, including storefront facade details and road markings. The geometry counter is unusually high, but the source-level count alone does not establish whether geometry creation, draw calls, GPU triangles, or memory pressure is responsible.
5. The CTM can hide the city root while the city world is inactive. Hiding does not dispose the city resources; this is an intentional residency trade-off and should not be changed without measuring transition latency and reactivation behavior.

## Diagnostic change

PR #92 corrects draw-call/triangle telemetry across the full EffectComposer frame. PR #93 adds rolling per-subsystem timing samples (average, p95, max, and sample count) for AI/traffic, pedestrians, world registry synchronization, rendering, environment, wildlife/debris, map drawing, player movement, camera/HUD, and related work. These are diagnostics only; they do not alter simulation or rendering settings.

## Next steps

1. Run the new Playwright telemetry assertions in CI before relying on the new timing fields.
2. Collect a fresh real-device report using the same route and duration, preferably during continuous driving and again after a world transition.
3. Compare subsystem p95/max values with frame-time spikes.
4. Only then test one minimal optimization at a time, with behavior/CTM tests and the same visual settings.
5. Preserve the current world size, visuals, NPC counts, and shadow/post-processing quality unless measured evidence shows a specific safe adjustment is necessary.

## Verification caveat

The source-level hypotheses above are not a measured root-cause conclusion. Do not mark the performance issue fixed until fresh device evidence shows which subsystem is responsible and a repeat test demonstrates improvement.


## Follow-up optimization candidate — pedestrian broad phase and population

- Implemented on branch `perf/pedestrian-spatial-broadphase-and-population`, stacked on the diagnostic branch so subsystem telemetry remains available for the before/after comparison.
- Ambient pedestrian population reduced from 110 to 44 (60% reduction), while keeping the same pedestrian model, activity behavior, collisions, fleeing logic, and social-rumor initialization for the remaining residents.
- Each active pedestrian now queries the existing world spatial registry for candidate vehicles within a 12-unit broad-phase radius, then runs the original exact live-position distance and speed checks on those candidates. The 12-unit radius is deliberately wider than the 8-unit flee radius and 2.8-unit collision radius to tolerate the registry's end-of-frame position synchronization.
- A single vehicle-id lookup map avoids scanning the full vehicle array to resolve spatial-query candidates.
- No graphics, shadows, post-processing, world dimensions, or vehicle count were changed.
- Validation plan: Playwright startup/state test, existing gameplay and NPC collision/reaction tests, then a repeated Android drive test with the same visual settings. The change is not considered verified until CI and device-side before/after results are reviewed.
