# Coastline Elite Runtime AI Architecture

## Goal
Build Coastline toward an elite open-world simulation with believable NPCs, scalable traffic/crowds, live diagnostics, automated recovery, and AI-assisted world evolution without copying proprietary game code or assets.

## Architectural principles learned from current AAA-style systems

1. **Data-oriented simulation for scale.** Keep high-volume NPC/traffic state in compact arrays or pooled records; update only what needs simulation each frame. Unreal's MassEntity is designed around this principle and targets very large agent counts. [Epic MassEntity / Mass AI]
2. **Hierarchical decision making.** Use a small fast state machine/StateTree-like layer for durable modes, with utility scoring for choices inside a mode. This keeps behavior explainable while allowing emergent decisions.
3. **World queries separate from decisions.** NPCs ask the world for nearby roads, sidewalks, destinations, hazards, free parking, shops, and interaction points. Decision logic should not hard-code map coordinates.
4. **Smart-object interactions.** Treat benches, doors, shops, crosswalks, parking spaces, fuel/charge points, traffic lights and service bays as reservable activities rather than special-case NPC code.
5. **Navigation is layered.** Long-range routing follows road/sidewalk corridors; local steering handles collision avoidance; emergency recovery handles blocked/stuck agents.
6. **Perception is event driven.** Sight, proximity, traffic events, sounds and world changes create stimuli. NPCs should not perform expensive full-world searches every frame.
7. **Debugging is part of the runtime architecture.** AAA engines expose AI state, perception, navigation and query information while running. Coastline should have an equivalent lightweight developer overlay.
8. **Runtime inference should be optional and budgeted.** If an ML model is eventually used, run it asynchronously/frame-sliced and only for decisions that benefit from learned behavior. Deterministic gameplay systems remain the safety net.

## Coastline AI layers

### Layer 0 — Runtime Health Guardian
Continuously samples:
- FPS/frame time
- renderer errors
- NaN/Infinity transforms
- objects below/above world bounds
- traffic agents that stop unexpectedly
- NPCs stuck in place
- vehicles overlapping for too long
- invalid waypoint/path requests
- runaway object counts
- expensive update spikes

Recovery actions are conservative and reversible:
- clamp invalid transforms
- respawn/reset stuck traffic to a valid road lane
- relocate stuck NPCs to the nearest valid sidewalk node
- discard invalid waypoints
- reduce simulation detail for distant agents
- throttle non-critical systems during frame-time spikes

Every automatic correction records a compact diagnostic event so the system never silently hides a recurring defect.

### Layer 1 — World Simulation Director
Maintains the city's high-level activity:
- traffic density
- pedestrian density
- district activity
- time/weather state
- events/incidents
- parking availability
- service/shop activity
- emergency or unusual traffic conditions

It should adapt population density and update frequency to player location and device performance.

### Layer 2 — NPC State + Utility Brain
Core states:
- commute
- wander
- shop
- eat
- work
- socialize
- wait
- cross street
- drive
- park
- react to hazard
- flee/avoid
- investigate
- return home

Utility scores choose among valid actions using needs, time, distance, safety, crowding, money/job context and recent events.

### Layer 3 — Perception/Event Bus
Examples:
- player vehicle nearby
- traffic light changed
- collision occurred
- loud event
- shop opened/closed
- road blocked
- destination reached
- weather changed
- NPC saw another agent

Events are cheap records consumed by interested agents rather than global polling.

### Layer 4 — Smart World Objects
Every meaningful interaction exposes:
- location
- capacity
- reservation state
- interaction type
- approach points
- availability
- animation/action hints

This lets NPCs and eventually the player use the same interaction framework.

### Layer 5 — Navigation
Maintain separate conceptual graphs for:
- vehicle lanes
- sidewalks
- crossings
- parking
- service access

Use local steering/avoidance on top of route selection. If a route becomes invalid, the agent requests a new route instead of freezing.

## AI QA / self-healing loop

`observe -> detect anomaly -> classify -> attempt safe recovery -> verify -> log -> escalate`

The runtime AI should **not rewrite arbitrary game code in a live player session**. Instead, it identifies reproducible failures and creates structured bug reports containing:
- build ID
- subsystem
- coordinates
- NPC/vehicle ID
- recent events
- frame-time data
- state before failure
- attempted recovery
- whether recovery succeeded

An external development agent can then inspect those reports and modify the repository during development. This provides AI-assisted correction without allowing an uncontrolled model to mutate a live production build.

## Developer AI loop

1. Runtime captures a deterministic bug signature.
2. Local diagnostics overlay shows the signature.
3. Optional test harness replays the same scenario.
4. Development AI reads the report and relevant source.
5. AI proposes/implements a minimal correction.
6. Automated structural tests run.
7. New build is deployed.
8. Runtime telemetry confirms whether the signature disappeared.

## Performance strategy

- Simulation LOD: full / medium / ambient / dormant.
- Distance-based AI tick rates.
- Object pooling for NPCs, traffic and effects.
- Instancing for repeated geometry.
- Frame budgets for AI, navigation, animation and world generation.
- Background/precomputed world queries where possible.
- Graceful quality scaling when frame time exceeds target.

## Full-scale next overhaul

### Visuals
- richer PBR materials
- more distinctive building silhouettes
- better road markings and signage
- improved lighting/exposure
- vehicle-specific geometry rather than scale-only variants
- reflections and glass refinement
- denser but performance-aware street dressing
- stronger district identity

### Driving
- suspension/body response
- traction and tire behavior
- differentiated vehicle handling
- traffic lane discipline
- intersection behavior
- parking
- near-miss/collision response
- vehicle damage/state system

### Living city
- utility-driven pedestrians
- destination-based movement
- shops and smart objects
- dynamic traffic density
- ambient events
- reactive NPCs
- day/night activity changes

### Engineering
- staged loading
- runtime health guardian
- diagnostics overlay
- deterministic test scenarios
- performance telemetry
- automated regression checks
- AI-assisted bug triage

## Guiding rule

Coastline should evolve through **systems that reinforce one another**, not isolated gimmicks. A road should support traffic, pedestrians, parking, businesses, navigation, events and AI decisions. A vehicle should affect traffic, handling, tuning, collisions, visuals and economy. A world object should be useful to both NPCs and the player whenever practical.
