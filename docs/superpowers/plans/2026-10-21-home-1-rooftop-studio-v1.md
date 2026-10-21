# Home 1 — Rooftop Studio Apartment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Home 1 as Coastline's first bounded residential CTM destination, with a distinctive apartment exterior, high-detail rooftop studio, persistent certificate wall, and reusable interior-world contracts without degrading World 1 visuals or runtime quality.

**Architecture:** Home 1 is a content-owned Three.js destination world loaded and retired through the existing Coastline Transition Manager. CTM remains generic; Home 1 supplies its own world factory, assets, interactions, and certificate presentation. The world is bounded and ownership-aware so World 1 simulation can be inactive while Home 1 is authoritative.

**Tech Stack:** Three.js 0.170, existing Coastline ES modules, CTM lifecycle/Three.js loader adapter, GLB/glTF assets, existing player-state architecture, Playwright/browser smoke tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-21-home-1-rooftop-studio-design.md`

## Global Constraints

- Implementation is gated on CTM lifecycle and browser acceptance work being green on an exact SHA.
- Do not use Babylon APIs in the root Three.js beta.
- Do not create a second transition framework; all world changes use CTM.
- Do not lower global resolution, shadows, materials, lighting, near-field detail, or other authored visual quality to solve Home 1 performance.
- Third-party assets require recorded licenses permitting game/commercial use and modification.
- World 1 gameplay simulation must not remain fully active while Home 1 is authoritative unless a measured transition requirement proves otherwise.
- Home 1 must remain a bounded, independently owned destination world.
- Do not merge or promote CTM or Home 1 without explicit human approval.
- Browser CI is not representative-device verification; Android performance/controls require a real device playtest.

## Review Focus

- CTM activation/retirement must preserve player state and never strand the source world — covered by destination lifecycle tests in Task 4.
- Home 1 resources must be disposed only when owned by its destination factory — covered by ownership/disposal tests in Task 3.
- Certificate state must survive leaving/re-entering the destination and render from the authoritative player-state source — covered by Task 5.
- Rooftop entry/exit must use CTM rather than a parallel loader — covered by Task 6 browser smoke tests.
- A visually rich small world must not accidentally reactivate the full World 1 simulation — covered by Task 7 runtime/world-scope assertions.

---

### Task 1: Asset and world-boundary inventory

**Files:**
- Create: `docs/home1/2026-10-21-home1-asset-inventory.md`
- Create: `src/worlds/home1/home1-content.mjs`
- Test: `tests/home1/home1-content.spec.mjs`

- [ ] Record candidate architectural/prop sources, exact licenses, modification rights, and intended use. Reject candidates whose license cannot support Coastline's planned distribution.
- [ ] Define Home 1 content identifiers, world bounds, entry/exit anchors, and asset groups as data, not CTM special cases.
- [ ] Add tests for stable identifiers, bounded coordinates, required anchors, and asset ownership metadata.
- [ ] Run the focused Home 1 content test and commit the task.

### Task 2: Home 1 destination factory contract

**Files:**
- Create: `src/worlds/home1/home1-world-factory.mjs`
- Modify: existing CTM destination registration seam only where required
- Test: `tests/home1/home1-world-factory.spec.mjs`

- [ ] Write failing tests proving the factory creates a detached destination root and declares its owned resources.
- [ ] Implement the minimal factory using the existing Three.js loader ownership contract.
- [ ] Keep all Home 1 art/content outside CTM core modules.
- [ ] Test failure behavior and disposal ownership before activation.
- [ ] Run focused factory tests and commit the task.

### Task 3: Exterior hero building and APARTMENTS sign

**Files:**
- Create/modify: Home 1 scene/content asset files under the Home 1 world content directory
- Modify: `src/worlds/home1/home1-world-factory.mjs`
- Test: `tests/home1/home1-visual-contract.spec.mjs`

- [ ] Integrate the selected licensed GLB/modular building asset.
- [ ] Make the building's silhouette, entrance, rooftop profile, and large APARTMENTS sign distinct from surrounding buildings.
- [ ] Keep surrounding context minimal and non-enterable.
- [ ] Add automated structural checks for required named roots/material groups/sign anchor where practical.
- [ ] Run focused tests and commit the task.

### Task 4: CTM destination registration and player-state handoff

**Files:**
- Modify: Home 1 registration/content module
- Modify: existing CTM integration seam only
- Test: `tests/home1/home1-ctm.spec.mjs`

- [ ] Write a failing A→Home1→A lifecycle test using the real CTM interfaces.
- [ ] Register Home 1 as a normal destination world with no Home 1-specific transition state machine.
- [ ] Verify state is restored before activation and the source world remains protected until destination activation succeeds.
- [ ] Verify repeated same-destination requests coalesce and failure/cancellation leaves the source usable.
- [ ] Run CTM and Home 1 focused tests; commit only after both pass.

### Task 5: Studio interior and certificate wall

**Files:**
- Create/modify: Home 1 interior scene/content
- Create: `src/worlds/home1/home1-certificates.mjs`
- Test: `tests/home1/home1-certificates.spec.mjs`

- [ ] Implement compact studio relationships: entry, bed, living/TV, kitchen, table/work area, bathroom, certificate wall, rooftop door.
- [ ] Consume the authoritative player-state/achievement source rather than creating a parallel persistence store.
- [ ] Render earned certificates with stable ordering and safe placeholders for missing/unearned entries.
- [ ] Test persistence across leave/re-enter and unknown/missing certificate IDs.
- [ ] Run focused tests and commit the task.

### Task 6: Rooftop patio and garden transition

**Files:**
- Modify: Home 1 scene/content and interaction modules
- Test: `tests/home1/home1-rooftop.spec.mjs`, `tests/home1/home1-runtime-smoke.spec.cjs`

- [ ] Add the bounded rooftop patio, parapet/fence, planters, garden, seating, table, lighting, and skyline/coastal backdrop.
- [ ] Make the rooftop door interaction explicit and safe.
- [ ] Route the studio↔rooftop world change through CTM; do not create a second loader.
- [ ] Add browser smoke coverage proving entry, return, state preservation, one authoritative active root, and disposal behavior.
- [ ] Run focused and browser tests and commit the task.

### Task 7: World-scope/performance integration

**Files:**
- Modify: Home 1 world lifecycle integration only
- Test: `tests/home1/home1-world-scope.spec.mjs`

- [ ] Add a test proving Home 1 activation does not retain unnecessary World 1 gameplay simulation as authoritative.
- [ ] Verify only Home 1 required assets and immediate transition resources are active.
- [ ] Measure asset/resource counts without introducing global visual downgrades.
- [ ] If optimization is required, use bounded scope, instancing, caching, simplified collision geometry, or ownership-aware disposal before considering any visible-quality change.
- [ ] Run the focused suite and commit the task.

### Task 8: Representative browser/CI gate and documentation

**Files:**
- Modify: `docs/COASTLINE_HANDOFF.md`
- Modify: relevant CTM/Home 1 plan/spec checkpoint
- Test: full relevant automated suite

- [ ] Run all relevant CTM, system, vehicle/fidelity, and Home 1 browser tests on one exact implementation SHA.
- [ ] Inspect every required Actions shard; do not infer green from partial jobs.
- [ ] Perform a representative Android/device playtest for controls, visual quality, transitions, and loading behavior.
- [ ] Record exact SHA, tests, device evidence, known limitations, and asset licenses in the durable handoff.
- [ ] Leave CTM/Home 1 unmerged unless the user explicitly authorizes promotion.

## Final verification

- [ ] All focused Home 1 tests pass.
- [ ] Relevant CTM browser smoke tests pass on the exact implementation SHA.
- [ ] No World 1 visual-quality regression is introduced.
- [ ] Home 1 entry/exit preserves player state.
- [ ] Certificate wall persists authoritative achievements.
- [ ] Rooftop patio/garden is bounded and visually detailed.
- [ ] Destination resources obey the CTM ownership/disposal contract.
- [ ] Representative-device evidence is recorded separately from CI evidence.
- [ ] Durable handoff is updated before the work is considered complete.
