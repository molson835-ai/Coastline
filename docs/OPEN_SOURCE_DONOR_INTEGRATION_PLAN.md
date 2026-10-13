# Open-Source Donor Audit and Coastline Acceleration Plan

Last reviewed: 2026-10-13

## Objective

Improve Coastline's world consistency, driving, traffic, pedestrians, missions, performance, and maintainability by selectively adapting proven open-source systems. Preserve Coastline's existing playable build, mobile support, branding, and gameplay tests. No paid APIs, services, or mandatory hosted backends.

## Recommended donor strategy

### Primary donor: Overdrive City

Repository: https://github.com/appleweiping/overdrive-city  
License: MIT (repository LICENSE; copyright 2026 appleweiping)  
Live demo: https://appleweiping.github.io/overdrive-city/

Why it is the best first donor:
- Static browser game using Three.js and plain ES modules; no build step required by the donor.
- A deterministic tile grid is the shared source of truth for roads, sidewalks, parks, buildings, collision, traffic direction, line-of-sight, and mission placement.
- Dedicated modules for city generation, city meshes, traffic, vehicles, pedestrians, missions, police, effects, audio, HUD, and day/night.
- Lane-aware traffic, parked enterable vehicles, pedestrian flee behavior, ten mission archetypes, and a design/tuning document.
- Its own README states the project is original and the source is MIT licensed.

Best systems to adapt first:
1. City/tile-map concepts and stable shared road/collision coordinates.
2. Traffic lane directions and intersection route selection.
3. Pedestrian sidewalk placement, flee states, and purposeful state transitions.
4. Data-driven mission archetypes and tuning configuration.
5. Instanced/merged scenery and pooled effects if performance profiling shows a need.

Important integration cost:
Overdrive City is modular ES modules, while Coastline's current `game-v3.html` is a single-file Three.js prototype. Its modules assume a shared `world` object and tile-map APIs. Copying individual files directly into Coastline will not work without adapting their dependencies and lifecycle. Port concepts and narrow modules behind Coastline interfaces; do not wholesale-replace the current game without a side-by-side prototype and mobile comparison.

### Secondary reference: GTA 7

Repository: https://github.com/depixeled-chris/gta7  
License: MIT (repository LICENSE; copyright 2026 Chris Sparks)  
Live repository README: https://github.com/depixeled-chris/gta7

Use it primarily as an architecture and test-design reference:
- Pure simulation/core modules separated from Three.js rendering.
- Shared input abstraction for keyboard and touch.
- Unit tests for deterministic math, city generation, collision, and driving.
- Explicit mobile quality settings, vehicle collision, pedestrian hit reactions, and pooled debris/effects.

Do not merge its full game. It uses TypeScript/Vite and a different module architecture, so direct adoption would require a larger migration. If a specific source module is copied later, preserve its MIT notice and check third-party asset/music licensing separately.

### Research-only candidate: Mini GTA 6

Repository: https://github.com/imNauman/mini-gta6  
It uses Three.js, TypeScript, and Rapier physics and has relevant vehicle/pedestrian features. A suitable reuse license was not verified during this audit. Do not copy or distribute its code unless a clear license is added or the author grants permission. It may still be studied for high-level ideas.

## Coastline's current constraints

- Live game: https://molson835-ai.github.io/Coastline/
- Current browser build is primarily `game-v3.html`, a single-file Three.js prototype.
- Coastline already has mobile controls, vehicle entry/exit, basic procedural city generation, pedestrians, ambient traffic, a mission, diagnostics, and a Playwright gameplay watchdog.
- Current tests exercise startup, on-foot movement, vehicle/building collision, walking/building collision, and mobile controls.
- The current map and collision are not driven by one shared road/terrain data model. That is the likely architectural source of recurring terrain/road mismatch bugs.
- Keep `game-v2.html` as a stable separate reference; do not delete it during the first integration stages.

## Proposed implementation phases

### Phase 0 — Stabilize the current branch
- Finish and review the pending terrain/road/pedestrian-reaction change before layering in donor systems.
- Verify the full browser test suite on the final PR head SHA.
- Keep a rollback point and preserve the existing live build if visual results regress.

### Phase 1 — Build a shared world model (highest leverage)
- Introduce a small data-driven grid or road graph for road corridors, junctions, sidewalks, building footprints, parks, and pedestrian walk zones.
- Make rendering, vehicle collision, pedestrian navigation, traffic routing, and mission placement query the same world representation.
- Start with one district and deterministic seeds; do not regenerate the whole city at once.
- Add tests for ground height, road/junction overlap, building clearance, valid spawn points, and world bounds.

### Phase 2 — Lane-aware traffic
- Represent each road segment and junction with legal directions and exits.
- Give each AI car a lane/route state, braking distance, stop/yield behavior, and collision avoidance.
- Add a traffic regression scenario that drives across multiple junctions and verifies vehicles remain on road surfaces and avoid buildings.
- Tune traffic count only after behavior and mobile frame time are measured.

### Phase 3 — Purposeful pedestrians
- Spawn pedestrians on sidewalks/valid walk zones, not arbitrary world coordinates.
- Give each pedestrian a simple schedule/state machine: walk to destination, pause/idle, cross at allowed points, flee from an approaching vehicle, react to impact, recover, resume walking.
- Use distinct non-graphic hit/evasion animations and per-person variation; pool temporary effects rather than creating unbounded objects.
- Add deterministic tests for states and movement. Use manual mobile playtests for visual animation quality.

### Phase 4 — Content and progression
- Move mission definitions and tuning into data-driven configuration.
- Add reusable delivery, taxi, circuit/time-trial, multi-stop, and getaway templates before inventing unique one-off mission code.
- Add rewards/progression/save-load only after mission completion and failure paths are tested.

### Phase 5 — Performance and visual depth
- Use shared materials, instancing/merged geometry, object pooling, and mobile quality tiers.
- Add trees, parks, road furniture, landmarks, lighting variation, traffic variety, and audio in controlled batches.
- Profile at phone-sized viewport and keep a frame-time/entity-count budget. More objects are not a substitute for coherent behavior.

## Development and automation rules

- One focused task per branch/PR; avoid concurrent edits to the same monolithic HTML file.
- Use automated tests as merge gates. Do not report visual quality as verified from headless tests alone.
- Add source attribution for every reused donor file/module and retain the complete applicable MIT license text.
- Keep all third-party assets/music under their own compatible licenses.
- No paid API, cloud service, or new recurring cost without explicit approval.
- Prefer free GitHub Actions and local/browser testing. Avoid splitting the current short test suite into many jobs unless runtime measurements justify it.
- Use an additional AI session only for bounded, independent research or review. One integrator owns the merge and verifies tests.

## What is needed from the project owner

Nothing is required to begin the audit and first technical prototype. The current default is:
- Keep Coastline's name, current live link, browser-first direction, and mobile controls.
- Prefer stable playable progress over a wholesale rewrite.
- Permit MIT-licensed source reuse with attribution, but no unlicensed code, paid services, or new account/permission requirements.
- Escalate only if a choice would change the core game direction, introduce costs, or require hands-on visual judgment.

Useful owner input later (optional):
1. Whether the world should prioritize realistic road rules or arcade chaos.
2. Whether a larger but slower city or a smaller, denser, more detailed city is preferred.
3. A quick mobile playtest after each visible milestone to judge driving feel, traffic density, and animation quality.

## Decision

Proceed with a staged, selective port from Overdrive City, informed by GTA 7's testable architecture. Do not wholesale-copy either game and do not directly reuse Mini GTA 6 code without verified permission.
