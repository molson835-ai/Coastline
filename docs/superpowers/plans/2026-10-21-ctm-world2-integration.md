# CTM + World 2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate CTM into the shipped Coastline runtime and prove deterministic City ↔ World 2 shell transitions with safe recovery and exactly one resident world after success.

**Architecture:** Keep Three.js and existing gameplay systems authoritative; CTM coordinates lifecycle through thin world adapters. Stage World 2 before disposing World 1, apply destination spawn in the adapter, retain world-keyed return/state data, and expose deterministic test hooks without creating a duplicate game loop.

**Tech Stack:** Browser JavaScript ES modules, Three.js, existing Node lifecycle tests, existing browser-test framework and CI workflows.

**Spec:** `docs/superpowers/specs/2026-10-21-ctm-world2-integration-design.md`

## Global Constraints

- Preserve World 1 gameplay and close-range visual quality.
- Do not add dependencies unless existing tooling cannot support the requirement.
- Permit source + destination residency only during transition staging; after success exactly one world is resident.
- Destination-load failure must leave the source active and retryable.
- Do not build final island art, mansion, interiors, missions, or landmark rewards in this phase.
- Use deterministic frame/state controls in tests rather than wall-clock polling where possible.

## Review Focus

- Destination load throws before returning a handle: source remains active; retry succeeds.
- Destination loader creates resources then throws: partial resources are disposed.
- Source unload throws after destination staging: CTM reports a deterministic failure and never reports a clean one-world transition while both worlds remain resident.
- Vehicle/player state contains absent optional fields or non-finite spatial values: adapter validates/falls back safely and does not corrupt live state.
- Repeated or concurrent transition requests: only one transition runs and resident handles are not duplicated.

---

### Task 1: Harden CTM lifecycle and return-state semantics

**Files:**
- Modify: `transition-manager.js`
- Test: `tests/transition-manager.spec.mjs`

**Interfaces:**
- Consumes: existing `createTransitionManager({ onEvent })`, world `load/unload/captureState/restoreState` definitions.
- Produces: the same public manager API, with deterministic destination-spawn/transition-state delivery, per-world return points, and explicit rollback/failure status.

- [ ] **Step 1: Add failing lifecycle tests** for destination spawn pass-through, per-world return points across a round trip, partial destination cleanup, and source-unload failure.
- [ ] **Step 2: Run** `node --test tests/transition-manager.spec.mjs`; confirm the new cases fail for the intended reasons.
- [ ] **Step 3: Implement minimal CTM changes.** Key world state and return points by world id. Preserve source ownership until destination activation can safely commit; define a deterministic recovery policy for source disposal failure and emit accurate failure metadata.
- [ ] **Step 4: Run** `node --test tests/transition-manager.spec.mjs`; expect all CTM lifecycle tests to pass.
- [ ] **Step 5: Commit** as `fix: harden transition lifecycle recovery`.

### Task 2: Integrate CTM with the real game runtime

**Files:**
- Modify: `game-v3.html`
- Modify: `transition-manager-browser.js` (or replace its placeholder wiring with a thin runtime adapter)
- Modify: focused runtime module(s) only if a clean adapter boundary cannot live in the existing entrypoint.
- Test: existing browser integration test files, plus a focused new test if needed.

**Interfaces:**
- Consumes: Task 1 CTM API; existing Three.js scene, player/vehicle state, runtime initialization and teardown points.
- Produces: actual World 1 initial activation through CTM, an isolated World 2 shell loader/unloader, and testable status for active/resident worlds.

- [ ] **Step 1: Trace and pin the current runtime seams** with a test/assertion for startup compatibility and a check that the production entrypoint imports the CTM module.
- [ ] **Step 2: Run the focused browser test** and confirm it fails because live startup/transition is not yet connected to CTM.
- [ ] **Step 3: Add thin world adapters.** World 1 wraps existing runtime resources; World 2 owns a bounded scene group/resource handle with deterministic load and disposal. Do not create a second gameplay loop.
- [ ] **Step 4: Route startup through CTM** while preserving existing UI, player, vehicle, NPC, map, and rendering behavior.
- [ ] **Step 5: Run focused browser tests** and verify normal World 1 startup remains functional and World 2 is not resident at startup.
- [ ] **Step 6: Commit** as `feat: connect transition manager to game runtime`.

### Task 3: Implement deterministic City ↔ World 2 transitions

**Files:**
- Modify: the runtime adapter from Task 2
- Modify: `game-v3.html` only for necessary interaction/presentation hooks
- Test: browser integration tests for world transitions

**Interfaces:**
- Consumes: runtime adapters and CTM from Tasks 1–2.
- Produces: bridge/tunnel transition and return transition with `vehiclePolicy: 'allowed'`, deterministic destination spawn, and player/vehicle state preservation.

- [ ] **Step 1: Add failing browser cases** for City → World 2, World 2 → City, deterministic spawn, vehicle preservation, and resident-world count.
- [ ] **Step 2: Run the focused browser tests** and confirm the new scenarios fail before implementation.
- [ ] **Step 3: Implement transition entry and arrival.** Apply `destinationSpawn` to player/vehicle through the adapter; preserve orientation and required vehicle state; restore the saved City return point.
- [ ] **Step 4: Add a minimal bridge/tunnel-style transition affordance** suitable for testing. Keep the shell visibly distinct but inexpensive; final art remains out of scope.
- [ ] **Step 5: Run the focused browser suite** and verify exactly one resident world after each successful transition.
- [ ] **Step 6: Commit** as `feat: add deterministic city island shell transitions`.

### Task 4: Prove failure recovery and regression safety

**Files:**
- Modify: runtime test hooks/adapter only as required
- Test: browser integration tests and existing CI suites
- Update: project handoff document with CTM contracts, test commands, known limitations, and next steps

**Interfaces:**
- Consumes: completed live CTM integration and deterministic test hooks.
- Produces: repeatable proof of destination-load failure recovery, retry behavior, and regression-safe handoff notes.

- [ ] **Step 1: Add failing browser cases** for injected World 2 load failure, partial-resource cleanup, City remaining active, and retry succeeding after failure injection is removed.
- [ ] **Step 2: Run the focused browser suite** and verify the failure case exposes any incorrect active/resident state.
- [ ] **Step 3: Implement only the recovery/test-hook changes needed** to satisfy the spec; keep test hooks explicitly diagnostic and avoid shipping user-facing debug controls.
- [ ] **Step 4: Run all relevant checks**: CTM Node tests, browser integration tests, gameplay watchdog, Babylon preview validation, and itch.io HTML package validation (use repository scripts/workflows as defined; do not invent command names).
- [ ] **Step 5: Update handoff notes** with merged commit/PR references, CTM API, test status, and remaining island-content work.
- [ ] **Step 6: Commit** as `test: verify transition recovery and document CTM handoff`.

## Completion Criteria

- The production `game-v3.html` runtime uses CTM for City startup and City ↔ World 2 shell transitions.
- Successful transitions leave exactly one resident world; the brief staging phase may contain two.
- Destination spawn, vehicle/player state, and per-world return points are deterministic.
- Destination failure preserves a playable City world and supports retry.
- Source-disposal failure is surfaced accurately and does not silently claim success.
- Relevant tests/CI pass and the handoff is updated.
- No visual-quality reduction is introduced.
