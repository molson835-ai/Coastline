# Coastline Cohesive Release — Resume Point (2026-10-25)

## Release branch

- Branch: `feat/coastline-four-island-cohesive-release`
- Base: current `main` after PR #116.
- Merge/deployment: **not authorized**; keep as a single reviewable PR.
- Goal: one coherent update covering four-island coastal layout, CTM bridge travel, vehicle integration, minimal gameplay removals, measured performance work, regression repair, and durable handoff.

## User-approved direction

- Keep the populated City as the starting world; do not make a blank-to-blank transition.
- Four intended coastal regions: Downtown Island, Residential Island, Waterfront Island, and Port Island.
- Bridge travel must be physical, readable, and traversable in both directions; preserve the active player/vehicle and return to the populated City.
- Retain the Range Rover fleet visual and its fallback/attribution/package support from PR #116.
- Exploration-first for this phase: no mission/task objective flow, minimap/waypoint guidance, or landmark discovery popups.
- Preserve core driving/walking, collision, traffic, basic pedestrians, garage and core rendering.
- Do not reduce near-field visual quality to hide performance problems.
- One consolidated PR; do not create separate stacked PRs for these related changes.

## Implemented in this branch so far

- Added `coastline-island-regions.js` as a canonical design manifest for the four islands and their provisional per-island traffic/pedestrian budgets.
- Added Node tests for region identity, neighbor targets, budget bounds, and invalid-manifest rejection.
- These files are **foundation/configuration only**. They do not yet make all four islands playable or wire all manifest routes into CTM.

## Latest implementation and CI checkpoint

- Latest code/test head before this handoff-only update: `96631aac8c90be68163a273a840a6245e2066f91`.
- Passed on that exact code head: engine tests, deterministic system tests, graphics-quality guard, Babylon preview validation, itch package build, and packaged Chromium smoke test.
- Full Playwright gameplay watchdog for that head was queued/running at checkpoint time; it is the remaining gate and must be checked after this commit. The latest browser job is not a green result yet.
- Vercel deployments for this feature branch: none observed. Do not create a preview until required CI is green.
- No Android physical bridge drive has been performed by the agent; user acceptance is still required after a fresh preview.
- This commit updates the handoff only. Fresh CI must still pass on the resulting branch head before the PR can be called green.

## Known source-of-truth status

- `COASTLINE_FOUNDATION_RESET_PLAN.md` is the approved design plan and explicitly says the four-region layout is not yet implemented.
- `coastline-world-transitions.js` currently registers only `city` and one compact shell world `island`; do not describe it as a completed four-island implementation.
- The existing `tests/world-transition-runtime.spec.cjs` covers City-first startup, a City ↔ shell-island transition, destination spawn, failed-load cleanup/retry, vehicle persistence, and bridge prompt direction. These are necessary but not sufficient for the final release.
- PR #90 / #87 contain older branch work. Their history is divergent from current `main`; do not merge them wholesale or reuse their code without reconciling it against PR #116.
- PR #116 is already merged to `main` and includes the Range Rover fleet asset path, fallback, attribution, package support, graphics-quality guard, and previous minimal-removal work. Retain those changes.

## Acceptance gates before the PR can be considered complete

1. Four islands are distinct playable destinations with connected physical bridge/tunnel routes and deterministic entry/return spawn contracts.
2. City remains the initial world. City → island → City round trip works by driving the physical route; vehicle identity, visibility, orientation and control survive.
3. CTM activates one full world at a time, unloads source-owned resources, cleans failed loads, and does not leave invisible source simulation running.
4. Mission/task prompts, landmark-discovery UI and minimap/waypoint UI remain absent; core driving/walking/garage/traffic/basic pedestrians remain.
5. Population limits are enforced at spawn/update lifecycle, not by hiding meshes only.
6. Range Rover visual, fallback, damage-part mapping, service-worker and itch package checks remain green.
7. Fix the reported smoketest failures by reproducing and classifying each one; don't silence stale assertions or skip retained behavior.
8. Run targeted tests, full Playwright browser suite, engine/systems/vehicle tests, and itch package checks on the same exact head SHA.
9. Record Vercel deployment churn/build limits and use only the one needed preview after CI passes; no promotion without explicit user approval.
10. Document actual test commands/results and leave real Android physical bridge travel clearly marked as human acceptance if not performed.

## Known unresolved engineering work

- Verify the newly added four-world route in Playwright; inspect any route, spawn, active-root or collision-scope failures and fix them before calling the PR green.
- Code-level minimal removals are now applied: mission/task prompt is inert/hidden, live-loop mission/replayability calls are disabled, and advanced NPC story/social-rumor updates are disabled while basic City traffic and pedestrian updates remain. The revised NPC test asserts this scope and retains core population checks.
- Audit any remaining smoketest failures against the current exact-head run; do not restore intentionally retired story systems just to satisfy stale expectations.
- Enforce per-world simulation budgets in traffic/pedestrian spawn/update lifecycle; geometry is world-scoped but population caps are not yet wired into spawn systems.
- Profile lag using the existing telemetry; don't claim a performance gain without comparable device measurements.
- Verify exact-head CI and a fresh preview before asking for Android acceptance.

## Recovery discipline

Before ending any work session, update this file with current head SHA, PR number/state, exact CI run URLs and outcomes, unresolved failures, and the next smallest action. Never report a change as verified without evidence from the exact head.
