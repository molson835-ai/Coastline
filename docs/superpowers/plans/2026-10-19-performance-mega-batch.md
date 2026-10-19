# Coastline Performance Mega Batch v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Coastline's measured mobile frame-time and draw-call costs while preserving player-car and near-field visual quality and approved gameplay.

**Architecture:** First establish trustworthy baseline and category diagnostics, then use evidence to prioritize spatial visibility, repeated-object batching/instancing, and distant-entity scheduling. Reuse existing Fidelity Core helpers only after verifying they are actually wired to the active runtime; keep rendering changes independent from collision and gameplay state.

**Tech Stack:** JavaScript ES modules, Three.js, Node.js test runner, existing Playwright tests, Vercel preview when quota permits.

**Spec:** `docs/superpowers/specs/2026-10-19-performance-mega-batch-design.md`

## Global Constraints

- Preserve current or better player vehicle and meaningful near-field visual quality.
- Do not globally reduce textures/resolution/effects or substitute a cheaper player vehicle as a performance shortcut.
- Keep collision/gameplay representations independent from render batching where needed.
- Preserve driving, traffic, exploration, vehicle damage/collision, and the single garage.
- Do not restore deferred missions, pedestrian interaction, discovery labels, map UI, or background activity systems.
- Do not merge to main or promote a beta alias as part of implementation.
- Never claim a live performance win without a verified same-scene before/after device comparison.

## Review Focus

- Near-field camera and scene transitions: no visible detail popping or missing props.
- Cell boundaries and objects spanning cells: no duplicate meshes, holes, or persistent stale objects.
- Shared/instanced resource disposal: no use-after-dispose, leaking GPU resources, or unintended cross-instance material changes.
- Vehicle GLB hierarchy/material variations: preserve player vehicle appearance, wheel animation, steering, and lights.
- Hidden/streamed visual objects: collision and driving queries must remain correct.

---

### Task 1: Trustworthy baseline and low-overhead diagnostics

**Files:**
- Modify: `game-v3.html` only after locating the current diagnostics/render loop.
- Modify or create focused tests under `tests/`, following existing Node test conventions.
- Inspect: `coastline-fidelity-budget.js`, `coastline-render-config.js`, and existing diagnostics modules before adding new ones.

**Interfaces:**
- Consume the existing renderer, scheduler, and diagnostics interfaces after confirming their current signatures.
- Produce a versioned performance snapshot with frame-time percentiles, draw calls, triangles, geometry count, heap when available, and per-category counters/timings where practical.

- [ ] **Step 1: Write failing diagnostic contract tests.** Assert snapshot schema/version, safe handling when performance APIs are absent, and counters for render/world/traffic/pedestrian/collision/animation/audio categories without requiring every category to exist on every frame.
- [ ] **Step 2: Run the focused test and confirm it fails for the missing contract.**
- [ ] **Step 3: Implement the smallest low-overhead diagnostic hook.** Avoid repeated scene traversal solely for metrics; reuse renderer statistics and existing scheduler instrumentation.
- [ ] **Step 4: Run focused test plus `npm run test:fidelity` and `npm run test:adaptive-budget`.**
- [ ] **Step 5: Record the supplied Android baseline explicitly:** 9 FPS, 218.54 ms average frame time, 399.8 ms p95, 8,390 draw calls, 1,533,554 triangles, 3,783 geometries, 179.3 MB heap, 4,573 ms load, no errors. Mark this as user-supplied telemetry, not a newly reproduced benchmark.
- [ ] **Step 6: Commit:** `test/perf: establish trustworthy frame diagnostics`.

### Task 2: Active-runtime and redundant-work audit

**Files:**
- Inspect and modify only the actual active runtime source, service-worker transform, and relevant tests after tracing how the beta loads.
- Tests: existing fidelity, cache/render, sandbox, and gameplay regression tests; add a focused regression test if a duplicated update path is found.

**Interfaces:**
- Consume Task 1 diagnostics and the current runtime entry points.
- Produce a documented list of active expensive systems and a regression test for each removed/reduced duplicate path.

- [ ] **Step 1: Add failing regression assertions for any verified redundant timer, repeated renderer reconfiguration, duplicate update registration, or sandbox-disabled system still running. Do not invent assertions for paths not present.**
- [ ] **Step 2: Run the focused regression test and verify the current behavior is exposed.**
- [ ] **Step 3: Fix only verified duplicate/redundant work. Preserve existing render settings and the approved sandbox exclusions.**
- [ ] **Step 4: Run relevant cache/render, fidelity, sandbox, and gameplay checks.**
- [ ] **Step 5: Commit:** `perf: remove verified redundant runtime work`.

### Task 3: Visibility tiers and active world-cell integration

**Files:**
- Inspect: `coastline-world-streaming.js`, current scene construction in `game-v3.html`, and any world-model/cell adapters.
- Modify the smallest number of runtime modules needed to connect existing helpers.
- Tests: add `tests/performance-visibility.spec.mjs` or the nearest existing convention.

**Interfaces:**
- Consume current `createWorldCellStream` and `createObjectLod` interfaces only after reading their actual implementations.
- Produce a deterministic visibility/relevance policy that separates render visibility from collision/gameplay state.

- [ ] **Step 1: Add failing tests for near-field tier preservation, far/off-screen culling, tier hysteresis, and collision availability when render objects are hidden.**
- [ ] **Step 2: Run tests and confirm the unintegrated or incorrect behavior fails.**
- [ ] **Step 3: Wire cell/LOD primitives into the active scene.** Tier 0/1 keep current detail; only Tier 2/3 may simplify after visual checks. Use camera visibility, relevance, and measured screen-space impact as well as distance.
- [ ] **Step 4: Run visibility tests and existing engine/fidelity tests.**
- [ ] **Step 5: Inspect the diff for lifecycle leaks and verify the single garage/player vehicle remain visible and usable.**
- [ ] **Step 6: Commit:** `perf: integrate relevance-based world visibility`.

### Task 4: Static environment batching and repeated-prop instancing

**Files:**
- Inspect: `game-v3.html`, `cinematic-world-upgrade.js`, tree/prop generation helpers, and the existing tree stats contract in `tests/fidelity-core.spec.cjs`.
- Modify the narrowest relevant scene-generation helpers.
- Tests: extend fidelity tests and add focused batching/resource-lifecycle tests.

**Interfaces:**
- Consume existing instancing helpers if compatible.
- Produce spatially partitioned render batches keyed by compatible geometry/material/render state; collision objects remain independent.

- [ ] **Step 1: Add failing tests for repeated prop batching, stable per-cell batch counts, material variation preservation, and disposal/cleanup when a cell unloads.**
- [ ] **Step 2: Run tests and verify failure before implementation.**
- [ ] **Step 3: Batch/instance repeated vegetation and compatible street furniture. Merge static road/building surfaces only where geometry/material/shadow behavior is compatible and the draw-call reduction is measurable. Avoid one global world batch.
- [ ] **Step 4: Run focused tests and `npm run test:fidelity`.**
- [ ] **Step 5: Compare draw-call and geometry counts in a fixed scene; inspect close-range screenshots/visuals before accepting the batch.**
- [ ] **Step 6: Commit:** `perf: batch static environment and repeated props`.

### Task 5: Vehicle and traffic submission cost

**Files:**
- Inspect: `coastline-vehicle-asset-loader.js`, `vehicle-visual-enhancer.js`, traffic spawn/render paths, and `tests/vehicle-glb-fleet.spec.mjs`.
- Modify the asset/traffic path only after identifying which meshes/material groups account for submission cost.

**Interfaces:**
- Consume the current authored-asset loader and shared resource conventions.
- Produce a premium player vehicle path and a safe shared/optimized path for non-player traffic, without changing vehicle physics or control inputs.

- [ ] **Step 1: Add failing tests for player-vehicle authored asset/material preservation, traffic resource sharing, and no per-frame full-hierarchy setup.**
- [ ] **Step 2: Run focused tests and confirm missing behavior.**
- [ ] **Step 3: Reuse geometry/material resources and consolidate only compatible static submeshes where appearance is unchanged. Keep animated wheels/lights separate. Apply any simpler traffic representation only outside the near-field envelope and only if existing assets support a visually acceptable option.
- [ ] **Step 4: Run `npm run test:vehicle-glb-fleet`, vehicle dynamics tests, and fidelity tests.**
- [ ] **Step 5: Verify the player sedan remains the authored hero model and close-range traffic appearance has no obvious regression.**
- [ ] **Step 6: Commit:** `perf: reduce vehicle render submissions without hero downgrade`.

### Task 6: Distance-aware ambient update scheduling

**Files:**
- Inspect current traffic update loops, ambient pedestrian code, and Fidelity Core scheduler/budget interfaces.
- Add or extend focused tests under `tests/`.

**Interfaces:**
- Consume the existing spatial broadphase and frame scheduler where proven compatible.
- Produce near/medium/far update cadence with stable motion and unchanged collision behavior for relevant nearby traffic.

- [ ] **Step 1: Add failing tests for cadence tiers, transition stability, nearby traffic collision behavior, and no reactivation of pedestrian interaction/mission logic.**
- [ ] **Step 2: Run tests and confirm failure.**
- [ ] **Step 3: Apply distance/relevance-based cadence to non-critical ambient updates only. Do not reduce near-field entity quality or simply slash traffic/pedestrian counts. Keep collision-critical updates synchronous enough for safe driving.
- [ ] **Step 4: Run engine, vehicle, sandbox, and gameplay regression suites.**
- [ ] **Step 5: Commit:** `perf: schedule distant ambient updates by relevance`.

### Task 7: Integrated verification, profile report, and preview readiness

**Files:**
- Update regression tests and diagnostics as required.
- Update the performance report/documentation with measured results and outstanding limits.

- [ ] **Step 1: Run the full existing suite:** `npm test`.
- [ ] **Step 2: Run the production/package build path:** `npm run package:itch`, verify output and ensure new runtime modules/assets are included.
- [ ] **Step 3: Review the full branch diff for unintended graphics downgrades, re-enabled deferred systems, asset omissions, or collision/render coupling.**
- [ ] **Step 4: If Vercel permits, create a preview deployment and verify exact URL/build identity, startup, console errors, and performance diagnostics. If quota blocks deployment, report this honestly and do not claim live validation.**
- [ ] **Step 5: Capture a same-device/same-scene comparison for FPS, average/p95 frame time, draw calls, triangles, geometries, heap, loading, and errors. Treat metrics not reproducible in the current environment as pending, not passing.**
- [ ] **Step 6: Request an independent whole-branch code review; address high-severity findings before opening/refreshing the implementation PR.**
- [ ] **Step 7: Commit the report and final test updates:** `test(perf): document mega batch verification`.

## Execution Notes

- Work package boundaries are deliberate: diagnostic evidence precedes optimization, and every risky renderer change is isolated behind focused tests.
- The supplied telemetry is a baseline reference only. A valid performance claim requires the same device, route/scene, camera, and runtime duration before and after.
- If the diagnostic category timings show the renderer is not the dominant bottleneck, reorder implementation work based on evidence rather than blindly completing every optimization.
- A deployment quota does not block source/test work, but it does block live-beta verification until a fresh deployment is available.
