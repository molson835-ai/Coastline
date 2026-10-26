# Homey House Interior — Single-World Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Homey house interior as one complete, functional American home world with coherent circulation, purposeful detail, bedroom/closet functionality, and stable player movement.

**Architecture:** Keep `home-interior` as one CTM world. Rework the existing house builder around explicit semantic zones and simple rectangular movement colliders, while keeping visual meshes decorative. Reuse existing player-state and proximity interaction conventions instead of introducing a second wardrobe system.

**Tech Stack:** Three.js, existing Coastline CTM/world-transition code, browser/engine regression tests.

**Spec:** `docs/superpowers/specs/2026-10-26-homey-house-single-world.md`

## Global Constraints

- Keep Homey house as one CTM world.
- Preserve existing garage/house transition contracts.
- Do not re-enable missions or landmark discovery.
- Do not add duplicate driveway light posts.
- Preserve vehicle selection/material state through transitions.
- Prefer lightweight primitives and instancing over expensive unique assets.
- Do not claim Android acceptance from desktop CI.

## Review Focus

- Furniture-corner movement traps — test the player walking from the entry through living room, hall and bedroom without snagging.
- Misaligned living-room viewing geometry — test that sofa, coffee table and TV form one direct viewing axis.
- Wardrobe state loss — test clothing/color selection survives the supported reload/transition lifecycle.
- Transition regression — test garage ↔ house on-foot flow and vehicle persistence remain intact.
- Duplicate/out-of-place props — test semantic object names and source-level layout contracts so accidental duplicate lamp posts or floating props are caught.

---

### Task 1: Establish semantic house layout and movement-safe collision

**Files:**
- Modify: `coastline-homey-house-interior.js`
- Test: existing house/CTM regression suites, plus a focused source-contract test if needed.

**Interfaces:**
- Consumes: existing `buildHomeyHouseInterior(THREE, options)` and house contract.
- Produces: one `home-interior` root with semantic living, dining, kitchen, hall, bedroom and closet groups plus intentional rectangular colliders.

- [ ] **Step 1:** Add/extend a failing regression that requires the bedroom, closet and semantic living-room anchors and rejects the old banner-style/ambiguous layout.
- [ ] **Step 2:** Rebuild the floor plan with a clear entry/hall, living room, kitchen/dining zone and enclosed bedroom.
- [ ] **Step 3:** Replace furniture collision ambiguity with simple clearance-aware collider footprints; keep decorative geometry non-colliding unless explicitly needed.
- [ ] **Step 4:** Center the coffee table on the sofa-to-TV axis and place the TV on a media console directly opposite the seating.
- [ ] **Step 5:** Run focused engine/browser tests and inspect failures before moving on.

### Task 2: Add lived-in home detail without clutter

**Files:**
- Modify: `coastline-homey-house-interior.js`
- Test: source-contract/graphics regression as appropriate.

**Interfaces:**
- Consumes: Task 1 semantic zones.
- Produces: stable visual props for living, dining, kitchen, hall and bedroom.

- [ ] **Step 1:** Add purposeful high-value details: lamps, side tables, wall art, entry rug, curtains/blinds, kitchen smallwares/appliances, books/decor, and bedroom furnishings.
- [ ] **Step 2:** Keep all props grounded and outside movement paths.
- [ ] **Step 3:** Add a normal bedroom doorway and closet architecture with believable trim, shelves/rod and hanging clothes.
- [ ] **Step 4:** Run the graphics quality guard and focused house tests.

### Task 3: Implement the wardrobe interaction

**Files:**
- Modify: `game-v3.html` and the smallest existing appearance/interaction module needed after code inspection.
- Test: focused browser regression for closet proximity and appearance persistence.

**Interfaces:**
- Consumes: existing player appearance state and proximity-button conventions.
- Produces: closet proximity control, wardrobe selection, clothing color selection and persistent player appearance state.

- [ ] **Step 1:** Locate and reuse the existing key-board/proximity interaction pattern and player appearance state.
- [ ] **Step 2:** Add a semantic closet interaction point with a compact wardrobe selector.
- [ ] **Step 3:** Add clothing-color selection without altering vehicle material logic.
- [ ] **Step 4:** Persist the chosen clothing/color through the supported player lifecycle.
- [ ] **Step 5:** Add browser regression coverage for proximity visibility, selection and persistence.

### Task 4: Correct garage/house architectural readability and driveway-light behavior

**Files:**
- Modify: `coastline-homey-garage.js`
- Modify: `coastline-island-regions.js`
- Modify: `coastline-world-transitions.js`
- Modify: `game-v3.html`
- Test: garage/CTM regressions.

**Interfaces:**
- Consumes: existing garage props and CTM transition contracts.
- Produces: real American house door and double-bay garage door architecture, with original driveway lights becoming functional knockable/resettable posts and no duplicate added lantern set.

- [ ] **Step 1:** Remove instructional banners and add visible door slabs, frames, handles/knobs and double-bay segmented garage-door geometry.
- [ ] **Step 2:** Locate the pre-existing exterior driveway posts and attach collision/fall/reset behavior to those objects only.
- [ ] **Step 3:** Remove duplicate PR #128-added lanterns if they are distinct from the original posts.
- [ ] **Step 4:** Verify garage workshop props have sensible placement, clear circulation and no floating objects.
- [ ] **Step 5:** Run focused garage/transition tests.

### Task 5: Full verification and handoff

**Files:**
- Modify: `tests/homey-garage.spec.mjs`
- Modify: `tests/ctm-browser-regressions.spec.cjs`
- Modify: `docs/COASTLINE_ISLAND_DETAIL_HOME_INTERIOR_HANDOFF_2026-10-26.md`

- [ ] **Step 1:** Run focused engine tests.
- [ ] **Step 2:** Run browser/Chromium smoke and gameplay watchdog tests.
- [ ] **Step 3:** Inspect exact-head CI results and diagnose any failures before declaring success.
- [ ] **Step 4:** Update handoff with exact commit/head, test results, known limitations and Android acceptance checklist.
- [ ] **Step 5:** Leave PR open; do not merge without explicit authorization.
