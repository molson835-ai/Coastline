# Short Bridge Transition Buffer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent CTM bridge arrivals from spawning inside City geometry while preserving the current physical bridge test and island-first architecture.

**Architecture:** Keep the existing CTM worlds and 100-unit bridges. Define a small protected landing corridor beyond each playable map edge, use the corridor endpoint as the destination spawn, and keep normal world collision suppressed/isolated while the player is in the transition corridor. The eventual scenic long loading road will reuse this contract later.

**Tech Stack:** Browser JavaScript, Three.js, Playwright, GitHub/Vercel deployment.

**Spec:** `docs/superpowers/specs/2026-10-23-short-bridge-transition-buffer.md`

## Global Constraints

- Keep the island naked/lightweight for this pass.
- Keep the existing 100-unit bridge.
- Preserve the active vehicle and visual hierarchy across CTM transitions.
- Preserve bidirectional physical bridge transitions.
- Do not reintroduce missions or landmark discovery.
- Do not reduce City visuals to solve the collision problem.
- Do not merge PR #87 before automated verification and Android playtest.

## Review Focus

- Island -> City arrival must be outside City geometry and face into the City.
- City -> Island arrival must be outside island geometry and face into the island.
- Crossing must remain physical and must not depend on the UI button.
- Only the active world remains resident after a successful transition.
- Existing vehicle identity/visibility must survive both directions.

### Task 1: Establish explicit bridge corridor geometry

**Files:**
- Modify: `coastline-world-transitions.js`

**Interfaces:**
- Preserve `world2Spawn()`, `bridgeZones()`, `cityBridgeContract()`, and existing CTM public methods.
- Add serializable corridor diagnostics for tests if useful.

- [ ] **Step 1: Write the failing runtime assertions**
  - Assert each world has a distinct playable edge and outer bridge endpoint.
  - Assert destination spawn is on the outer corridor side rather than inside the playable map.
  - Assert destination heading points from the corridor toward the destination world's playable area.

- [ ] **Step 2: Run the focused runtime test and verify the new assertions fail on the current coordinates.**

- [ ] **Step 3: Implement the minimum corridor constants and destination spawn positions.**

- [ ] **Step 4: Keep the bridge crossing detector tied to the outer bridge endpoint so the physical crossing still triggers CTM.**

- [ ] **Step 5: Run the focused test again.**

### Task 2: Protect the destination corridor from normal world collision

**Files:**
- Modify: `coastline-world-transitions.js`
- Modify: `game-v3.html` only if existing collision scope needs a small corridor exception

**Interfaces:**
- Preserve `window.__coastlineWorld2Active` as the existing world-scope signal.

- [ ] **Step 1: Add a failing assertion that the vehicle can occupy the destination bridge buffer without being blocked by City/island geometry.**

- [ ] **Step 2: Implement the smallest collision-scope exception necessary for the bridge corridor.**

- [ ] **Step 3: Verify normal City collision remains active once the vehicle reaches the playable City area.**

### Task 3: Verify both directions and vehicle continuity

**Files:**
- Modify: `tests/world-transition-runtime.spec.cjs`
- Modify: `tests/transition-manager-browser.spec.cjs` if its transition endpoint assumptions are stale

- [ ] **Step 1: Add/adjust tests for Island -> City physical crossing and safe City-side arrival.**

- [ ] **Step 2: Add/adjust tests for City -> Island physical crossing and safe Island-side arrival.**

- [ ] **Step 3: Assert the same vehicle index and visual identity survive both directions.**

- [ ] **Step 4: Assert no page errors and correct resident-world cleanup after each transition.**

- [ ] **Step 5: Run the focused browser tests.**

### Task 4: Verify deployment and document future scenic bridge direction

**Files:**
- Modify: `docs/superpowers/specs/2026-10-23-short-bridge-transition-buffer.md` if final implementation differs from the spec.
- Modify: `docs/PROJECT_HANDOFF.md` or the existing Coastline handoff file if the repo contains one.

- [ ] **Step 1: Run syntax/static checks available in the repository.**

- [ ] **Step 2: Verify the Vercel deployment for the final branch head.**

- [ ] **Step 3: Run the current automated CTM/browser gate; do not call it green unless the actual current-head run completes successfully.**

- [ ] **Step 4: Record the deployment and any runner limitation in the handoff.**

- [ ] **Step 5: Perform Android playtest: Island start -> full bridge crossing -> City bridge buffer -> drive into City; then reverse back to Island.**
