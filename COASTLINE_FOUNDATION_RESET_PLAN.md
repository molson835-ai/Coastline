# Coastline Foundation Reset: Four Islands, Exploration, and Performance

Status: agreed design / implementation plan. This document records the current direction; it does not claim these changes are implemented.

## Product direction

Coastline is entering a foundation phase. Prioritize a stable, attractive, explorable coastal world and measurable performance before rebuilding missions, advanced NPC behavior, or progression.

Visual target: a cohesive tropical coastal region blending modern Miami-inspired downtown, Caribbean-influenced residential neighborhoods, resort waterfront, and a working port. Keep cinematic visual ambition. Do not solve performance by broadly lowering visual quality.

Navigation is exploration-first: no traditional map/minimap, no GPS waypoint route, no objective-marker trail, and no landmark discovery system/popups. Environmental cues such as road signs, coastlines, skyline silhouettes, bridges, and distinctive buildings can orient the player without UI guidance.

## Four-island layout proposal

These are logical design regions to validate against the existing world before moving geometry. Do not blindly divide coordinates or regenerate the city before mapping current roads, terrain, spawn points, and CTM entry/exit points.

1. **Downtown Island** — skyline, dense avenues, plazas, glass towers, higher ambient activity.
2. **Residential Island** — neighborhoods, homes, parks, winding coastal roads, quieter activity.
3. **Waterfront Island** — beaches, boardwalk, resorts, marina, entertainment and coastal roads.
4. **Port Island** — working harbor, warehouses, freight routes and expansion space.

Connect the islands with readable, drivable bridges and/or tunnels. Neighboring islands may be visible as low-cost distant scenery, but only the active island should retain its full interactive scene and simulation workload.

## Active scope: retain

- Vehicle driving and walking controls, camera, and core play loop.
- Core rendering, terrain, roads, buildings, vegetation, water, lighting/weather where stable.
- Collision and consistent road/terrain/spawn data.
- CTM transition manager and adapters required to activate, transition, unload, and restore worlds.
- Basic traffic and basic pedestrians, subject to strict per-island population budgets.
- Diagnostics, deterministic tests, performance instrumentation, and essential persistence (for example, player cash only if still part of the basic game state and tested).
- Existing working assets and recoverable published-build fallback.

## Out of active gameplay scope for this phase

- Map/minimap, waypoint routing, GPS route overlays.
- Missions, mission chains, objectives, tasks, rewards/progression systems.
- Landmark rosters, discovery markers, discovery popups.
- Advanced NPC AI, NPC story progression, reputation, social rumors, agency/utility brains, job/routine simulation, and nonessential world-event systems.

Remove obsolete code only after dependency search and test updates. Prefer disabling/removing active call paths first; preserve independent modules if they are useful later and deleting them would create risk. Update tests and documentation so they no longer require intentionally removed features. Do not leave tests silently skipping important retained behavior.

## Initial population budgets (provisional)

| Island | Active traffic target cap | Active pedestrian target cap |
|---|---:|---:|
| Downtown | 12 | 16 |
| Residential | 8 | 12 |
| Waterfront | 10 | 16 |
| Port | 8 | 10 |

These values are starting targets, not measured optima. Make them named, configurable per-world settings rather than scattered literals. Define whether parked vehicles count separately from moving traffic. Enforce caps in spawning/pooling and world activation, not only by hiding rendered entities. On unload, stop updates and dispose/release world-owned entities/resources; do not leave old-island agents running invisibly. On return, restore only the state explicitly supported by the CTM contract.

## Performance-first engineering principles

1. Capture a repeatable baseline before changing systems: startup time, frame time/FPS on target Android hardware, draw calls, triangles, renderer memory if available, entity counts, and transition duration. Headless FPS is not evidence of physical-phone performance.
2. Triage rendering cost first where measurements support it: repeated mesh instancing/batching, redundant geometry, shadow workload, materials, unnecessary offscreen/distant objects, and expensive scene construction. Do not indiscriminately reduce visible detail.
3. Establish a single authoritative world model for terrain height, road surfaces, collision, lanes, sidewalks, pedestrian spawn points, and transition spawn points. Avoid independently authored coordinates that disagree.
4. Ensure only the active island receives full simulation and rendering resources. Distant island silhouettes should use cheap representation and should not create active traffic/pedestrian systems.
5. Test the CTM transition as a real player journey: approach the bridge/tunnel, cross it, see a distinct destination, confirm correct spawn/orientation and collision, confirm source-world unload, and verify no duplicate resident world or runaway entity counts.
6. Fix test reliability and unnecessary CI/deployment churn. Do not merge or deploy merely because a PR exists; require relevant checks and keep changes small and reversible.

## Staged implementation and acceptance criteria

### Stage 0 — Audit and baseline
- Inventory current gameplay call paths, tests, world initialization, CTM adapter, renderer creation/disposal, and deployment workflows.
- Identify the authoritative branch/PR stack and avoid conflicting with existing CTM and draw-call work.
- Capture current automated test status and available physical-device baseline.
- Deliver a dependency-aware removal list before destructive deletion.

### Stage 1 — Minimal playable core
- Remove active map/minimap/waypoint UI and route logic.
- Remove mission/task/landmark call paths and discovery UI.
- Disable advanced NPC/social/reputation systems while retaining basic traffic and pedestrians.
- Update/remove only tests that assert deliberately retired features; add regression coverage for controls, cash persistence if retained, core world render, basic traffic/pedestrians, and CTM.
- Acceptance: game boots, controls work, no errors from deleted references, no map/mission/landmark UI, and core play remains testable.

### Stage 2 — Measured performance work
- Apply focused draw-call and geometry optimizations with source regression tests.
- Profile startup and active scene; do not assert an FPS gain without controlled before/after measurements.
- Acceptance: relevant CI passes and Android benchmark shows measured results with the same device, viewport, location/scenario, and test duration.

### Stage 3 — World map and island boundaries
- Map existing city roads/buildings/terrain to four regions before moving or rebuilding them.
- Define transition gates, approach directions, spawn transforms, collision boundaries, return points, and visible distant silhouettes.
- Acceptance: every boundary has an explicit connection and valid spawn/return contract; no arbitrary blank-to-blank world transitions.

### Stage 4 — Population budgets and CTM lifecycle
- Add named per-island traffic/pedestrian caps and ensure only the active island simulates.
- Test activation, crossing, source unload, destination activation, return, and repeated transitions.
- Acceptance: caps hold under repeated runs; source-owned entities and resources are released; no duplicate worlds or continuing source simulation.

### Stage 5 — Rebuild world richness
Only after land structure, transitions, and performance are stable, selectively reintroduce richer traffic behavior, NPC routines, missions, landmarks, and other gameplay with independent budgets and tests.

## Safety / release rules

- Do not commit directly to main, auto-merge, or deploy risky changes without explicit approval.
- Keep changes isolated, testable, and reversible.
- Preserve a fallback build and document rollback steps.
- Distinguish code inspection, automated/headless tests, and real-device playtesting in status reports.
- Do not claim implementation or performance improvements until verified.
