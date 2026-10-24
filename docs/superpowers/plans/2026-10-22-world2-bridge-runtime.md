# World 2 Bridge Runtime Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make City ↔ World 2 a genuinely playable bridge traversal with visible vehicle state, World 2-specific collision behavior, and reliable return to City.

**Architecture:** Keep CTM responsible for world lifecycle and state transfer, while `coastline-world-transitions.js` owns the bridge trigger zones and World 2 runtime scope. The bridge is traversed physically; entering an end-zone automatically requests the CTM transition instead of requiring a teleport button. World 2 movement/collision must not depend on City collision arrays, and runtime visibility budgeting must not leave the carried vehicle hidden after reparenting.

**Tech Stack:** Browser JavaScript, Three.js, Playwright, GitHub Actions, Vercel preview deployments.

**Spec:** `docs/COASTLINE_WATCHDOG_REPAIR_HANDOFF_2026-10-21.md` and `docs/CTM_DEBUG_FINDINGS_2026-10-22.md`.

## Global Constraints

- Do not merge PR #87 until the complete City → World 2 → City browser path passes.
- Do not weaken movement assertions merely to make CI pass.
- Preserve CTM lifecycle/state-transfer behavior and plain-data snapshot contracts.
- Do not reduce visual quality as the fix for this runtime bug.
- World 2 must not reuse City collision arrays as its collision source.
- The carried active vehicle must remain visible and controllable after a transition.

## Review Focus

- Bridge interaction: approaching the physical bridge in a vehicle must provide a real traversal path, not a teleport-only button; covered by a browser bridge-zone test.
- World 2 movement: forward input must move the player/vehicle after arrival; covered by the existing CTM browser regression and expanded vehicle assertion.
- Vehicle visibility: the active vehicle mesh must remain visible after World 2 activation; covered by a browser visibility assertion.
- World 2 collision: City-only collision objects must not block movement in World 2; covered by a World 2 movement/collision test.
- Return traversal: driving to the World 2 bridge return zone must transition back to City and restore the vehicle; covered by an end-to-end browser test.

---

### Task 1: Lock the observed regressions in browser tests

**Files:**
- Modify: `tests/ctm-browser-regressions.spec.cjs`
- Modify: `tests/world-transition-runtime.spec.cjs`

**Interfaces:**
- Consumes: `window.__coastlineTransitionTest` diagnostics and runtime input path.
- Produces: failing browser coverage for movement, vehicle visibility, bridge trigger zones, and round-trip traversal.

- [ ] **Step 1: Add assertions that the active vehicle remains visible after City → World 2.**
- [ ] **Step 2: Add a test-only bridge-zone helper that moves the player to the physical World 2 bridge approach, then assert the automatic transition occurs without calling `transition()` directly.**
- [ ] **Step 3: Assert forward input changes position by more than `0.1` after World 2 activation.**
- [ ] **Step 4: Assert World 2 movement is not blocked by City collision arrays.**
- [ ] **Step 5: Assert driving into the World 2 return zone transitions back to City and the same vehicle remains active/visible.**
- [ ] **Step 6: Run the focused browser tests and confirm they fail for the current implementation for the newly pinned behavior.

---

### Task 2: Repair World 2 runtime scope and vehicle visibility

**Files:**
- Modify: `coastline-runtime-fix.js`
- Modify: `coastline-world-transitions.js`

**Interfaces:**
- Consumes: existing runtime spatial budget and CTM world handles.
- Produces: a World 2-safe visibility/collision scope and a carried vehicle that is explicitly made render-visible after reparenting.

- [ ] **Step 1: Change spatial-budget traversal back to a full `scene.traverse()` so hidden meshes that were budget-hidden in City can be restored when their world becomes active.**
- [ ] **Step 2: On World 2 activation and restore, explicitly restore visibility for the active vehicle hierarchy without changing its materials or geometry.**
- [ ] **Step 3: Replace the global boolean collision bypass with a World 2 runtime collision predicate/scope that returns only World 2 collision information while the island is active.**
- [ ] **Step 4: Keep City collision arrays completely out of World 2 collision evaluation.**
- [ ] **Step 5: Run the focused unit/browser tests for the runtime scope and verify the failing tests move toward green.

---

### Task 3: Convert the bridge from teleport prompt to physical traversal

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `tests/ctm-browser-regressions.spec.cjs`

**Interfaces:**
- Consumes: CTM `transition()`, active player/vehicle snapshots, existing bridge geometry.
- Produces: physical bridge approach/end trigger zones with automatic CTM transition and an optional contextual prompt that no longer acts as the only route.

- [ ] **Step 1: Define distinct city-side and island-side bridge end zones instead of using the World 2 spawn itself as the return target.**
- [ ] **Step 2: Spawn World 2 on the road beyond the bridge, so the player must drive toward the bridge to return rather than immediately satisfying the transition condition.**
- [ ] **Step 3: Detect vehicle entry into the appropriate bridge end zone and invoke the matching CTM transition once, guarded against repeated transitions while busy.**
- [ ] **Step 4: Keep the bridge prompt as feedback/optional interaction, but never require the user to click it to traverse the world boundary.**
- [ ] **Step 5: Ensure the City return spawn is on the playable city side of the bridge and faces away from the transition trigger to prevent an immediate bounce-back.**
- [ ] **Step 6: Run the end-to-end browser traversal test and verify City → bridge → World 2 → bridge → City.

---

### Task 4: Verify the complete gate and preview

**Files:**
- Modify: `.github/workflows/ctm-targeted-verification.yml` only if required to run the corrected tests reliably.
- Modify: `docs/CTM_DEBUG_FINDINGS_2026-10-22.md` with verified results.

- [ ] **Step 1: Run CTM-focused Playwright tests.**
- [ ] **Step 2: Run the full gameplay browser gate.**
- [ ] **Step 3: Confirm no action-required-only workflow is being mistaken for a pass.**
- [ ] **Step 4: Deploy the corrected PR head to a fresh Vercel preview.**
- [ ] **Step 5: Beta-test the exact corrected preview on Android: drive across bridge, confirm visible vehicle, drive in World 2 without invisible City collisions, and drive back to City.**
- [ ] **Step 6: Only after all evidence is green, request review/merge; otherwise document the exact remaining failure.
