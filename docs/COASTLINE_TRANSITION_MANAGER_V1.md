# Coastline Transition Manager v1

## Goal

Create a reusable world-transition system that lets Coastline scale from one large outdoor world into many streamed worlds and small high-fidelity interiors without turning each transition into a fragile special case.

## Design principles

1. **Visual fidelity is not the optimization target.** CTM reduces runtime cost by limiting which worlds, assets, collisions, AI, and interactions are active—not by degrading near-field visuals.
2. **A world is a streaming unit.** A world may be a city, island, apartment, mansion, garage, rooftop, office floor, hotel suite, or other intentionally bounded space.
3. **Transitions are gameplay-aware.** A bridge, tunnel, elevator, garage, doorway, doorman conversation, ferry, train, or explicit travel command can all invoke the same transition pipeline.
4. **The current world is protected until the destination is safe.** Destination failure must never strand the player or destroy the active world.
5. **CTM orchestrates; it does not own game state.** Persistent player/game state belongs to a separate state manager and is handed off through a stable interface.
6. **Two-world overlap is the normal path.** The destination may preload and warm while the source remains active.
7. **Every transition is observable.** Timing, failures, resource counts, and recovery are recorded for debugging and performance tuning.

## Core architecture

```text
                    COASTLINE TRANSITION MANAGER
                                 |
             +-------------------+-------------------+
             |                   |                   |
       World Registry       State Handoff        Telemetry
             |
        World Manifest
             |
        Transition Gate
             |
       Transition State Machine
             |
       World Loader Adapter
             |
      Asset/Scene Containers
             |
       Active / Warming World
```

### Required components

- `WorldManifest`: declarative definition of a world and its resource/streaming policy.
- `WorldRegistry`: resolves stable world IDs and validates manifests.
- `TransitionManager`: public API for requesting, cancelling, and observing transitions.
- `TransitionStateMachine`: explicit lifecycle and failure/recovery rules.
- `GateDefinition`: transition trigger metadata and preload/activation distances.
- `WorldLoaderAdapter`: engine-specific loading boundary; CTM must not hard-code the game into one asset-loading implementation. The current root beta route uses Three.js in `game-v3.html`; a Babylon adapter only applies to the separate `/babylon/` prototype unless the selected runtime changes.
- `PlayerStateHandoff`: read/restore contract for persistent gameplay state.
- `TransitionTelemetry`: structured metrics for each transition.
- `TransitionTestWorlds`: deterministic synthetic A/B worlds used before real World 2 integration.

## World manifest

Each world has a stable ID and version. Minimum fields:

```js
{
  id,
  version,
  assetManifest,
  entryPoints,
  gates,
  spawnPoints,
  memoryBudget,
  streamingPriority,
  collisionPolicy,
  aiPolicy,
  missionPolicy,
  environment,
  persistencePolicy
}
```

World IDs must be stable and must not depend on display names.

Examples:

- `world-001` — Coastal City
- `world-002` — Private Island
- `world-003` — Mansion Interior
- `world-apartment-rooftop-001`
- `world-apartment-001`
- `world-garage-001`

## Gate model

Gate definitions are provider-neutral. The gate identifies the source and destination and supplies the trigger semantics; the transition pipeline remains identical.

Supported v1 gate types:

- `physical`: bridge, tunnel, road, stairwell, doorway.
- `masked`: elevator, doorman interaction, garage entry, cinematic corridor, ferry/train.
- `explicit`: intentional travel or fast-travel command.

Minimum gate fields:

```js
{
  id,
  fromWorld,
  toWorld,
  type,
  preloadDistance,
  activationDistance,
  spawnPoint,
  fallbackPoint
}
```

A provider may delay activation until an interaction or animation reaches a safe handoff point.

## Transition lifecycle

Normal lifecycle:

```text
IDLE
  -> REQUESTED
  -> PRELOADING
  -> WARMING
  -> READY
  -> TRANSFERRING
  -> ACTIVATING
  -> RETIRING_OLD_WORLD
  -> UNLOADING
  -> COMPLETE
```

Failure/recovery paths:

```text
PRELOADING -> FAILED -> SOURCE_REMAINS_ACTIVE
WARMING -> FAILED -> SOURCE_REMAINS_ACTIVE
ACTIVATING -> RECOVERING -> SOURCE_OR_SAFE_WORLD
```

Cancellation must be safe before activation. Repeated requests for the same destination must coalesce instead of creating duplicate world instances.

## Destination loading stages

CTM supports progressive loading:

1. **Awareness:** identify the likely destination early.
2. **Coarse preload:** terrain, major structures, roads, environment, and other assets required to establish the destination.
3. **Fidelity preload:** high-value near-field buildings, vegetation, vehicles, textures, lighting, and visual detail.
4. **Gameplay preload:** collision, NPCs, AI, missions, and interactions required at activation.
5. **Warm:** prepare the destination without exposing it as active gameplay.
6. **Validate:** confirm required assets, spawn point, state handoff, and world integrity.
7. **Activate:** make the destination authoritative for player gameplay.

The source world remains active throughout preloading/warming.

## Safe retirement rules

The old world may not unload until all are true:

- destination loaded
- destination validated
- destination activated
- spawn point valid
- player state restored
- no unrecoverable transition error

If any requirement fails, the source world remains available whenever possible.

## Persistent state

CTM requests state transfer but does not become the owner of player/game state.

The handoff contract must support at minimum:

- player position/status
- active vehicle and vehicle condition
- vehicle upgrades/customization
- inventory and money
- reputation/progression
- active mission and mission progress
- discoveries/persistent world flags
- time/weather continuity
- world-specific persistent state

State transfer must be atomic from the perspective of the destination activation: partial restoration must not leave the player in an invalid state.

## Resource lifecycle

The target-runtime loader adapter must support:

- load without immediately activating gameplay
- warm/prepare
- activate
- deactivate
- dispose/remove
- release references
- report failures

For the root Three.js runtime, stage a detached `Object3D`/`Group` and add it only at activation; remove it during retirement. Require explicit ownership-aware resource disposal because Three.js resources can be shared. Babylon `AssetContainer` is an equivalent only for the separate `/babylon/` path; do not assume it can load into a Three.js scene.

## Performance contract

CTM must support the existing Coastline performance strategy:

- keep near-field visual fidelity intact
- stream distant or inactive worlds out of the active scene
- avoid duplicate copies of the same world
- keep collision and AI bounded to active/warming requirements
- expose resource telemetry rather than guessing at performance
- allow small interiors to use a higher fidelity budget than outdoor worlds
- avoid synchronous full-world replacement during gameplay

CTM itself must remain lightweight and must not introduce per-frame work proportional to the number of registered worlds.

## Initial real-world topology

The first intended production topology is:

```text
WORLD 1 — COASTAL CITY
   |
   +-- bridge / tunnel --> WORLD 2 — PRIVATE ISLAND
                              |
                              +-- mansion garage --> WORLD 3 — MANSION INTERIOR
                              |
                              +-- mansion front door --> WORLD 3 — MANSION INTERIOR
```

Additional patterns to validate later:

```text
WORLD 1 — CITY
   |
   +-- apartment elevator --> APARTMENT INTERIOR
   |
   +-- doorman conversation --> LUXURY APARTMENT
   |
   +-- rooftop elevator --> ROOFTOP / INTERIOR WORLD
```

The doorman and elevator are examples of masked gates: their interaction/animation creates a natural preload window without requiring a visible loading screen.

## Telemetry

Every transition receives a unique transition ID and records, where available:

- source and destination world IDs
- gate ID/type
- request timestamp
- preload/warm/ready/transfer/activation/unload timestamps
- total transition duration
- asset counts and failures
- estimated memory/resource usage
- active meshes/geometries/textures
- draw calls/triangles
- active NPC/collision counts
- player/vehicle state handoff status
- cancellation/failure/recovery reason

Telemetry must be bounded and must not retain unbounded per-frame history.

## v1 acceptance tests

Before integrating World 2, deterministic synthetic worlds A and B must prove:

1. A -> B completes and B becomes active.
2. B -> A completes.
3. Player/vehicle/mission state survives the handoff.
4. Destination asset failure leaves A active.
5. Activation failure invokes recovery without corrupting state.
6. Cancellation before activation leaves A active.
7. Rapid A -> B -> A -> B requests do not duplicate world instances.
8. Retired worlds release their owned resources.
9. Transition telemetry contains complete lifecycle timings and failure reasons.
10. The transition path does not introduce a fixed full-world synchronous stall.
11. Gate providers can invoke the same CTM pipeline for physical and masked transitions.
12. A second transition request cannot mutate the active transition's source/destination state unexpectedly.

## Out of scope for CTM v1

- Building the actual private island.
- Building the mansion interior.
- Creating final elevator/doorman art or animation.
- Full save-game architecture beyond the handoff contract.
- Multiplayer world synchronization.
- Background simulation of worlds that are fully unloaded.

Those become consumers of CTM after the manager is proven.

## Definition of complete

CTM v1 is complete when the manager can register manifests, resolve gates, preload/warm a destination, validate it, transfer persistent state, activate it, safely retire the source, recover from destination failure, and prove the full lifecycle through automated synthetic A/B tests and runtime telemetry—without requiring a real second world.