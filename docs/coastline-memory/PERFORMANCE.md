# Coastline — Performance

## Baseline
Representative Android telemetry available on 2026-10-20:

| Metric | Baseline |
|---|---:|
| FPS | 17 |
| Average frame | 61.78 ms |
| P95 frame | 66.8 ms |
| Render category | 53.2 ms |
| Draw calls | 3,233 |
| Triangles | 2,060,157 |
| Geometries | 15,329 |
| Textures | 75 |
| JS heap used | 214.6 MB |
| Buildings | 48 |
| Vehicles | 81 |
| Pedestrians | 110 |
| Trees | 74 |

CPU category timings were comparatively small. The measured render category dominated the frame.

## Targets
- First: 25+ FPS on representative Android.
- Next: 30+ FPS.
- Do not achieve the target through blanket visual downgrades.

## Optimization queue
1. Spatial visibility/cell bucketing.
2. Render-object census.
3. Static instancing/BatchedMesh where geometry/material compatibility permits.
4. Cell-level HLOD.
5. Frustum and occlusion/screen-importance selection.
6. Shared geometry/material/texture resources.
7. Shadow/post-processing optimization after measurement.
8. Reinvest recovered budget into fidelity.

## Experiment protocol
For a meaningful performance change:
- capture baseline
- identify the measured bottleneck
- change one coherent architecture layer
- run focused local tests
- run a representative benchmark
- compare draw calls, triangles, geometries, render time, p95 frame, and visual quality
- only then move to the next layer

## Important history
Spatial visibility bucketing was improved so cells can be rejected by minimum cell-to-player distance before exact object distance tests. Static records remain bucketed, dynamic records re-bucket on cell crossing, and critical records remain considered.

A prior fleet test failure was a stale test assumption about fixed vehicle array indexes. The test was changed to assert authoritative behavior instead.

## Future census
Classify renderer objects as HERO, NEAR, MID, FAR, HLOD, INTERACTIVE, or COLLISION ONLY. Use that census to target draw-call reduction while protecting the immediate visual contract.
