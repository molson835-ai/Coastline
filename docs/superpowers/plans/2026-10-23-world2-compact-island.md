# World 2 Compact Island + Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the oversized blank World 2 test landmass with a compact roughly 2× city-block rounded island, add a clearly visible palm-tree bridge marker, and guarantee that World 2 carries the current City hero/vehicle visual state rather than an older fallback appearance.

**Architecture:** Keep CTM and the physical City↔World2 bridge transition architecture unchanged. Make World 2 a lightweight static procedural environment with a compact footprint and one procedural palm marker; reuse the already-active City actor/vehicle objects and expose diagnostics that prove their visual identity/state across the transition.

**Tech Stack:** Vanilla JavaScript, Three.js, HTML game runtime, Playwright/CommonJS browser tests, GitHub Actions, Vercel preview.

**Spec:** `docs/superpowers/specs/2026-10-23-world2-compact-island-design.md`

## Global Constraints

- World 2 remains a test world: no buildings, NPCs, missions, or extra environmental asset packs.
- Preserve physical bridge traversal and automatic City↔World2 transitions; the bridge must not become teleport-only.
- Preserve the active vehicle and hero rather than creating an older World 2-specific visual fallback.
- Keep City-only collision data isolated from World 2.
- Do not reduce current City visual quality to solve World 2 performance.
- Keep the World 2 environment lightweight and suitable for the existing Android target.
- Do not reintroduce removed landmark-discovery or mission systems.

## Review Focus

1. **Stale visual identity:** World 2 must expose the same active hero/vehicle hierarchy used by City; test the identity before and after transition.
2. **Vehicle visibility after reparenting:** hidden descendants from runtime/spatial budgeting must not make the current vehicle appear incomplete; test the complete render hierarchy.
3. **Compact island bounds:** the island must be small enough that the bridge remains easy to locate from the spawn; test explicit bounds and spawn-to-bridge distance.
4. **Palm marker placement:** the palm must be off the road and near the island-side bridge entrance; test its diagnostic marker and placement.
5. **Transition regression:** compact geometry must not break the existing City→World2→City flow, movement, collision isolation, or error cleanup; run the existing targeted and full browser gates.

### Task 1: Add failing compact-layout and visual-parity tests

**Files:**
- Modify: `tests/world-transition-runtime.spec.cjs`
- Test: `tests/world-transition-runtime.spec.cjs`

**Interfaces:**
- Consumes: existing `window.__coastlineTransitionTest` diagnostics.
- Produces: tests for `world2Layout`, `activeVehicleVisible`, and a stable active-actor visual identity diagnostic.

- [ ] **Step 1: Write failing assertions**
  - Assert World 2 layout bounds are compact rather than the existing 480×480-scale landmass.
  - Assert the World 2 spawn is close to the island-side bridge entrance.
  - Assert a named palm marker exists near the island-side bridge entrance and is outside the road corridor.
  - Capture active vehicle/hero visual identity in City, transition to World 2, and assert the identity remains unchanged.
  - Assert the active vehicle remains fully renderable after transition.

- [ ] **Step 2: Run the focused browser test before implementation**
  - Run the repository's existing World 2 runtime test command.
  - Expected: the new compact-layout/palm/visual-parity assertions fail against the current oversized World 2 implementation.

### Task 2: Implement the compact World 2 environment and palm marker

**Files:**
- Modify: `coastline-world-transitions.js`

**Interfaces:**
- Consumes: existing CTM registration, bridge trigger, active vehicle, and World 2 collision-scope behavior.
- Produces: compact World 2 geometry, `world2Layout()` diagnostics, and a named palm marker diagnostic.

- [ ] **Step 1: Replace the oversized land footprint**
  - Reduce the playable island to approximately 2× a normal city-block footprint, using a lightweight rounded-square/octagonal procedural footprint.
  - Keep the island centered on the existing World 2 bridge location so CTM coordinates do not need a conceptual redesign.
  - Keep the bridge road aligned with the existing island-side approach trigger.

- [ ] **Step 2: Move the World 2 spawn to the compact bridge approach**
  - Keep the spawn on the island side of the bridge, close enough that the player can immediately identify the bridge.
  - Preserve the current vehicle orientation and active-vehicle reuse.

- [ ] **Step 3: Add the palm bridge marker**
  - Create one lightweight procedural palm-tree group.
  - Place it just off the side of the road near the island-side bridge entrance, without blocking the vehicle path.
  - Give the root a stable diagnostic name such as `coastline-world2-bridge-palm` and mark it always-visible for runtime budgeting.

- [ ] **Step 4: Expose compact-layout diagnostics**
  - Add a serializable `world2Layout()` diagnostic containing island bounds, spawn, bridge center/approach, and palm position.
  - Add a stable marker/identity diagnostic for the palm.

### Task 3: Enforce current City visual parity across CTM

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `coastline-runtime-fix.js` if inspection shows the active vehicle/hero visibility restoration needs a shared fix.

**Interfaces:**
- Consumes: the current City active actor/vehicle objects.
- Produces: stable visual identity and complete render visibility across CTM reparenting.

- [ ] **Step 1: Capture the current City visual identity path**
  - Identify the active hero and vehicle object/model identifiers already used by the current City runtime.
  - Do not introduce duplicate or legacy model loading for World 2.

- [ ] **Step 2: Preserve the current visual hierarchy during reparenting**
  - Ensure the exact active objects are reparented into World 2.
  - Ensure all renderable descendants required by the current visual state are visible after reparenting, not merely the root.
  - Preserve materials, paint, glass, wheels, hero appearance, and current animation hierarchy.

- [ ] **Step 3: Add serializable visual identity diagnostics**
  - Return stable identifiers/counts describing the active hero and vehicle render hierarchies before and after transition without returning live Three.js objects through Playwright.

- [ ] **Step 4: Run the focused visual-parity test**
  - Expected: City and World 2 report the same active actor/vehicle visual identity and the vehicle remains fully visible.

### Task 4: Update handoff documentation and run verification

**Files:**
- Modify: `docs/COASTLINE_WATCHDOG_REPAIR_HANDOFF_2026-10-21.md`
- Modify: `docs/CTM_DEBUG_FINDINGS_2026-10-22.md`
- Modify: `docs/superpowers/specs/2026-10-23-world2-compact-island-design.md` only if implementation decisions materially differ from the approved spec.

- [ ] **Step 1: Run targeted World 2/CTM tests**
  - Verify compact bounds, palm marker, active visual parity, movement, City→World2→City, collision isolation, prompt behavior, and error cleanup.

- [ ] **Step 2: Run the full repository/browser gates**
  - Confirm the same required workflows used for PR #87 remain green.
  - Investigate any failure before claiming success; do not mask unrelated regressions.

- [ ] **Step 3: Record the exact verified commit and results in the handoff**
  - Explicitly note that the old-looking World 2 baseline was investigated and that World 2 is now required to inherit the current City hero/vehicle state.
  - Record remaining Android playtest requirements.

- [ ] **Step 4: Commit the implementation**
  - Use a focused commit message describing the compact World 2 and visual-parity change.

- [ ] **Step 5: Deploy and verify the exact commit on Vercel**
  - Confirm the preview deployment resolves to the verified commit before providing the Android test link.

## Verification Gate

The work is not complete until all of the following are true:

- World 2 is visibly compact and roughly 2× a city block rather than the former oversized blank landmass.
- The island-side bridge is immediately findable from the spawn.
- The palm tree visibly marks the bridge entrance without blocking the road.
- The same current City hero and vehicle visual state survives the CTM transition.
- The vehicle remains visible and controllable in World 2.
- World 2 collision scope does not use City-only collision data.
- City→World2→City physical traversal passes without stuck CTM state or leaked worlds.
- Targeted and full automated gates pass.
- The exact deployed commit is verified before Android playtest.
