# Island Start CTM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the compact island the actual starting world while retaining CTM streaming, with a one-city-block bridge beginning at each world's map edge and carrying the player into City.

**Architecture:** CTM remains responsible for world activation/unloading so the island and City are separate runtime roots. The island is a lightweight standalone entity for now; it contains only the compact shell and bridge connection needed to prove the architecture. The player starts on the island in the existing active vehicle, and the primary transition is island → City; no player-facing World 2/test markers remain.

**Tech Stack:** Existing Three.js runtime, ES modules, Transition Manager, Playwright, GitHub Actions, Vercel preview.

**Spec:** `docs/superpowers/specs/2026-10-23-compact-island-design.md` plus the approved island-start direction from the 2026-10-23 conversation.

## Global Constraints

- Keep CTM; do not flatten the worlds into one scene.
- Keep the island compact at approximately 220×220 world units.
- The island remains deliberately naked/minimal until transition behavior is proven.
- The bridge is exactly one normal city block long (100 world units in the current bridge implementation).
- The bridge starts at the island map edge and ends at the City map edge.
- Preserve the same active player/vehicle hierarchy across transition.
- Keep City-only collision data isolated while the island is active.
- Do not reintroduce landmark discovery, missions, or reward popups.
- Do not merge PR #87 until automated gates and Android playtest pass.

## Review Focus

- Initial activation must load island, not City — test owns this.
- Island → City must occur from physical bridge travel, not a teleport/button dependency — test owns this.
- Bridge endpoints must align with map edges and not leave a hidden gap/wall — test owns this.
- Vehicle hierarchy/visibility must survive CTM reparenting — existing visual identity regression owns this.
- City collision scope must be restored after transition — existing collision regression owns this.

---

### Task 1: Lock the new start/bridge contract with failing tests

**Files:**
- Modify: `tests/world-transition-runtime.spec.cjs`
- Modify: `tests/transition-manager-browser.spec.cjs` if browser-only coverage is required

- [ ] Add assertions that initial transition initialization activates `island` and places the player in the active vehicle near the island-side bridge entrance.
- [ ] Add assertions that the bridge length is 100 units and its island endpoint coincides with the compact island boundary.
- [ ] Add assertions that the City endpoint coincides with the City map boundary.
- [ ] Add a physical island→City crossing test that advances the vehicle through the bridge trigger.
- [ ] Run the focused tests and confirm the new expectations fail against the current implementation.

### Task 2: Make island the initial CTM world

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `game-v3.html` only where initialization currently assumes City is the first active world

- [ ] Rename internal World 2-facing identifiers to island-oriented names where safe; retain compatibility aliases only where tests or CTM APIs require them.
- [ ] Define explicit island start spawn just inside the island edge, facing the bridge.
- [ ] Change initialization to activate island first with the existing active vehicle/player.
- [ ] Ensure City remains loaded only when CTM transitions to it.
- [ ] Keep reverse City→island transition registered for future use, but do not make it the initial flow.
- [ ] Keep collision scope synchronized with the active world.
- [ ] Run focused tests and confirm they pass.

### Task 3: Align the bridge to actual world edges

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: relevant runtime tests

- [ ] Use explicit map-edge constants derived from the compact island bounds and City bridge boundary.
- [ ] Place a single 100-unit bridge between those edge points without overlapping 100 units of land on either side.
- [ ] Spawn the island vehicle just before the island-side bridge entrance, not in the bridge center.
- [ ] Set the City destination just beyond the City-side bridge entrance.
- [ ] Remove the palm marker and any test-only visual affordance from the player-facing island.
- [ ] Run focused browser transition tests.

### Task 4: Remove World 2/test presentation without removing CTM

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: tests that assert obsolete World 2/palm behavior
- Modify: handoff/debug documentation

- [ ] Remove obsolete World 2 marker assertions and names from active gameplay expectations.
- [ ] Keep internal CTM world ID stable enough for transition-manager diagnostics where useful, but expose `island` as the semantic name.
- [ ] Update handoff notes with the new start-world contract and known Android acceptance steps.

### Task 5: Full verification and deployment

**Files:**
- No code changes unless verification exposes a defect.

- [ ] Run transition-manager unit tests.
- [ ] Run CTM/browser transition tests.
- [ ] Run the full gameplay browser gate.
- [ ] Verify service-worker/package behavior includes the transition runtime.
- [ ] Verify the exact Vercel deployment commit contains the tested branch head.
- [ ] Perform final self-review against this plan before requesting user Android playtest.
- [ ] Do not merge until the user confirms the Android island→City drive works.
