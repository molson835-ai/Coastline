# Island + Wildlife + World Transition Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve City Island presentation, stabilize PR #134 wildlife, harden CTM/garage/house transitions, and fix first-entry engine audio without reducing visual quality.

**Architecture:** Extend the existing island-region, wildlife, CTM, garage, and audio lifecycle systems in place. Reuse the PR #134 rideable-mount contracts and existing transition roots; do not create parallel world or animal controllers. Performance work will target active-world simulation, instancing, lazy loading, and cleanup.

**Tech Stack:** Browser JavaScript, Three.js, existing Coastline CTM/transition modules, Playwright, Node-based engine/system tests, GitHub Actions, itch package build.

**Spec:** `docs/superpowers/specs/2026-10-28-island-wildlife-world-polish.md`

## Global Constraints

- Preserve family-friendly gameplay; no weapon systems.
- Missions and landmark-discovery notifications remain absent.
- City Island uses palms as its only tree class; existing non-tree coastal plants may remain.
- Preserve selected vehicle, paint, appearance, and active-player identity across world transitions.
- Garage vehicle entry remains vehicle-only; house entry remains on-foot-only.
- Do not use visual-quality reduction as the primary performance solution.
- Mobile performance is a release criterion, but desktop CI must not be represented as Android verification.
- Do not merge or promote without explicit user authorization.

## Review Focus

- Threshold direction/re-entry: repeated crossings must be suppressed by direction-aware hysteresis/debounce — covered by transition regression tests.
- Vehicle/world ownership: the selected vehicle must survive world swaps with exactly one active player vehicle — covered by round-trip transition tests.
- Inactive-world simulation: wildlife/vehicle update work must stop outside the active world — covered by population/runtime contract tests.
- Mobile audio lifecycle: first entry and visibility/resume must unlock/restart the engine loop — covered by browser audio lifecycle regression.
- Asset failure/cleanup: lazy wildlife or transition loads must fail back without leaked roots or disposed shared assets — covered by loader/cleanup tests.

---

### Task 1: Baseline exact-head state and regression inventory

**Files:**
- Inspect: `coastline-island-regions.js`
- Inspect: `coastline-world-transitions.js`
- Inspect: `coastline-homey-garage.js`
- Inspect: `tests/`

**Interfaces:**
- Produces: confirmed current contracts and test names for Tasks 2–6.

- [ ] **Step 1: Record current main/feature heads and existing relevant tests.**
- [ ] **Step 2: Run the smallest existing island/world/wildlife test set.**
- [ ] **Step 3: Record any pre-existing failures before modifications.**
- [ ] **Step 4: Commit only if baseline documentation/code changes are required.**

### Task 2: City Island palm-only vegetation policy

**Files:**
- Modify: `coastline-island-regions.js`
- Test: existing island-region tests plus a focused City Island vegetation contract test if needed

**Interfaces:**
- Consumes: existing region manifest/theme and vegetation builders.
- Produces: deterministic City Island tree-class selection that returns palms only.

- [ ] **Step 1: Write the failing City Island vegetation test.** Assert City Island tree placements/classes contain only palm tree identifiers and that non-tree coastal plants remain permitted.
- [ ] **Step 2: Run the focused test and verify it fails on the current generic tree policy.**
- [ ] **Step 3: Implement the smallest region-scoped palm-only tree selection.** Do not alter Homey/other island tree policies.
- [ ] **Step 4: Run the focused island suite and verify it passes.**
- [ ] **Step 5: Run graphics/island diagnostics to ensure the policy does not remove required shoreline coverage.**
- [ ] **Step 6: Commit `feat: make City Island vegetation palm-only`.**

### Task 3: Rideable wildlife lifecycle and active-world gating

**Files:**
- Modify: existing PR #134 wildlife loader/controller file(s) identified during Task 1
- Modify: `coastline-world-transitions.js` if active-world handoff is required
- Test: wildlife asset/loader tests and a focused runtime lifecycle test

**Interfaces:**
- Consumes: PR #134 rideable mount creation, CTM world IDs, shared asset disposal markers.
- Produces: one authoritative wildlife lifecycle with active-world-only simulation and safe cleanup.

- [ ] **Step 1: Write failing tests for duplicate mount prevention and inactive-world simulation gating.**
- [ ] **Step 2: Run focused wildlife tests and verify failure.**
- [ ] **Step 3: Reuse the existing mount controller and add world ownership/lifecycle guards rather than a second controller.**
- [ ] **Step 4: Add lazy/failure-safe asset handling where the new animal pack requires it; never make the runtime depend on a missing optional binary.**
- [ ] **Step 5: Run wildlife tests and package asset checks; verify they pass.**
- [ ] **Step 6: Commit `feat: stabilize rideable wildlife lifecycle`.**

### Task 4: CTM garage/house/world transition hardening

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `coastline-homey-garage.js`
- Test: `tests/world-transition-runtime.spec.cjs`, `tests/homey-garage.spec.mjs`, and Playwright transition coverage

**Interfaces:**
- Consumes: `didCrossGarageThreshold`, `didCrossHouseDoorThreshold`, CTM world registry, selected-player vehicle state.
- Produces: direction-aware, debounced threshold transitions with coherent player/vehicle ownership.

- [ ] **Step 1: Write failing tests for forward/reverse threshold crossings, re-entry hysteresis, and garage→house→garage round trip.**
- [ ] **Step 2: Run the focused transition tests and verify the new cases fail or expose current behavior.**
- [ ] **Step 3: Centralize threshold acceptance around crossing direction plus a short hysteresis/debounce state; preserve valid reverse traversal.**
- [ ] **Step 4: Transfer selected/parked vehicle ownership before source-root disposal and assert one active player vehicle after each handoff.**
- [ ] **Step 5: Keep garage entry vehicle-only and house entry on-foot-only; preserve the key-board interaction gate.**
- [ ] **Step 6: Run engine/system and focused browser transition tests.**
- [ ] **Step 7: Commit `fix: harden CTM world and house transitions`.**

### Task 5: First-entry engine audio lifecycle

**Files:**
- Modify: existing engine/audio lifecycle module identified during Task 1
- Test: existing audio tests plus browser lifecycle regression

**Interfaces:**
- Consumes: successful vehicle-entry event, browser audio context, vehicle engine-loop state.
- Produces: engine sound on first successful entry and correct resume after visibility/page lifecycle suspension.

- [ ] **Step 1: Write a failing regression for first vehicle entry with no prior exit/re-entry.**
- [ ] **Step 2: Run it and verify the current lifecycle fails.**
- [ ] **Step 3: Start/unmute the engine loop from the authoritative successful-entry path after the required user gesture/audio unlock.**
- [ ] **Step 4: Add visibility/page-resume handling that does not duplicate loops.**
- [ ] **Step 5: Run audio and browser lifecycle tests and verify pass.**
- [ ] **Step 6: Commit `fix: start vehicle audio on first entry`.**

### Task 6: Performance-safe world activation and diagnostics

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: active island/wildlife population module(s)
- Modify: diagnostics module(s) if already present
- Test: performance/runtime contract tests and graphics guard

**Interfaces:**
- Consumes: active world ID and existing population budgets.
- Produces: bounded active-world simulation plus diagnostics for active vehicles, wildlife, and world roots.

- [ ] **Step 1: Add a failing contract for inactive-world wildlife/vehicle updates being skipped.**
- [ ] **Step 2: Run the focused runtime test and verify failure.**
- [ ] **Step 3: Gate simulation/update work by active world without changing visible asset quality.**
- [ ] **Step 4: Preserve instancing and lazy loading for repeated/large assets.**
- [ ] **Step 5: Add concise runtime diagnostics for active-world counts and transition cleanup.**
- [ ] **Step 6: Run performance/graphics guards and verify no intentional visual-quality regression.**
- [ ] **Step 7: Commit `perf: bound inactive-world simulation`.**

### Task 7: Full exact-head verification and PR preparation

**Files:**
- Modify: `docs/COASTLINE_ISLAND_DETAIL_HOME_INTERIOR_HANDOFF_2026-10-26.md` if needed to record verified status
- Modify: `docs/superpowers/plans/2026-10-28-island-wildlife-world-polish.md` only for execution notes if needed

**Interfaces:**
- Consumes: all previous task contracts.
- Produces: exact-head CI evidence and a draft PR ready for user review.

- [ ] **Step 1: Run engine tests.** Expected: PASS.
- [ ] **Step 2: Run system tests.** Expected: PASS.
- [ ] **Step 3: Run the full Playwright/browser suite.** Expected: PASS, including transition/audio/wildlife regressions.
- [ ] **Step 4: Run Babylon preview validation.** Expected: PASS.
- [ ] **Step 5: Run graphics-quality guard.** Expected: PASS.
- [ ] **Step 6: Run standalone itch package build/smoke test.** Expected: PASS.
- [ ] **Step 7: Inspect exact-head failures if any and fix them with the same RED→GREEN cycle before claiming readiness.**
- [ ] **Step 8: Review the final diff for accidental visual downgrades, duplicate controllers, missing optional assets, or stale documentation.**
- [ ] **Step 9: Create the PR against `main` as a draft if verification is still pending; otherwise mark it ready only after all required checks are green. Do not merge.**
- [ ] **Step 10: Report Android playtest requirements separately; do not call desktop CI an Android pass.**
