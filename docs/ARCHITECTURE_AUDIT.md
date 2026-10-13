# Coastline Architecture Audit

Reviewed: 2026-10-13

## Current shape

- `game-v3.html` is the active browser game and contains scene construction, world generation, vehicle and pedestrian simulation, input, mission logic, HUD, diagnostics, and the render loop in one inline ES module.
- `game-v2.html` remains a separate, more driving-focused reference build. Preserve it while the open-world prototype evolves.
- Playwright tests live under `tests/` and run through `.github/workflows/gameplay-watchdog.yml`.
- Three.js is loaded from a pinned CDN URL. The current game has no local bundler/build step.
- World objects are generated from loops and coordinate conventions, but ground height, road geometry, building collision, pedestrian movement, AI vehicles, and mission targets are not all derived from one explicit world model.

## Main risks

1. **Shared-world mismatch:** roads are rendered on fixed elevations while terrain and some object placement use `groundY`; collision and navigation can diverge from rendered geometry.
2. **Monolithic lifecycle:** global arrays and functions are coupled by declaration order. Broad edits are hard to review and easy to break.
3. **Unbounded per-frame work:** AI vehicles and pedestrians are iterated every frame, and pedestrian threat checks compare pedestrians against vehicles. Work grows with entity counts.
4. **Rendering overhead:** the scene uses many individual meshes and materials. Geometry/material counts, draw calls, frame times, and memory are not currently captured in diagnostics.
5. **Mission coupling:** a small mission state machine is embedded in interaction logic and has no general reusable activity definition or durable progression model yet.
6. **Headless vs. visual quality:** Playwright can catch state and runtime regressions but cannot certify handling feel, art direction, animation quality, or real-phone performance.

## Refactor direction

### Stage 1 — Instrument and protect

- Add runtime telemetry for first-frame loading time, rolling frame-time average/p95, FPS, renderer draw calls/triangles, geometry/texture counts, entity counts, and browser-supported memory indicators.
- Keep performance thresholds provisional until representative mobile-device measurements exist. Automated CI should initially validate that metrics are present and coherent, not pretend headless FPS equals real-device FPS.
- Maintain a release checklist and per-milestone human playtest checklist.

### Stage 2 — Shared world data

Introduce a pure, deterministic world-data module that describes region/chunk IDs, road corridors and junctions, terrain sampling, building footprints, walkable areas, and legal spawn points. Rendering should consume that data rather than define it independently. Collision, traffic, pedestrians, and mission placement should query the same APIs. Start with the current district and preserve its coordinates; migrate one consumer at a time with parity tests.

### Stage 3 — Bounded simulation and rendering

- Measure before optimizing.
- Keep simulation active near the player; use simplified/dormant states for distant agents.
- Replace repeated all-to-all pedestrian/vehicle checks with spatial buckets or a nearby-agent query.
- Share materials and geometry, then consider instancing/merging where measurements show draw-call pressure.
- Keep deterministic seeds for world placement and test scenarios.

### Stage 4 — Reusable activity loop

Represent an activity as data and explicit states: discoverable, available, active, completed, rewarded. Add start/cancel/retry paths, completion validation, reward idempotency, and saved progression only after the loop is tested. One repeatable activity should be polished before adding many mission types.

## Constraints

- Keep the current live game playable and preserve `game-v2.html` as a fallback/reference.
- Make focused branches/PRs with automated tests; avoid simultaneous changes to the same monolithic file.
- Do not claim visual or real-device validation from headless tests.
- No paid APIs, services, or new recurring costs without explicit approval.
- Any donor code must have a verified compatible license and required attribution; asset licenses must be checked separately.
