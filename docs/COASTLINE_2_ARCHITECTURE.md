# Coastline 2.0 Architecture

## Goal

Move Coastline from a renderer-led prototype toward a browser-first simulation in which a shared **world truth** layer drives roads, terrain, navigation, traffic, parking, actors, collision, damage, missions and rendering.

This is inspired by recurring large-world engineering principles rather than copied proprietary game code: spatial partitioning, streamed world data, navigation graphs, AI simulation LOD, event-driven interactions, and data-driven rendering.

## Current foundation

### World truth — `world-model.js`

The deterministic world model now exposes:

- road identity and nearest-road queries
- lane placement
- sidewalk placement
- parking-space placement
- region/chunk keys and bounds
- deterministic terrain height
- intersection nodes

All future systems should query this layer instead of independently guessing where roads, sidewalks or parking areas are.

### Runtime — `world-engine.js`

The runtime contains independent services for:

- spatial hashing and nearby-entity queries
- world entity registration/movement
- chunk bookkeeping
- simulation LOD and AI tick rates
- parking reservations
- collision response profiles
- vehicle/environment damage state
- world events

This keeps simulation state separate from Three.js rendering state.

## Target runtime flow

```text
WORLD TRUTH
   |
   +-- terrain / roads / buildings / parking
   |
NAVIGATION
   |
   +-- pedestrians / traffic / wildlife
   |
PHYSICS + COLLISION
   |
   +-- impact events / damage / avoidance
   |
SIMULATION LOD
   |
   +-- full near player -> reduced -> proxy -> persisted
   |
RENDERING
   |
   +-- LOD / instancing / lighting / materials
```

## Why this architecture

Large-world talks repeatedly identify the same pressure points: navigation must coexist with streaming, dynamic world changes need a predictable base representation, and AI needs multiple levels of simulation. GDC's open-world navigation material and modern large-NPC talks are useful references for these principles.

For the browser, we intentionally use cheaper equivalents:

- road graph instead of a full AAA traffic stack
- deterministic region/chunk data instead of a giant always-loaded world
- spatial hash instead of expensive global collision queries
- simulation LOD instead of full-rate AI for every actor
- Three.js LOD and InstancedMesh for repeated geometry

Three.js documents both `LOD` and `InstancedMesh` specifically as mechanisms for reducing rendering work at distance and reducing draw calls for repeated geometry.

## Parking rule

An unused vehicle should never be treated as a free-floating decorative object. It must either:

1. reserve a valid parking space,
2. be an active traffic participant, or
3. be an explicitly authored roadside exception.

This directly prevents the current failure mode where parked vehicles appear in active lanes.

## Collision rule

Collision responses should be low-restitution by default. Coastline previously exhibited an undesirable bounce/glitch failure after repeated impacts. The new collision profiles intentionally separate blocking, restitution, impulse scaling and damageability.

## Damage rule

Damage is world state, not just an animation. Vehicle impacts accumulate directional damage and structural/glass damage. Environmental objects have material-specific response categories so a tree, pole, building and fence can react differently.

## Simulation LOD

Suggested initial tiers:

- LOD 0: <=80 m — full AI/physics/animation, ~30 Hz decision work
- LOD 1: 80–220 m — reduced decision work, normal movement
- LOD 2: 220–520 m — proxy simulation/state updates
- LOD 3: >520 m — persisted state, no per-frame actor work

These distances are tuning values, not hard design requirements.

## Rendering direction

Use Three.js `LOD` for buildings/vegetation/props and `InstancedMesh` for repeated low-cost objects. Avoid attempting to reproduce proprietary virtualized-geometry systems; reproduce the principle of only spending GPU work where it is visible and useful.

## Next integration stages

1. Wire `createWorldArchitecture()` into `game-v3.html`.
2. Replace ad-hoc parked vehicle placement with parking reservations.
3. Give pedestrians solid local collision/avoidance and sidewalk targets.
4. Route traffic through shared road/lane data.
5. Emit collision events and connect them to vehicle/environment damage.
6. Replace flat terrain/road transitions with layered shoulders, curbs and height-aware terrain.
7. Add visual LOD and instancing for repeated world props.
8. Add browser tests for each regression class plus screenshot-based visual smoke checks.

The implementation should remain browser-first and static. No model/API call should be required at runtime.
