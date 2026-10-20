# Coastline Transition Manager v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify a reusable Coastline Transition Manager that can stream between synthetic worlds today and support the private-island, mansion, apartment-elevator, and doorman transition patterns later.

**Architecture:** CTM is a small ES-module subsystem under `src/transition/`. Pure manifest/registry/state-machine logic stays independent of Babylon and the current monolithic `game-v3.html`. A loader adapter provides Babylon `AssetContainer`-style lifecycle operations, while a separate state-handoff interface preserves player/game continuity. The game page supplies gate triggers and consumes CTM events; it does not own the transition state machine.

**Tech Stack:** Browser ES modules, JavaScript, Babylon.js runtime already used by Coastline, Node's built-in test runner, Playwright.

**Spec:** `docs/COASTLINE_TRANSITION_MANAGER_V1.md`

## Global Constraints

- Preserve near-field visual fidelity; CTM must optimize active-world scope rather than downgrade assets.
- CTM must not perform per-frame work proportional to registered-world count.
- Source world remains active until destination load, validation, activation, valid spawn, and state restoration succeed.
- CTM orchestrates transitions; persistent player/game state remains owned by the state layer.
- Duplicate transition requests must not create duplicate world instances.
- Failed preload/warm/activation must have deterministic recovery and leave the source world usable whenever possible.
- Babylon-specific loading must remain behind a loader adapter.
- All production transitions must emit bounded structured telemetry.
- Real World 2/World 3 art is out of scope for this implementation branch.

## Review Focus

- Destination load failure must leave the source world active; Task 3 covers this with a deterministic loader failure test.
- Repeated and rapid A/B requests must not duplicate or race world instances; Task 3 covers coalescing and cancellation tests.
- State restoration must be atomic from the destination's perspective; Task 4 covers successful and failed handoff tests.
- Retired-world resources must actually release; Task 2 and Task 6 cover disposal counts and browser lifecycle assertions.
- A masked gate must use the same transition pipeline as a physical gate; Task 5 covers provider parity.

---

### Task 1: Define CTM contracts and world registry

**Files:**
- Create: `src/transition/world-manifest.mjs`
- Create: `src/transition/world-registry.mjs`
- Create: `tests/transition-world-registry.spec.mjs`

**Interfaces:**
- Produces `validateWorldManifest(manifest)`, `WorldRegistry`, `WorldRegistry.register(manifest)`, `WorldRegistry.get(worldId)`, `WorldRegistry.has(worldId)`, `WorldRegistry.list()`.
- `WorldRegistry` rejects duplicate IDs and invalid required fields.

- [ ] **Step 1: Write the failing tests** for valid registration, duplicate IDs, missing IDs, stable versions, and immutable returned manifest snapshots.
- [ ] **Step 2: Run `node --test tests/transition-world-registry.spec.mjs` and verify failure.**
- [ ] **Step 3: Implement the manifest validator and registry with no Babylon dependency.** Required manifest fields are exactly those in the CTM spec; preserve unknown extension fields without making them required.
- [ ] **Step 4: Run the focused registry test and verify PASS.**
- [ ] **Step 5: Commit `feat: add CTM world registry contracts`.**

### Task 2: Add loader adapter and world lifecycle handles

**Files:**
- Create: `src/transition/world-loader-adapter.mjs`
- Create: `src/transition/world-instance.mjs`
- Create: `tests/transition-world-loader.spec.mjs`

**Interfaces:**
- Produces `WorldLoaderAdapter` with `preload(manifest, context)`, `warm(instance, context)`, `activate(instance, context)`, `deactivate(instance, context)`, `dispose(instance, context)`.
- Produces `WorldInstance` lifecycle state and resource ownership counters.
- Adapter accepts injected implementations so synthetic tests never require a Babylon renderer.

- [ ] **Step 1: Write failing tests** for preload → warm → activate → deactivate → dispose, double-dispose safety, and load failure propagation.
- [ ] **Step 2: Run the focused loader tests and verify failure.**
- [ ] **Step 3: Implement the adapter and instance lifecycle.** The Babylon implementation must be injectable and must support an AssetContainer-equivalent prepare/activate/dispose path without coupling CTM to one loader API.
- [ ] **Step 4: Run focused tests and verify PASS, including resource release counts.**
- [ ] **Step 5: Commit `feat: add CTM world loader lifecycle`.**

### Task 3: Implement the transition state machine and manager

**Files:**
- Create: `src/transition/transition-state-machine.mjs`
- Create: `src/transition/transition-manager.mjs`
- Create: `tests/transition-manager.spec.mjs`

**Interfaces:**
- State machine exposes the exact states: `IDLE`, `REQUESTED`, `PRELOADING`, `WARMING`, `READY`, `TRANSFERRING`, `ACTIVATING`, `RETIRING_OLD_WORLD`, `UNLOADING`, `COMPLETE`, `FAILED`, `RECOVERING`.
- `TransitionManager.requestTransition({ gate, sourceWorldId, playerStateContext })` returns a transition handle containing `id`, `promise`, `cancel()`, and `getSnapshot()`.
- `TransitionManager.getActiveTransition()` returns the current handle/snapshot or `null`.
- `TransitionManager.registerWorld(manifest)` delegates to the registry.

- [ ] **Step 1: Write failing tests** for normal A→B, B→A, source protection on preload failure, cancellation before activation, activation recovery, and duplicate-request coalescing.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement the explicit state machine and orchestration.** Each state transition must be explicit; no scattered booleans may determine lifecycle state. The source instance must not be disposed before destination activation and successful state restoration.
- [ ] **Step 4: Add rapid A→B→A→B tests** proving old transition handles cannot mutate the active transition.
- [ ] **Step 5: Run focused tests and verify PASS.**
- [ ] **Step 6: Commit `feat: implement CTM transition state machine`.**

### Task 4: Add atomic player-state handoff

**Files:**
- Create: `src/transition/player-state-handoff.mjs`
- Create: `tests/transition-player-state.spec.mjs`

**Interfaces:**
- Produces `PlayerStateHandoff` with `capture(context)`, `validate(snapshot)`, `restore(snapshot, destinationContext)`, and `rollback(snapshot, context)`.
- CTM receives the handoff implementation through dependency injection.

- [ ] **Step 1: Write failing tests** proving vehicle, player, mission, money/inventory, discoveries, time/weather, and world-specific state survive A→B.
- [ ] **Step 2: Write a failing test** proving invalid restoration blocks source retirement.
- [ ] **Step 3: Implement the handoff contract with atomic validation and explicit rollback behavior.** CTM must not become the persistent-state owner.
- [ ] **Step 4: Run focused tests and verify PASS.**
- [ ] **Step 5: Commit `feat: add CTM player state handoff`.**

### Task 5: Add gate definitions and provider adapters

**Files:**
- Create: `src/transition/gate-definition.mjs`
- Create: `src/transition/gate-providers.mjs`
- Create: `tests/transition-gates.spec.mjs`

**Interfaces:**
- Produces `createGateDefinition(input)` and provider helpers for `physical`, `masked`, and `explicit` gates.
- Provider output must normalize to the same `TransitionManager.requestTransition(...)` input.

- [ ] **Step 1: Write failing tests** for bridge/tunnel physical gates, elevator/doorman masked gates, and explicit travel.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement provider adapters.** Masked gates may hold activation until their interaction/animation reaches its handoff point while CTM continues preloading/warming.
- [ ] **Step 4: Add tests proving all providers feed the same manager path and preserve gate metadata/telemetry.**
- [ ] **Step 5: Run focused tests and verify PASS.**
- [ ] **Step 6: Commit `feat: add CTM transition gates`.**

### Task 6: Add telemetry and Babylon/game runtime adapter

**Files:**
- Create: `src/transition/transition-telemetry.mjs`
- Create: `src/transition/babylon-world-loader.mjs`
- Modify: `game-v3.html` at the existing inline module integration point
- Create: `tests/transition-telemetry.spec.mjs`

**Interfaces:**
- Produces `TransitionTelemetry.start(...)`, `mark(...)`, `complete(...)`, `fail(...)`, `snapshot()` with bounded records.
- Babylon adapter translates CTM lifecycle calls to the existing Babylon scene/container APIs.
- Game integration exposes a single `window.__coastlineTransitionManager` diagnostic handle in test/dev mode without adding visible HUD noise.

- [ ] **Step 1: Write failing telemetry tests** for complete, failed, cancelled, and recovered transitions and bounded retention.
- [ ] **Step 2: Implement telemetry and verify focused tests pass.**
- [ ] **Step 3: Implement the Babylon loader adapter** using the project's existing Babylon imports/runtime conventions; load destination assets without immediately making them authoritative, then activate/dispose through CTM.
- [ ] **Step 4: Wire CTM into `game-v3.html` behind a non-disruptive runtime initialization path.** Existing gameplay must remain the active World 1 source world; no real-world transition gate is required yet.
- [ ] **Step 5: Run the existing inline-module syntax validation plus the focused CTM tests.**
- [ ] **Step 6: Commit `feat: integrate CTM with Coastline runtime`.**

### Task 7: Build deterministic synthetic World A/B harness

**Files:**
- Create: `tests/transition-worlds-a-b.spec.mjs`
- Create: `tests/fixtures/transition-worlds.mjs`

**Interfaces:**
- Fixtures define deterministic `TEST_WORLD_A` and `TEST_WORLD_B` manifests, mock loader resources, mock state handoff, and all gate types.

- [ ] **Step 1: Add the fixture worlds and mock dependencies.**
- [ ] **Step 2: Add end-to-end node tests** for A→B, B→A, state preservation, preload failure, activation failure, cancellation, rapid alternating transitions, resource release, and telemetry completeness.
- [ ] **Step 3: Run `node --test tests/transition-worlds-a-b.spec.mjs` and verify all acceptance tests pass.**
- [ ] **Step 4: Commit `test: prove CTM with synthetic worlds`.**

### Task 8: Add browser/runtime smoke coverage and final verification

**Files:**
- Create: `tests/transition-runtime.spec.cjs`
- Modify: test workflow/config only if required by existing shard conventions
- Modify: `docs/MEGA_PATCH2_MARKER_REPORT.md` with CTM verification status

**Interfaces:**
- Browser test boots the existing game page, verifies the CTM diagnostic handle, checks an A/B synthetic transition path exposed only to the test harness, and verifies World 1 remains playable after a failed destination load.

- [ ] **Step 1: Write the failing Playwright smoke test.**
- [ ] **Step 2: Run the focused browser test and verify it fails for the expected missing CTM handle/transition behavior.**
- [ ] **Step 3: Implement the minimal test-only synthetic transition hook without exposing a user-facing test UI.**
- [ ] **Step 4: Run the focused browser test and verify PASS.**
- [ ] **Step 5: Run the existing inline-module syntax check and all CTM node tests.**
- [ ] **Step 6: Run the relevant existing Coastline regression suites, including `npm run test:engine`, `npm run test:streaming-performance`, `npm run test:mega-patch2`, and the full browser shard command used by CI.**
- [ ] **Step 7: Inspect the final head and workflow results; do not call CTM complete if any required regression job is failing or cancelled.**
- [ ] **Step 8: Commit `test: verify CTM integration and regressions`.**

## Completion gate

CTM is complete only when:

1. The CTM spec and implementation agree on every lifecycle state and interface.
2. Synthetic A/B tests pass all acceptance cases.
3. Babylon/runtime integration is present but does not require World 2 to exist.
4. Existing World 1 gameplay remains functional.
5. Failed destination loads cannot destroy the source world.
6. Persistent state handoff is tested.
7. Resource release is tested.
8. Telemetry is emitted and bounded.
9. Physical and masked gate providers share the same transition pipeline.
10. Required CI/regression tests pass on the final branch head.

After this gate, the next project is **World 2 — Private Island**, using CTM as the production transition backbone. The first island transition should use a real physical gate (bridge and/or tunnel), followed by mansion garage/front-door transitions into World 3.
