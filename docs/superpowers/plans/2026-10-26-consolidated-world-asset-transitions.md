# Consolidated World Asset & Transition Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make City Island, Homey Island, sparse future islands, and future interiors use one reliable world/asset lifecycle that preserves player state and prevents incomplete rendering during transitions.

**Architecture:** Extend the existing `transition-manager.js` and `coastline-world-transitions.js` rather than replacing them. Add explicit world manifests/render contracts so world content density is separate from shared character/vehicle asset readiness, then use the same lifecycle for exterior, Homey, and reusable door/garage transition infrastructure.

**Tech Stack:** Browser JavaScript ES modules, Three.js 0.170.0, Playwright/CommonJS tests, existing Coastline Transition Manager (CTM), existing island-region and asset-swap modules.

**Spec:** Approved Coastline world/asset/transition design from 2026-10-26 conversation.

## Global Constraints

- City Island and Homey Island receive intended full scenery.
- Future/unused islands remain terrain/basic coverage only until designed.
- Sparse worlds must still render complete character and vehicle assets.
- Do not hide white-dot characters or wheel-only vehicles with cosmetic fallbacks; fix lifecycle/readiness.
- Preserve selected vehicle, appearance/material state, player state, and valid return positions across transitions.
- City ↔ Homey must work in both directions without a blank duplicate world.
- Front-door transitions are on-foot only; garage transitions are vehicle-only.
- Garage vehicle selection uses the actual replacement fleet and excludes legacy unsupported models.
- Starting vehicle uses orange body paint with separate glass/wheel/light/trim materials.
- Preserve existing population/performance protections and optimize lifecycle/loading rather than removing visual quality.
- Full mansion interior content is out of scope.
- Keep the PR consolidated and do not merge without explicit user authorization.

## Review Focus

1. Destination asset readiness before activation — test that a sparse destination still contains complete vehicle/character hierarchies rather than placeholder-only geometry.
2. Re-entrant/duplicate transitions — test that City → Homey → City cannot leave two active roots or create a blank duplicate Homey world.
3. State continuity — test selected vehicle index, vehicle material identity, position, heading, and mode through both directions.
4. Failed destination load — test that a failed load cleans up without losing the active source world or leaving stale actors in the scene.
5. Mobile lifecycle pressure — test transition activation with the existing Android-oriented population/visual budgets and verify no asset stripping is introduced.

---

### Task 1: Formalize the shared world/render contract

**Files:**
- Modify: `transition-manager.js`
- Modify: `coastline-island-regions.js`
- Test: `tests/ctm-browser-regressions.spec.cjs`
- Test: `tests/coastline-island-regions.spec.mjs`

**Interfaces:**
- Consumes: existing CTM world definitions and transition definitions.
- Produces: explicit world identity/content-density metadata and lifecycle status that the runtime can inspect before activation.

- [ ] **Step 1: Add failing browser assertions for world identity and lifecycle readiness.**
  - Assert City is active at startup.
  - Assert Homey activation reports a concrete world id and resident root.
  - Assert a second activation cannot create a duplicate resident Homey root.

- [ ] **Step 2: Run the focused CTM browser test and confirm failure on the new assertions.**
  - Run: `npx playwright test tests/ctm-browser-regressions.spec.cjs --grep "world identity|duplicate|resident"`
  - Expected: FAIL until the runtime exposes the contract.

- [ ] **Step 3: Add the smallest world contract needed by CTM.**
  - Keep existing `load`, `unload`, `captureState`, and `restoreState` interfaces.
  - Add explicit content density/render readiness metadata rather than duplicating scenery rules in transition code.
  - Keep future worlds registered as sparse instead of inheriting City/Homey scenery.

- [ ] **Step 4: Run the focused unit/browser tests and verify PASS.**

- [ ] **Step 5: Commit the contract changes.**

---

### Task 2: Fix shared asset readiness and actor reattachment

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `coastline-asset-swap.js`
- Modify: `game-v3.html`
- Test: `tests/ctm-browser-regressions.spec.cjs`

**Interfaces:**
- Consumes: Task 1 world/render contract; existing `applyRgsdevFleet`, `loadCozyCharacterAsset`, and CTM state snapshots.
- Produces: destination activation with fully visible player vehicle/character assets and no legacy model flash.

- [ ] **Step 1: Add failing tests for sparse-world actor completeness.**
  - Inspect vehicle hierarchy mesh count/visibility after City → Homey and Homey → City.
  - Inspect hero hierarchy mesh count/visibility.
  - Assert no wheel-only/placeholder-only visual identity.
  - Assert vehicle identity remains the same selected replacement vehicle.

- [ ] **Step 2: Run the focused tests and confirm the lifecycle failure.**

- [ ] **Step 3: Implement shared asset readiness.**
  - Prepare the replacement fleet and cozy character before destination activation completes.
  - Reattach the active actor to the destination root exactly once.
  - Do not instantiate legacy models as an intermediate destination representation.
  - Keep sparse-world scenery independent from actor asset readiness.

- [ ] **Step 4: Add explicit cleanup on failed destination load.**
  - Failed destination construction must dispose its temporary root/asset resources and leave the source world active.
  - Do not clear the player's selected vehicle or appearance on failure.

- [ ] **Step 5: Run focused CTM/browser tests and verify PASS.**

- [ ] **Step 6: Commit the asset lifecycle fix.**

---

### Task 3: Make City ↔ Homey bridge travel deterministic

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `transition-manager.js`
- Test: `tests/ctm-browser-regressions.spec.cjs`
- Test: `tests/ctm-fixed-bridge-spawn.spec.cjs`

**Interfaces:**
- Consumes: shared lifecycle and actor readiness from Tasks 1–2.
- Produces: deterministic `city-to-island` and reverse travel with correct destination/return spawns.

- [ ] **Step 1: Add failing two-way transition assertions.**
  - Start in City.
  - Traverse City → Homey.
  - Verify Homey root/id, player state, vehicle state, and nonblank actor hierarchy.
  - Traverse Homey → City.
  - Verify City root/id and valid return position.
  - Assert there is never more than one active world root.

- [ ] **Step 2: Run the focused tests and confirm failure where the current lifecycle is incomplete.**

- [ ] **Step 3: Correct transition spawn/state ordering.**
  - Capture source state before unloading.
  - Load and validate destination before committing active-world state.
  - Apply the destination spawn exactly once.
  - Save the source return point only after successful destination activation.
  - Preserve vehicle mode/index/appearance.

- [ ] **Step 4: Run the focused bridge/CTM tests and verify PASS.**

- [ ] **Step 5: Commit the deterministic bridge lifecycle.**

---

### Task 4: Implement Homey content without contaminating sparse worlds

**Files:**
- Modify: `coastline-island-regions.js`
- Modify: `coastline-world-transitions.js`
- Modify: `game-v3.html`
- Test: `tests/coastline-island-regions.spec.mjs`
- Test: `tests/ctm-browser-regressions.spec.cjs`

**Interfaces:**
- Consumes: world content-density contract from Task 1.
- Produces: full Homey scenery plus intentionally sparse future-world roots.

- [ ] **Step 1: Add failing manifest/content assertions.**
  - Homey must declare full/developed content.
  - Future/unused worlds must declare sparse content.
  - Sparse worlds must still receive shared player/vehicle assets.

- [ ] **Step 2: Run focused tests and verify failure.**

- [ ] **Step 3: Build Homey-only scenery.**
  - Playful house paint/pattern.
  - Large decorative rocks/terrain features.
  - Waist-deep pool with walkable entry/exit.
  - Keep scenery attached to Homey content root only.

- [ ] **Step 4: Add/retain sparse future-world terrain/basic coverage only.**
  - Do not copy City/Homey scenery into undeveloped worlds.
  - Preserve the shared render/asset pipeline.

- [ ] **Step 5: Run manifest/browser tests and verify PASS.**

- [ ] **Step 6: Commit the content-density implementation.**

---

### Task 5: Establish reusable door and garage transition infrastructure

**Files:**
- Modify: `transition-manager.js`
- Modify: `coastline-world-transitions.js`
- Modify: `game-v3.html`
- Test: `tests/ctm-browser-regressions.spec.cjs`
- Test: existing garage progression tests discovered in `tests/`

**Interfaces:**
- Consumes: shared transition manager and state snapshot interfaces.
- Produces: reusable `door` and `garage` transition definitions with vehicle-policy enforcement.

- [ ] **Step 1: Add failing tests for transition policy.**
  - Door rejects vehicle-mode entry.
  - Garage rejects on-foot entry.
  - Garage retains selected replacement vehicle state.
  - Vehicle chooser exposes only replacement fleet entries.

- [ ] **Step 2: Run focused tests and verify failure.**

- [ ] **Step 3: Implement policy-driven transition gates.**
  - Use the existing CTM `vehiclePolicy` contract instead of bespoke booleans.
  - Add reusable spawn/return handling for interior worlds.
  - Keep mansion interior content out of this PR.

- [ ] **Step 4: Run focused tests and verify PASS.**

- [ ] **Step 5: Commit reusable interior transition infrastructure.**

---

### Task 6: Correct starting vehicle visual identity

**Files:**
- Modify: `game-v3.html`
- Modify: `coastline-asset-swap.js`
- Test: existing vehicle/graphics tests plus a focused browser assertion in `tests/ctm-browser-regressions.spec.cjs`

**Interfaces:**
- Consumes: replacement fleet material setup.
- Produces: orange starting vehicle with independent body, glass, wheels/tires, lights/trim and stable appearance through transitions.

- [ ] **Step 1: Add failing material identity assertions.**
  - Starting vehicle body is orange.
  - Glass is separate from body paint.
  - Wheels/tires and lights/trim are separate material groups.
  - Transition does not replace it with the old silver/legacy appearance.

- [ ] **Step 2: Run focused graphics/browser tests and verify failure.**

- [ ] **Step 3: Apply the material configuration in the existing replacement-fleet path.**
  - Do not create a second vehicle system.
  - Preserve existing damage/material safety handling.

- [ ] **Step 4: Run graphics and transition tests and verify PASS.**

- [ ] **Step 5: Commit the starting-vehicle correction.**

---

### Task 7: Perimeter, performance, and Android verification

**Files:**
- Modify: `coastline-world-transitions.js` if required by boundary fixes.
- Modify: `coastline-island-regions.js` if required by exact boundary geometry.
- Test: `tests/coastline-rope-bridge.spec.mjs`
- Test: `tests/ctm-browser-regressions.spec.cjs`
- Test: existing graphics/performance/browser smoke suites.

**Interfaces:**
- Consumes: completed world/transition lifecycle.
- Produces: validated boundary, bridge, population, and mobile behavior without reducing intended visual quality.

- [ ] **Step 1: Add failing boundary assertions.**
  - City perimeter barriers align with current playable boundary.
  - Bridge gap remains the intended access route.
  - Homey shoreline/bridge landing remains traversable.

- [ ] **Step 2: Run focused boundary tests and verify failure.**

- [ ] **Step 3: Correct only boundary/transition geometry that violates the contract.**

- [ ] **Step 4: Run the full relevant suite once the consolidated changes are assembled.**
  - Include gameplay watchdog, graphics quality guard, CTM/browser regressions, bridge/spawn tests, island-region tests, and smoke tests.

- [ ] **Step 5: Perform Android-oriented browser validation.**
  - Validate startup, City → Homey, Homey → City, actor rendering, vehicle rendering, and basic movement.
  - Record diagnostic evidence; do not claim Android success from desktop/headless tests alone.

- [ ] **Step 6: Update the current handoff with final PR/head/status details.**

- [ ] **Step 7: Final verification before PR review.**
  - Confirm no unrelated changes.
  - Confirm no legacy vehicle assets are reintroduced.
  - Confirm only one consolidated PR is created.
  - Do not merge until explicitly authorized.

---
