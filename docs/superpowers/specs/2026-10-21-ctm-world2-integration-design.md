# CTM + World 2 Integration Design

- **Date:** 2026-10-21
- **Status:** Draft for user review
- **Scope:** Integrate the existing Coastline Transition Manager (CTM) with the live game runtime and establish a real, deterministic World 2 streaming boundary. This phase does **not** build the final island art/content.

## 1. Goal and success criteria

Coastline should be able to move from the existing City/World 1 into a real World 2 shell through a bridge/tunnel-style transition without coupling world content to the core game loop.

Success means:

1. World 1 continues to load and play normally when CTM is present.
2. The live browser game uses the same CTM implementation already covered by lifecycle tests; the browser adapter is not a disconnected demo.
3. At initial startup exactly one gameplay world is resident.
4. During a transition, the destination may be staged while the source remains alive for failure safety; after success exactly one world is resident.
5. World 2 has a deterministic loader/unloader boundary and can be replaced later by the full island implementation without changing CTM contracts.
6. Player state and an allowed vehicle's state cross the boundary deterministically and are placed at the transition's destination spawn.
7. A destination-load failure leaves World 1 active and playable, with no half-installed World 2.
8. Returning from World 2 can restore the saved World 1 entry point rather than relying on a single global return-point slot.
9. Browser regression coverage verifies the real integration and the one-resident-world invariant.
10. No visual-quality reduction is introduced as a workaround for transition/performance work.

## 2. Architectural approach

### Recommended approach: CTM as an orchestration boundary

Keep the current CTM as the authoritative lifecycle coordinator, but make its world definitions adapters around the existing game runtime. The game should not be rewritten into a generic engine during this phase.

The runtime owns Three.js scene, player, vehicle, NPC, lighting, and gameplay systems. CTM owns only lifecycle decisions: which world is active, when a destination is staged, when the source is disposed, transition state, failure recovery, and persisted return information.

The existing placeholder browser adapter is therefore upgraded from a standalone demonstration to a thin integration layer. It should not duplicate the actual City world or create a second gameplay loop.

### Alternatives considered

1. **Full rewrite around CTM:** strongest abstraction, but too invasive and risks destabilizing the current game.
2. **Keep the browser adapter as a demo:** lowest effort, but does not solve the real problem because the shipped game would not use CTM.
3. **Recommended — runtime adapter boundary:** minimal architectural change, real integration, testable lifecycle, and a clean path to later Island/Mansion/Interior worlds.

## 3. World lifecycle contract

Each world definition exposes:

- `id`
- `load({ worldId, context, transition, transitionState, reason }) -> handle`
- `unload(handle, { context, transition, transitionState, failed })`
- optional `captureState(...)`
- optional `restoreState(...)`

The handle represents the resources owned by that world. CTM must not depend on Three.js implementation details inside the handle.

### Resident-world invariant

- Startup: one resident world.
- Transition staging: source + destination may coexist temporarily.
- Successful completion: destination only.
- Failed destination load: source only.
- There must never be a state where a failed destination is installed as active.

This intentionally permits a short two-world staging window because it provides the safest failure semantics. Performance work should later minimize that window rather than compromise failure safety.

## 4. World 1 integration

World 1 is the existing Coastline City runtime. Its current rendering, vehicle, NPC, map, UI, and gameplay systems remain authoritative.

The integration layer should expose the existing runtime state to CTM rather than duplicating it. At minimum the transition context must provide:

- player position/orientation and relevant movement state;
- current vehicle identity, position/orientation, velocity and other state required to preserve the vehicle;
- scene/runtime references needed by the world unload adapter;
- transition UI/fade hooks if already available.

World 1's loader should become the normal initial CTM activation path, but the visible result should remain the same as current startup.

## 5. World 2 shell

World 2 initially consists of a deterministic shell, not the final island.

The shell must have:

- its own world id and isolated lifecycle;
- a bounded root/group or equivalent resource ownership boundary;
- deterministic load and unload behavior;
- a known destination spawn;
- enough visible geometry to prove that the active world changed;
- no dependency on World 1 being resident after transition completion.

The final island, bridge/tunnel scenery, mansion, and higher-fidelity assets are explicitly deferred. The shell exists to prove the architecture before expensive content is added.

## 6. Transition behavior

The first real transition is:

`world-1-city -> bridge/tunnel -> world-2-island-shell`

with a matching return transition.

The transition definition uses:

- trigger: `bridge` (or `tunnel` if the physical implementation is chosen accordingly);
- vehicle policy: `allowed`;
- deterministic `destinationSpawn`;
- source/destination world ids;
- optional transition presentation hooks.

Vehicle state is preserved when the player enters with a vehicle. The destination adapter is responsible for placing the vehicle/player at the destination spawn because the current CTM validates and transports the transition state but deliberately does not own game-specific spatial placement.

## 7. Return-point/state persistence

The current CTM has the right direction—world-specific saved return points—but the integration should make this explicit and deterministic.

Return data should be keyed by world id rather than relying only on `lastReturnPoint`. A round trip should therefore behave conceptually as:

`City entry A -> Island -> City entry A`

rather than:

`City entry A -> Island -> arbitrary/latest global point`.

World state is likewise scoped to the world that owns it. The CTM should not become a general save-game database; it only retains the minimum lifecycle/return state required for a world transition.

## 8. Failure and recovery

Destination loading occurs before source disposal.

If destination loading fails:

1. World 1 remains active.
2. Any partially created World 2 handle is unloaded defensively.
3. CTM emits `transition:failed` with deterministic error metadata.
4. CTM returns to `active` state for World 1.
5. No vehicle/player state is silently discarded.
6. A retry remains possible without a page reload.

If source disposal fails after destination staging, the implementation must not silently claim a clean transition. The failure path should preserve diagnostic information and avoid leaving CTM in an ambiguous state. The implementation plan should include an explicit policy for this edge case before coding it.

## 9. Transition presentation

“Seamless” is defined in this phase as a controlled, non-broken handoff—not necessarily zero-loading-time streaming.

The first implementation may use the existing game presentation layer to hide staging/unloading with a short fade or bridge/tunnel occlusion. No fake loading delay should be added merely to simulate seamlessness.

Later optimization can overlap asset fetch/decompression with the physical bridge, tunnel, elevator, or doorway so the player experiences the transition as continuous travel.

## 10. Testing

### Unit/lifecycle tests

Extend the existing CTM tests to cover:

- destination spawn is passed through unchanged;
- per-world return points survive round trips;
- destination failure leaves the source active;
- partially created destination handles are disposed;
- successful transition leaves exactly one resident world;
- allowed vehicle state is preserved;
- transition concurrency remains rejected.

### Browser integration tests

Add browser coverage against the real game runtime/test hooks for:

1. City startup through CTM.
2. City -> World 2 transition.
3. World 2 is the only resident world after success.
4. Player/vehicle arrival state is deterministic.
5. World 2 -> City round trip.
6. City return point is restored.
7. Injected World 2 load failure leaves City active.
8. A retry can succeed after the injected failure is removed.

Tests must use deterministic state/frame controls where possible. Do not depend on wall-clock `expect.poll` loops for transitions when the main thread is intentionally busy.

## 11. Performance constraints

This architecture is intended to improve performance by reducing the amount of simultaneously active world content, not by lowering close-range visual quality.

The implementation must not:

- reduce texture quality to make transitions pass;
- remove existing visual systems merely to create World 2;
- permanently reduce draw distance as a transition workaround;
- duplicate full City content into World 2.

The temporary staging window is the main expected memory spike. Instrumentation should make it visible so later optimization can target it with evidence.

## 12. Future topology enabled by this contract

The same lifecycle contract should support:

`City -> Bridge/Tunnel -> Island -> Mansion -> Garage/Door -> Interior World 3`

and separately:

`Apartment Rooftop -> Elevator -> Home World`

These future worlds are not part of this implementation. Their inclusion here is only to ensure the interface does not block them.

## 13. Out of scope

- Final World 2 island art and layout.
- Mansion/interior content.
- Full seamless streaming/prefetch system.
- New gameplay missions.
- Landmark discovery/rewards (already removed).
- Broad rendering optimization unrelated to world residency.
- Replacing the existing Three.js runtime with a new engine.

## 14. Acceptance gate

This phase is complete when the shipped `game-v3.html` runtime exercises CTM for the City -> World 2 shell transition, the browser tests verify the real lifecycle and failure behavior, and the final successful state has exactly one resident world without reducing World 1 visual quality.
