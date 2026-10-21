# Coastline Transition Manager v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify a reusable Coastline Transition Manager that can stream between synthetic worlds today and support the private-island, mansion, apartment-elevator, and doorman transition patterns later.

**Architecture:** CTM is an engine-neutral ES-module subsystem under `src/transition/`. The active root route (`index.html` → `game-v3.html`) uses Three.js 0.170; the separate `/babylon/` foundation is an experimental path, not the root beta runtime. The production loader adapter for `game-v3.html` must therefore use a Three.js staging root (detached `Object3D`/`Group`) and explicit resource ownership callbacks. Do not wire a Babylon-only adapter into `game-v3.html`. A separate Babylon adapter is appropriate only if a future target is explicitly moved to `/babylon/`.

**Tech Stack:** Browser ES modules, JavaScript, Three.js 0.170 for `game-v3.html`, Node's built-in test runner, and Playwright. `/babylon/` is a separate Babylon classic-script prototype.

**Spec:** `docs/COASTLINE_TRANSITION_MANAGER_V1.md`

## Global Constraints

- Preserve near-field visual fidelity; CTM must optimize active-world scope rather than downgrade assets.
- CTM must not perform per-frame work proportional to registered-world count.
- Source world remains active until destination load, validation, activation, valid spawn, and state restoration succeed.
- CTM orchestrates transitions; persistent player/game state remains owned by the state layer.
- Duplicate transition requests must not create duplicate world instances.
- Failed preload/warm/activation must have deterministic recovery and leave the source world usable whenever possible.
- Engine-specific loading must remain behind an adapter; the adapter must match the actual target runtime.
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
- Adapter accepts injected implementations so synthetic tests never require a renderer.

- [ ] **Step 1: Write failing tests** for preload → warm → activate → deactivate → dispose, double-dispose safety, and load failure propagation.
- [ ] **Step 2: Run the focused loader tests and verify failure.**
- [ ] **Step 3: Implement the adapter and instance lifecycle.** Use a detached Three.js root for the `game-v3.html` target, keep root construction injected, and require an ownership-aware disposer rather than traversing/discarding possibly shared materials or textures.
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

### Task 6: Add bounded telemetry and the target-runtime loader adapter

**Files:**
- Create: `src/transition/transition-telemetry.mjs`
- Create: `src/transition/three-world-loader.mjs`
- Defer modifying `game-v3.html` until the standalone adapter and transition acceptance harness pass
- Create: `tests/transition-telemetry.spec.mjs`

**Interfaces:**
- Produces `TransitionTelemetry.start(...)`, `mark(...)`, `complete(...)`, `fail(...)`, `snapshot()` with bounded records.
- Three.js adapter stages a detached `Object3D` root; activation adds it to the scene, retirement removes it, and disposal calls only the world factory's explicit ownership-aware cleanup hook. A world factory is injected because the current procedural runtime has not yet defined a complete second-world asset manifest.
- Game integration exposes a single `window.__coastlineTransitionManager` diagnostic handle in test/dev mode without adding visible HUD noise.

- [ ] **Step 1: Write failing telemetry tests** for complete, failed, cancelled, and recovered transitions and bounded retention.
- [ ] **Step 2: Implement telemetry and verify focused tests pass.**
- [x] **Step 3: Implement the staged Three.js loader adapter** with an injected `prepareWorld` contract and no direct CDN or new package dependency.
- [ ] **Step 4: After A/B and browser smoke coverage is ready, wire CTM into `game-v3.html` behind a non-disruptive initialization path. Existing gameplay must remain playable if CTM initialization fails; no real-world gate is required yet.
- [ ] **Step 5: Run the existing inline-module syntax validation plus the focused CTM and Three.js adapter tests.**
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
- [ ] **Step 6: Run the relevant Coastline regression suites, including `npm run test:engine`, `npm run test:streaming-performance`, `npm run test:mega-patch2`, and the full browser shard command used by CI.**
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


## Execution checkpoint — transition manager and player-state handoff

- As of base commit `9e7f36e1165084b7fa64924627f745fc628aae1f`, CTM Tasks 1–3 have registry/loader contracts, explicit transition manager/state machine, cancellation/coalescing, source protection, and manager tests. The engine, system, and vehicle/fidelity/package jobs passed on that commit; browser shards were still running when last checked.
- Task 4 is implemented for staged review on branch `coastline-player-state-handoff-v1`: `src/transition/player-state-handoff.mjs` and `tests/transition-player-state.spec.mjs`. The snapshot schema preserves player status/position, active vehicle/condition/upgrades/customization, money/inventory, progression, mission state/progress, discoveries, time/weather, and world-specific state. Restore is validated before applying; optional destination backup/rollback hooks cover partial restore failure; source rollback remains injected and state-manager-owned.
- A local scratch run of `node --test 'tests/transition-*.spec.mjs'` reported 18 passed, 0 failed. This is not GitHub Actions evidence; the Task 4 branch is deliberately separate while the full browser run for the parent CTM head is active.
- The standalone Three.js adapter is implemented and tested in scratch; it is not yet wired into `game-v3.html` and no production world factory exists. The root beta index routes to Three.js `game-v3.html`; `/babylon/` is separate. Do not add a Babylon-specific runtime hook to the root beta.


## Execution checkpoint — provider-neutral transition gates (Task 5)

- Added `src/transition/gate-definition.mjs` to validate stable, serializable gate metadata for physical, masked and explicit transitions. It checks source/destination IDs, distance ranges, and destination/fallback spawn-point IDs.
- Added `src/transition/gate-providers.mjs` to normalize bridge/tunnel/door, elevator/doorman/garage, and explicit-travel requests to the same manager input. The masked provider passes an activation barrier callback separately from serializable gate metadata.
- Extended `TransitionManager` with an optional abortable activation barrier between `READY` and `TRANSFERRING`; this lets an elevator animation or doorman conversation complete the visual/interaction handoff without creating a separate transition pipeline. Cancellation while waiting is tested; telemetry records the wait as advisory.
- Added `tests/transition-gates.spec.mjs`. Combined local scratch verification: `node --check src/transition/transition-manager.mjs && node --test 'tests/transition-*.spec.mjs'` — **24 passed, 0 failed**. This includes registry/loader, manager, state handoff, and gate-provider suites; it is not yet GitHub Actions evidence.
- Saved on WIP branch `coastline-player-state-handoff-v1` after Task 4 so the in-progress browser run on parent SHA `9e7f36e` is not needlessly cancelled. Recheck that run before advancing PR #77.


## Execution checkpoint — bounded telemetry (Task 6, partial)

- Added `src/transition/transition-telemetry.mjs` with bounded retained transition records, bounded lifecycle event history, compact failure/recovery diagnostics, named milestone timings, and bounded whitelisted resource samples.
- Telemetry does not record frame-by-frame history or player-state snapshots. Unknown fields are excluded from events; resource samples accept finite non-negative counts only. Existing manager integration uses the documented `start/mark/complete/fail` hooks and safely treats telemetry as advisory.
- Added `tests/transition-telemetry.spec.mjs` for timing, failure/cancellation classification, record/event/resource retention bounds, snapshot isolation, integration with the manager, and invalid inputs.
- Local scratch verification: `node --check src/transition/transition-manager.mjs && node --check src/transition/transition-telemetry.mjs && node --test 'tests/transition-*.spec.mjs'` — **32 passed, 0 failed**. This is local evidence only.
- The active game-v3 target is Three.js, so the next runtime-specific step is a world factory that constructs a detached root and explicitly tracks owned resources. Three.js documents that `Object3D.add()` reparents objects and that geometries, materials, and textures require explicit disposal; shared resources must not be indiscriminately disposed. See [Object3D](https://threejs.org/docs/pages/Object3D.html) and [How to dispose of objects](https://threejs.org/manual/pages/how-to-dispose-of-objects.html). Babylon's equivalent `AssetContainer` staging applies only if `/babylon/` is separately selected: [Asset Containers](https://doc.babylonjs.com/features/featuresDeepDive/importers/assetContainers).


## Execution checkpoint — Three.js runtime adapter verified (Task 6, partial)

- Repository-source inspection confirmed that root `index.html` links to `game-v3.html?beta=20261016performance`; the active `game-v3.html` imports `three@0.170.0`. The separate `/babylon/index.html` loads `babylon.js` and `babylon/coastline-babylon.js`, and is not the root beta route.
- Replaced the planned wrong-engine Babylon adapter for `game-v3.html` with `src/transition/three-world-loader.mjs`. It stages a detached `THREE.Object3D`, warms without scene insertion, adds the root only during activation, removes it on deactivation, and calls an injected ownership-aware resource disposer. It intentionally avoids generic traversal/disposal of potentially shared geometry/material/texture objects.
- Added `tests/transition-three-loader.spec.mjs` covering staging, activation/deactivation, ownership-aware disposal, preload abort, and rejection/removal of premature live-scene insertion.
- Local scratch verification on the current WIP tree: `node --check src/transition/three-world-loader.mjs && node --check src/transition/transition-telemetry.mjs && node --test 'tests/transition-*.spec.mjs'` — **38 passed, 0 failed**.
- This is an adapter contract only: no second-world asset factory and no `game-v3.html` integration has been added. Browser regressions from parent CTM SHA `9e7f36e` remain independent blockers. Current CTM head is still being validated by the exact-SHA Actions run before this WIP stack should be fast-forwarded.
