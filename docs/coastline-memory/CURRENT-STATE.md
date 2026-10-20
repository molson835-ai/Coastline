# Coastline — Current State

**Snapshot date:** 2026-10-20
**Memory branch:** `coastline-project-memory`
**Memory branch head at snapshot start:** `f521dda416fb6c9055e19ad79872cbbb04f828f4`

## Active work
Mega Patch 2: sandbox/gameplay foundation, authoritative authored vehicle, and render-performance architecture.

## Verified/known baseline
Latest representative mobile telemetry available to the project memory:
- 17 FPS
- 61.78 ms average frame
- 66.8 ms p95 frame
- 53.2 ms render category
- 3,233 draw calls
- 2,060,157 triangles
- 15,329 geometries
- 75 textures
- 214.6 MB JS heap used
- 48 buildings
- 81 vehicles
- 110 pedestrians
- 74 trees
- 29 vehicles rendered
- 14 detailed buildings
- 4.55 s loading time
- no runtime errors in that telemetry

Interpretation: rendering is the dominant measured bottleneck; CPU category timings were comparatively small. This is a baseline, not a claim about every device or current deployment.

## Mega Patch 2 gates
1. Sandbox/gameplay foundation
2. Vehicle/controls/authoritative authored asset
3. Render performance architecture
4. World/physics/visual regression

## Immediate performance sequence
1. Finish/verify spatial visibility foundation.
2. Census render objects and classify HERO / NEAR / MID / FAR / HLOD / INTERACTIVE / COLLISION ONLY.
3. Target static building detail, road markings, street props, signs, fences, trim, and distant environment for BatchedMesh/instancing where compatible.
4. Establish cell-level HLOD: detailed -> merged/proxy -> far representation.
5. Combine distance, frustum, occlusion/screen importance, and interaction priority.
6. Spend recovered renderer budget on higher-quality characters, vegetation, cars, buildings, traffic, animals, weather, lighting, and interiors.

## Current resource posture
Treat GitHub Actions, Vercel deployments, browser automation, external APIs, and AI context as limited resources. Prefer local deterministic checks and one meaningful beta cycle after a batch of changes.

## Important caution
Do not overwrite this snapshot with newer values unless those values are actually verified. New measurements belong here as the new dated current snapshot and older measurements should remain in PERFORMANCE.md/CHANGELOG.md as historical evidence.
