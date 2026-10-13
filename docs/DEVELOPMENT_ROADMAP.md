# Coastline architecture and development roadmap

## Product direction

Coastline is a hybrid open-world driving, racing, and adventure game. The browser build is the primary target; a downloadable PC edition can be evaluated later if it provides a meaningful quality or performance advantage.

## Architecture principles

1. **Keep the browser build playable.** Develop in feature branches and merge through pull requests; do not replace the live build with unverified experiments.
2. **One authoritative game runtime.** Preserve a single published entry point while gradually separating runtime systems into modules. Keep the older driving prototype available as a reference until its useful physics and environmental systems are intentionally integrated.
3. **Separate systems by responsibility.** Target modules for world/streaming, vehicles and physics, pedestrians and traffic, missions/progression, input/UI, save data, audio, and diagnostics.
4. **Measure before optimizing.** Use repeatable scenarios and track errors, frame-time/FPS, entity counts, and load failures on representative desktop and mobile viewports.
5. **Automate regression checks.** Every pull request should run browser tests. Failed runs should retain screenshots, traces, and logs. A change should not be merged merely because it parses.
6. **No mandatory paid runtime service.** Prefer static hosting, procedural content, open-source libraries, and GitHub Actions within available limits. Treat AI-assisted code repair as optional and gated by an authorized, affordable execution path.
7. **Review risky changes.** Automation can diagnose and propose fixes; production deployment should follow passing tests and human review until the pipeline has earned stronger confidence.

## Delivery sequence

### Milestone 1 — Quality foundation
- Browser startup and interaction tests.
- Deterministic building-collision and movement tests.
- Reproducible scenarios for vehicle entry/exit, driving, walking, and mission interactions.
- Screenshot/trace/log artifacts and useful failure summaries.
- Performance baseline on mobile-sized and desktop-sized viewports.

### Milestone 2 — Driving feel
- Tune acceleration, braking, steering, camera, collision response, and different vehicle classes.
- Add repeatable handling tests before expanding traffic complexity.

### Milestone 3 — World simulation
- Improve traffic lane/path behavior, pedestrian navigation, sidewalks/crossings, and safe collision avoidance.
- Add day/night and weather only with performance budgets.

### Milestone 4 — Game loop
- Reusable mission/activities framework, races, delivery jobs, money, garages, upgrades, and persistent progression.

### Milestone 5 — Visual quality and scale
- Art direction, lighting/materials, vehicle detail, audio, level-of-detail, and distance-based world loading.
- Profile on actual devices before enabling expensive effects by default.

### Milestone 6 — Continuous improvement
- Generate/replay reproducible bug scenarios, compare screenshots, detect performance regressions, summarize failures, and prepare candidate fixes as pull requests.
- Keep auto-repair separate from auto-merge; require passing checks and review before publishing.

## Current implementation

The gameplay watchdog uses Playwright in GitHub Actions. This milestone adds a test-only positioning hook and a deterministic regression test that verifies a known building footprint blocks on-foot movement. These tests improve confidence but do not replace hands-on testing across real phones and desktop browsers.
