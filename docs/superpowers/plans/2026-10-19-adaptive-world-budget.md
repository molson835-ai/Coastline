# Coastline Adaptive World Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Coastline GPU/CPU workload through proximity, visibility, relevance, instancing, and update-frequency optimization while preserving close-range visual fidelity and gameplay functionality.

**Architecture:** Add a centralized adaptive-world budget layer consumed by existing world systems rather than introducing independent quality downgrades. Buildings, vegetation, traffic, NPCs, infrastructure, clutter, lighting/shadows, water/atmosphere, and occlusion will each expose cheap eligibility/update decisions; close-range and gameplay-critical objects remain full fidelity. Changes are staged with regression tests and measured against the existing fidelity/performance baseline.

**Tech Stack:** Browser JavaScript modules, Three.js, existing Coastline render/world systems, Node test suite, Playwright browser checks, Vercel previews.

**Spec:** `docs/superpowers/specs/2026-10-19-adaptive-world-budget.md`

## Global Constraints

- Do not intentionally lower close-range visual fidelity.
- Do not globally lower pixel ratio, texture quality, shadows, reflections, or post-processing as the optimization mechanism.
- The designated player garage remains fully enterable and functional.
- Ordinary buildings retain convincing exterior visuals while hidden interiors/logic are avoided.
- Gameplay-critical collisions and interactions remain functional.
- Progressive steering and existing fidelity protections must remain intact.
- Cloudflare Workers are not changed or promoted by this work.
- Use TDD: failing regression test before each production behavior change.
- Measure draw calls, triangles, geometries, frame time/FPS, memory, loading time, and runtime errors before/after.
- Promote only an exact commit that passes the complete verification gate.

## Review Focus

- Close-range objects: nearby vegetation, buildings, vehicles, NPCs, and infrastructure must not receive cheaper representations merely because they are part of an optimized category.
- Gameplay relevance: active missions, collisions, enterable locations, and nearby traffic/NPC interactions must remain fully functional.
- Visual continuity: distance transitions must avoid obvious popping, disappearance, or lighting discontinuities.
- Renderer authority: adaptive budgeting must not become a second competing pixel-ratio/quality authority.
- Beta freshness: optimized code must reach the beta runtime through the release-scoped cache path without stale executable assets.

### Task 1: Baseline and fidelity-profile gate

**Files:**
- Modify: `tests/fidelity-core.spec.cjs`
- Test: existing gameplay/fidelity suites

**Interfaces:**
- Consumes: current `detectCoastlineDeviceProfile` and render configuration.
- Produces: corrected fidelity expectations compatible with the current device-profile contract.

- [ ] **Step 1: Write the failing test** for the intended mobile/constrained profile semantics rather than asserting an obsolete profile for the test environment.
- [ ] **Step 2: Run the focused fidelity test and verify the current mismatch fails for the expected reason.**
- [ ] **Step 3: Update the test to assert the agreed profile contract without changing visual quality settings.**
- [ ] **Step 4: Run `npm run test:fidelity` and verify it passes.**
- [ ] **Step 5: Commit the test correction.**

### Task 2: Adaptive budget core

**Files:**
- Create: `coastline-adaptive-world-budget.js`
- Create: `tests/adaptive-world-budget.spec.cjs`

**Interfaces:**
- Consumes: player position, object distance, visibility, gameplay relevance, object category, and renderer/world config.
- Produces: deterministic budget decisions for `detailTier`, `simulationTier`, `shadowEligible`, `collisionRequired`, `interactionRequired`, and `updateIntervalMs`.

- [ ] **Step 1: Write failing unit tests for near, mid, far, hidden, and gameplay-critical objects.**
- [ ] **Step 2: Run the focused test and verify failure.**
- [ ] **Step 3: Implement the minimal pure decision functions with explicit category-independent proximity/relevance rules.**
- [ ] **Step 4: Add tests proving critical/interactive objects cannot be downgraded below their required functional tier.**
- [ ] **Step 5: Run the focused suite and verify all pass.**
- [ ] **Step 6: Commit the adaptive budget core.**

### Task 3: Buildings and enterable-space optimization

**Files:**
- Modify: existing building/world construction module identified during implementation inspection (`world-model.js`, `world-engine.js`, or owning building module only where required)
- Modify: `game-v3.html` only if integration is required there
- Test: building/world regression suite

**Interfaces:**
- Consumes: adaptive budget decisions from Task 2.
- Produces: one fully interactive garage; optimized ordinary building exteriors; no unnecessary hidden interior work.

- [ ] **Step 1: Write failing tests for garage enterability, ordinary-building exterior retention, and inactive hidden-interior suppression.**
- [ ] **Step 2: Run the focused building tests and verify failure.**
- [ ] **Step 3: Implement exterior/interior separation and distance-aware building work without changing close-range exterior geometry/material quality.**
- [ ] **Step 4: Test that the garage retains collision, entry, upgrade interaction, and interior rendering.**
- [ ] **Step 5: Run building/gameplay tests and verify pass.**
- [ ] **Step 6: Commit.**

### Task 4: Vegetation and ground-clutter budgeting

**Files:**
- Modify: owning vegetation/world modules discovered during inspection
- Create/modify: vegetation regression tests

**Interfaces:**
- Consumes: adaptive budget decisions.
- Produces: reusable/instanced repeated vegetation, proximity-aware detail, inactive distant clutter suppression.

- [ ] **Step 1: Write failing tests for full nearby vegetation, reduced distant processing, and preserved landscape presence.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement geometry/material reuse and instancing where the current architecture permits it.**
- [ ] **Step 4: Add distance-based update/culling behavior without removing close weeds, bushes, dirt patches, or trees.**
- [ ] **Step 5: Run vegetation and fidelity tests.**
- [ ] **Step 6: Commit.**

### Task 5: Traffic and vehicle budgeting

**Files:**
- Modify: traffic/world vehicle owner identified during inspection
- Test: vehicle/gameplay regression suite

**Interfaces:**
- Consumes: adaptive budget decisions.
- Produces: detailed nearby traffic, cheaper distant simulation, reusable vehicle assets, preserved collision/relevance behavior.

- [ ] **Step 1: Write failing tests for nearby full vehicle treatment, distant reduced simulation, and active-vehicle collision preservation.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement distance/relevance-aware traffic simulation and asset reuse.**
- [ ] **Step 4: Run `npm run test:vehicle` plus focused tests.**
- [ ] **Step 5: Verify progressive steering remains unchanged.**
- [ ] **Step 6: Commit.**

### Task 6: NPC simulation and animation budgeting

**Files:**
- Modify: `living-world.js`, `npc-world-slice.js`, and/or owning NPC module only as required
- Test: NPC/system regression suite

**Interfaces:**
- Consumes: adaptive budget decisions and player relevance.
- Produces: full nearby NPC rigs/animation/behavior; reduced distant update frequency while preserving visible population and active interactions.

- [ ] **Step 1: Write failing tests for near full updates, distant throttling, and active mission/NPC interaction protection.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement update throttling and relevance protection.**
- [ ] **Step 4: Run system/gameplay tests.**
- [ ] **Step 5: Commit.**

### Task 7: Infrastructure, roads, signs, lights, and repeated props

**Files:**
- Modify: owning world/infrastructure module identified during inspection
- Test: collision/fidelity regression suite

**Interfaces:**
- Consumes: adaptive budget decisions.
- Produces: instanced/reused repeated infrastructure with preserved close-range appearance and gameplay-critical collision.

- [ ] **Step 1: Write failing tests for repeated asset reuse and collision preservation.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement reuse/instancing and relevance-aware updates.**
- [ ] **Step 4: Verify stoplights/signs remain visually present and collision behavior remains correct.**
- [ ] **Step 5: Run complete relevant tests.**
- [ ] **Step 6: Commit.**

### Task 8: Lighting, shadows, water, atmosphere, and occlusion

**Files:**
- Modify: existing rendering/world modules only where profiling identifies avoidable work
- Test: fidelity/performance regression suite

**Interfaces:**
- Consumes: adaptive visibility/relevance decisions.
- Produces: reduced expensive work for hidden/distant objects without global renderer-quality downgrades.

- [ ] **Step 1: Write failing tests for close shadow/reflection eligibility and hidden-object suppression.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Implement selective eligibility/update rules.**
- [ ] **Step 4: Verify centralized renderer quality settings remain unchanged.**
- [ ] **Step 5: Run fidelity and browser tests.**
- [ ] **Step 6: Commit.**

### Task 9: Performance instrumentation and before/after comparison

**Files:**
- Modify: `coastline-telemetry.js` only if existing safe telemetry can expose additional aggregate performance counters
- Test: telemetry/performance regression suite

**Interfaces:**
- Consumes: renderer and adaptive budget metrics.
- Produces: aggregate performance snapshots without PII, coordinates, session replay, or telemetry blocking startup.

- [ ] **Step 1: Write failing tests for required aggregate metrics.**
- [ ] **Step 2: Verify failure.**
- [ ] **Step 3: Add only non-sensitive counters needed to compare optimization impact.**
- [ ] **Step 4: Run telemetry/system tests.**
- [ ] **Step 5: Compare against the known baseline (approximately 3,035 draw calls, 1.05M triangles, 30.13 ms average frame time in the recorded Android beta snapshot) and report actual new measurements.**
- [ ] **Step 6: Commit.**

### Task 10: Full release gate and beta preview

**Files:**
- Modify: CI/workflow only if a proven missing regression gate is discovered

**Interfaces:**
- Consumes: all optimized systems and existing release/cache protections.
- Produces: a tested Vercel preview from an exact commit; no Cloudflare promotion.

- [ ] **Step 1: Run `npm test`.**
- [ ] **Step 2: Run all gameplay, vehicle, engine, systems, and fidelity gates independently.**
- [ ] **Step 3: Build/package the beta artifact and verify no stale executable assets are served.**
- [ ] **Step 4: Run browser smoke/performance verification on the exact Vercel preview.**
- [ ] **Step 5: Compare visual/performance metrics and inspect for regressions including steering, audio startup, building placement, road-line flicker, collisions, task-toast behavior, crouch/jump animation, lighting, and close-range fidelity.**
- [ ] **Step 6: Only if all gates pass, prepare the exact commit for user-authorized beta promotion. Do not merge or promote automatically.**

### Task 11: Final verification and review

- [ ] **Step 1: Run the complete verification suite from a clean state.**
- [ ] **Step 2: Inspect the final diff for accidental visual downgrades or unrelated changes.**
- [ ] **Step 3: Confirm Cloudflare files/deployments were not changed.**
- [ ] **Step 4: Record final performance deltas and remaining bottlenecks.**
- [ ] **Step 5: Provide the exact tested commit and beta preview status; do not claim success without fresh verification evidence.**
