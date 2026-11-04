# Coastline Scale Architecture (Free-First)

## Decision

**One authoritative game simulation, one primary runtime, many replaceable tools.** Babylon.js remains the primary playable runtime. Keep the existing Three.js game reachable as a legacy/reference build while features are migrated and verified; do not run two full engines simultaneously in the same player session. That would duplicate rendering, memory, input, physics, and bug surfaces without making the world larger.

This is a staged plan, not a claim that the current prototype already implements every item below.

## The multiplier: separate world data from the renderer

Build the world from deterministic, versioned data rather than hand-placing everything inside the renderer:

- **World manifest:** districts, road graph, terrain seeds, points of interest, spawn rules, mission anchors, traffic lanes, and asset IDs.
- **Simulation layer:** vehicle motion, collision rules, discovery state, mission state, traffic intent, and save data. It must not depend on Babylon mesh objects.
- **Babylon adapter:** turns visible world chunks and simulation entities into meshes, materials, lights, animation, and audio.
- **Legacy adapter (temporary):** where practical, read the same manifests in the Three.js build so both builds can validate the same road/mission data without sharing renderer code.
- **Validation layer:** deterministic tests for roads, reachability, collisions, pickups, mission completion, save/load, and performance budgets.

This makes it possible to grow the map and gameplay without growing one unmaintainable file. It also makes engine replacement a choice rather than a rewrite.

## Free-first production pipeline

1. **Authoring and code:** GitHub branches and pull requests; keep `main` playable and deploy only after validation.
2. **World factory:** seeded procedural generation creates road-connected blocks, varied building footprints, vegetation, props, and POIs. A seed should reproduce the same district for bug reports and tests.
3. **Chunk streaming:** load nearby districts at full detail; keep distant chunks as cheap silhouettes/terrain; unload or pool distant props. Start with coarse chunk activation before attempting complex streaming.
4. **Render scaling:** WebGL remains the compatibility baseline. Test WebGPU as an optional backend on supported devices; select it before scene creation and keep a reload/rebuild fallback. Never assume WebGPU is faster on every phone.
5. **Asset reuse:** favor original low-poly-to-mid-poly modular kits, CC0/public-domain assets with recorded licenses, and procedural variants. Use shared materials and instancing for repeated trees, signs, lights, windows, and street furniture.
6. **AI as an offline co-developer:** use AI to propose code patches, generate world/mission data, write tests, explain failures, and create asset briefs. Every output is reviewed by deterministic checks before it can merge. Do not call a remote AI model every frame: latency, cost, network dependence, and unpredictable output make that a poor core engine.
7. **Behavior systems:** NPCs use a deterministic state machine/utility rules for moment-to-moment behavior; AI may draft dialogue, schedules, and quest variations offline. This keeps NPCs responsive and works offline.
8. **Automated quality gates:** unit/system tests, browser tests, a mobile-sized viewport, runtime-error checks, world connectivity checks, and performance telemetry. Treat known legacy failures separately from new Babylon failures; do not hide red tests.

## What to build next (in order)

### Phase A — protect the playable baseline
- Keep the stable main beta and the Babylon preview separately addressable.
- Finish the Babylon city-slice regression suite and classify the existing legacy browser failures.
- Add build/version/engine labels and a short diagnostics snapshot to each test failure.

### Phase B — world factory
- Extract seeded random generation and the road/block/POI schema from the Babylon scene code.
- Add a deterministic generator test: same seed => same manifest; different seeds => varied but valid districts.
- Validate that every generated block has road access, spawn points do not overlap solids, and pickup/mission anchors are reachable.

### Phase C — bigger world without bigger frame cost
- Chunk-based activation and pooling.
- Shared materials + thin instances for repeated props.
- Level-of-detail by distance, fog tuned for visibility rather than hiding empty space, and mobile quality tiers.
- Profile frame time and memory on the actual target phone before raising density.

### Phase D — living city
- Road-lane graph for traffic, pedestrian walk zones, and intersection rules.
- NPC schedules and compact state machines; reusable job templates (maintenance, delivery, emergency response, park/beach life).
- Mission definitions as data, not bespoke code. Optional stories can chain without blocking free roam.
- Save versioning and migration tests so new features do not erase player progress.

### Phase E — optional engine experiments
- Benchmark Babylon WebGPU versus WebGL on target devices.
- Evaluate Babylon Lite only as a separate, measured renderer experiment; it is explicitly a different, WebGPU-only product direction, not a drop-in replacement for the current WebGL-compatible game.
- Only adopt an experimental renderer if it wins real device benchmarks and supports the needed feature set. No engine fork/duplication without a measurable payoff.

## Guardrails

- Keep the existing playable route intact until a replacement passes the same behavior tests.
- Never copy proprietary game source/assets. Learn from public talks, documentation, patents, and observed design patterns; implement original systems.
- No paid services or API calls in the critical game loop.
- Prefer additive PRs with tests and a live preview. A green build is necessary, not proof that the game looks or feels good; the player still validates that.
- Measure before optimizing: record frame time, draw calls where available, visible mesh counts, chunk activation, and memory proxies on representative mobile hardware.

## Official technical references

- Babylon.js documentation: https://doc.babylonjs.com/
- Babylon.js WebGPU support and initialization/fallback considerations: https://doc.babylonjs.com/setup/support/webGPU
- Babylon.js instancing for repeated meshes: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances
- Babylon Lite positioning and tradeoffs: https://www.babylonjs.com/lite/
