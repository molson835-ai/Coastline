# Coastline Transition Manager (CTM) Specification

**Status:** Design approved by project owner; implementation pending.
**Scope:** CTM v1 foundation only. World 2 content is a later consumer.

## Goal

Create a renderer-agnostic Transition Manager that can move Coastline between independently loaded worlds while preserving player-relevant state, unloading the previous world, recovering safely from load failures, and exposing deterministic hooks for automated tests.

## Existing architecture constraints

Coastline already has a deterministic world-truth layer in `world-model.js` and runtime services in `world-engine.js`, including chunk bookkeeping, spatial queries, simulation LOD and world events. The current architecture explicitly favors deterministic region/chunk data and browser-scale streaming rather than one permanently resident giant world. `game-v3.html` already creates the world architecture and is the active browser game. CTM must build on those boundaries rather than replacing them. fileciteturn38file0L2-L2

## Core concepts

### WorldDefinition

A registered world has:

- stable `id`
- human-readable `name`
- asynchronous `load(context)` returning a loaded-world handle
- asynchronous `unload(handle, context)`
- optional `captureState(context)` / `restoreState(state, context)` hooks for world-local durable state
- explicit default spawn/return point
- optional metadata describing whether a vehicle is allowed in the world

World definitions are data/configuration plus loader callbacks; they must not contain arbitrary executable generated content.

### TransitionDefinition

A transition has:

- stable `id`
- `fromWorld`
- `toWorld`
- trigger type (`bridge`, `tunnel`, `garage`, `door`, `elevator`, or generic)
- destination spawn point
- optional return point override
- vehicle policy (`required`, `allowed`, `forbidden`)
- optional transition payload for authored context

A transition is invalid if its source or destination world is not registered.

### TransitionManager

The CTM owns exactly one active world at a time.

Required public operations:

- `registerWorld(definition)`
- `registerTransition(definition)`
- `getActiveWorldId()`
- `getStatus()`
- `canTransition(transitionId, context)`
- `transition(transitionId, context)`
- `restoreLastReturnPoint()`
- `dispose()`

`transition()` is asynchronous and serialized. A second transition request while one is in progress must not start a competing load/unload sequence.

## Transition lifecycle

The canonical lifecycle is:

1. validate transition and current world
2. capture player state, vehicle state and active-world state
3. enter `preparing`
4. load destination world into an isolated staging handle
5. validate that the destination loaded successfully
6. suspend/unregister detailed simulation for the outgoing world
7. unload/dispose outgoing world
8. activate destination world
9. restore player/vehicle state using the destination spawn/return policy
10. restore destination-local state
11. emit completion event and enter `active`

The outgoing world must remain usable until the destination has successfully loaded. A failed destination load must leave the current world active and restore the manager to `active` without corrupting player state.

## State preservation

CTM must preserve, at minimum:

- player position/rotation/locomotion mode
- vehicle presence, identity and basic transform/state when a vehicle is carried through
- cash/progression and other global player state through the existing game persistence layer rather than duplicating ownership inside CTM
- source world and return point needed to come back through the same transition

CTM must not create a second authoritative cash/progression store.

Vehicle policy is authoritative per transition. A `required` transition cannot be completed on foot; a `forbidden` transition must safely detach/store the vehicle according to the game adapter; an `allowed` transition may carry it through.

## World residency and performance

Only one fully active world may be resident in CTM v1. Destination loading is staged before outgoing disposal. After successful activation, the outgoing world handle must be disposed and no longer participate in the active simulation loop.

CTM must not globally lower visual quality as a transition optimization. World performance comes from staged loading, disposal/unloading, spatial/chunk management and simulation LOD already established by Coastline's architecture.

## Events and observability

CTM emits deterministic lifecycle events with the transition ID and world IDs:

- `transition:started`
- `transition:loading`
- `transition:unloading`
- `transition:completed`
- `transition:failed`
- `world:activated`
- `world:disposed`

`getStatus()` must expose enough information for tests and diagnostics to identify current state, active world, transition ID and last failure without exposing internal implementation objects.

## Failure behavior

Failures must be bounded and recoverable:

- destination load rejection/timeout: keep source world active
- invalid transition: reject before mutating world state
- unload failure after destination load: report failure and dispose the staged destination if possible; never silently claim success
- restore-state failure: report failure with a recoverable manager state
- repeated transition request: reject/queue deterministically; v1 should reject while busy rather than maintain an implicit queue

Errors must retain their original message/cause for diagnostics.

## Initial integration target

CTM v1 should be integrated behind a minimal testable bridge/tunnel transition between placeholder `world-1` and `world-2` definitions. The second world may be a lightweight deterministic placeholder; its purpose is to prove the transition lifecycle, not to build the island yet.

Future consumers include:

- World 1 city → World 2 island via bridge/tunnel
- vehicle → garage → interior World 3
- apartment rooftop → elevator → home
- front door/doorman → separate interior world

Those future transitions must use the same CTM interface rather than creating one-off loaders.

## Test requirements

Node tests must cover:

1. world registration and invalid-definition rejection
2. transition registration and source/destination validation
3. World 1 → World 2 successful transition
4. World 2 → World 1 return transition
5. serialized transition behavior while busy
6. player/vehicle state preservation
7. vehicle-required and vehicle-forbidden policies
8. failed destination load leaves source world active
9. outgoing world disposal after successful activation
10. deterministic lifecycle events/status
11. restore-last-return-point behavior
12. no duplicate active-world residency after a successful transition

Browser smoke coverage must additionally prove that CTM is available to the active `game-v3.html` runtime and that the bridge/tunnel transition can be invoked through a deterministic test hook without depending on wall-clock waits.

## Non-goals for CTM v1

- building the actual World 2 island
- interior art/content
- network multiplayer/shared world state
- background loading of multiple fully active worlds
- replacing `world-engine.js`
- replacing the existing persistence system
- lowering graphics quality to make transitions pass

## Definition of done

CTM v1 is complete only when the deterministic tests pass, browser smoke coverage passes, a real candidate build exposes the transition hook, and the successful transition demonstrably leaves only the destination world active while preserving required player/vehicle state. A deployment or field playtest is not claimed merely from unit-test success.
