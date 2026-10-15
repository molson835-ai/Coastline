# Coastline: Autonomous World Director Roadmap

## North-star experience
Coastline should feel like a world that is being cared for and expanded continuously: smooth to play, surprising to explore, responsive to the player, and able to add meaningful activities without destabilizing the active session.

## Design rule: AI proposes, validators approve, runtime streams
The game should never execute arbitrary AI-generated JavaScript or replace the live scene with unverified content. AI systems produce structured data (district plans, event definitions, NPC schedules, tuning suggestions). Deterministic validators check schemas, bounds, connectivity, collisions, asset budgets, and performance budgets. Only approved content enters the game, in small incremental batches. Every promoted change should have a rollback path.

## Runtime roles
1. **World Director** — tracks player context, district coverage, activity variety, repetition, and content gaps. Produces prioritized content requests.
2. **Activity Director** — rotates time trials, discovery routes, delivery jobs, meetups, seasonal events, and skill challenges. Tracks player progress and rewards.
3. **District Builder** — creates deterministic road/building/landmark plans with seeds, then streams validated chunks near the player.
4. **Simulation Director** — gives nearby entities richer behavior and distant entities cheaper aggregate simulation. Traffic, pedestrians, and ambient services should continue when the player is on foot.
5. **Performance Governor** — measures frame time and adjusts shadow distance, update rates, pedestrian/traffic budgets, effects, and streaming work. Protects the main render loop first.
6. **Quality Guardian** — runs repeatable route and interaction checks, records errors, detects stuck traffic and invalid transforms, and produces a diagnostic report.
7. **Content Curator** — compares recent activities and locations against history to avoid repetition and prioritize underused districts. It may propose seasonal themes, but content remains data-driven and validated.
8. **Release Gate** — checks syntax, asset/module availability, deterministic seed reproducibility, performance budgets, and regression scenarios before any new build is promoted.

## Expansion pipeline
Observe -> Propose -> Generate data -> Validate -> Budget -> Stage -> Smoke-test -> Promote -> Measure -> Roll back if needed

- Keep the currently playable world stable while new chunks are staged.
- Generate repeatable districts from a seed so a bug can be reproduced.
- Validate road graph connectivity, terrain grades, spawn points, collision extents, draw calls, and estimated memory before promotion.
- Prioritize adjacent districts and useful loops over huge empty map area.
- Use level-of-detail tiers: interactive nearby world, simplified neighborhood simulation, distant statistical simulation, and unloaded persisted state.

## Live content ladder
1. **Local rotating activities**: daily/weekly events, challenges, session rewards, discovery goals.
2. **Context-aware activities**: event suggestions based on district, vehicle, recent play, and completed objectives.
3. **Procedural event variants**: same validated mechanics with new routes, target conditions, weather/time themes, and rewards.
4. **World events**: temporary traffic surges, car meets, delivery demand, construction detours, scenic conditions, and special district objectives.
5. **Remote live operations**: versioned event manifests and content bundles served by a trusted endpoint, with cache/offline fallback and expiry. GitHub Pages alone is static hosting and does not provide a continuously running game server.
6. **Community/live-service layer**: opt-in analytics, leaderboards, shared challenges, and multiplayer only when backend, privacy, moderation, and anti-cheat needs are addressed.

## Performance and quality targets
- Measure frame-time percentiles, not only average FPS; protect 95th-percentile frame time.
- Keep expensive work incremental and time-budgeted. Move pure computation to Web Workers; workers return data and never mutate Three.js scene objects.
- Start with all current traffic moving continuously; add tiered update scheduling only when entity counts justify it.
- Pool and instance repeated meshes. Avoid per-frame allocations and repeated full-scene traversals.
- Degrade distant effects and simulation before sacrificing control responsiveness.
- Test on a low-end mobile profile as well as desktop; target stable 60 FPS where capable and a controlled 30 FPS fallback where not.
- Every automatic repair must be conservative, logged, and reversible. Never hide/reposition large parts of the world silently.

## Build order
1. Stabilize current controls, startup, module loading, and traffic on foot.
2. Establish a measurable adaptive performance governor and diagnostic snapshots.
3. Make activities genuinely playable and persist progress locally.
4. Build a district streaming interface that can stage/validate/promote chunks.
5. Add lightweight pedestrian schedules and traffic intent, with distance-based simulation tiers.
6. Add repeatable automated smoke tests and regression checks.
7. Add validated procedural event and district variation.
8. Connect a remote content manifest only when hosting and versioning are in place.
9. Add opt-in player feedback/analytics and use it to prioritize work.

## Current prototype status
- coastline-ai-runtime.js: diagnostics, health checks, worker coordination, district plans.
- coastline-ai-worker.js: deterministic planning and recommended performance budgets; budget recommendations still need to be applied by the runtime governor.
- coastline-live-ops.js: locally generated daily activity rotation and basic event progress/rewards. It is a prototype, not a server-driven live service; rewards are currently session-local.
- coastline-cinematic-v2.html: connects runtime systems and keeps traffic moving whether the player is driving or on foot.
- The current procedural plans do not yet create new district geometry. Actual streaming, persistence, automated test gates, and remote live content remain future work.
