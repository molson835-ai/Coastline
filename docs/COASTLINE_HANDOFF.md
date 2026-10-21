# Coastline — Durable Handoff & Recovery Notes

**Checkpoint updated:** 2026-10-20 America/New_York (GitHub Actions timestamps are UTC and may show 2026-10-21)  
**Purpose:** This is the durable source of truth for continuing Coastline work across chats, context resets, free-plan message limits, and handoffs between agents. Do not rely on chat history or model memory alone.

## First steps when resuming in a new chat

1. Read this document, then `AGENTS.md`, `docs/COASTLINE_TRANSITION_MANAGER_V1.md`, and the CTM implementation plan.
2. Verify the live repository state from GitHub before changing code: current branch head SHA, PR #77, recent Actions run, changed-file list, and current deployment state. The values below are a checkpoint, not a guarantee that remote state has not moved.
3. Inspect the latest failing job logs/artifacts before attempting fixes. Do not trust older green checks as evidence for a newer SHA.
4. Pick up from **Immediate next actions**, then update this handoff as part of each material work increment. Record exact commit/test evidence, not assumptions.
5. If chat/context limits are approaching, stop feature work and write a checkpoint first. Push/commit it through a reviewable branch or PR where possible. If persistence cannot be completed, say exactly what remains unsaved and where.

## Project identity and guardrails

- Repository: [molson835-ai/Coastline](https://github.com/molson835-ai/Coastline)
- Current user goal: a family-friendly, no-weapons coastal open-world driving/exploration game that can grow through independently loaded world segments, while retaining distinctive, high-quality visuals.
- Hard constraints from `AGENTS.md`: free-first; no surprise subscriptions or paid assets; no secrets in source; preserve `game-v2.html` as fallback/reference; small changes with regression tests; no auto-merge, force-push, or risky deployment without explicit human direction.
- **Graphics rule:** do not fix performance by silently lowering visual quality, pixel ratio, bloom, shadows, or near-field detail. First investigate redundant work, active-world scope, instancing/caching, streaming, collision/AI scope and measured hotspots. Label performance targets as targets until measured on representative hardware.
- **Testing rule:** headless/browser CI is not physical-device testing. Do not claim Android FPS, controls, or visual quality have been verified without an actual device playtest.
- User has approved implementing previously agreed changes, but that is not approval to merge PRs, rewrite history, change permissions, incur costs, or promote a risky build.

## Current code checkpoint

- CTM branch: `coastline-transition-manager-v1`
- CTM PR: [#77 — CTM v1: transition manager foundation](https://github.com/molson835-ai/Coastline/pull/77)
- Base branch for PR #77: `coastline-fidelity-core` (not `main`). Never assume its merge would promote to the public/live build.
- CTM branch head verified: [`0b6b486`](https://github.com/molson835-ai/Coastline/commit/0b6b486b3dbab21a0ad7a28acbc994be964c3d2b) on `coastline-transition-manager-v1` (2026-10-21; moves the pedestrian-collision test to a quiet off-road path after the center-traffic-lane setup failed).
- Historical CTM runs included browser-harness failures; use the current exact SHA run for verification. Latest exact-head Actions runs are [push #39583522814](https://github.com/molson835-ai/Coastline/actions/runs/39583522814) and [PR #39583529071](https://github.com/molson835-ai/Coastline/actions/runs/39583529071), both on `0b6b486`; all jobs were in progress when this checkpoint was recorded.
- The GitHub engine job passed the CTM Node transition suite on SHA `9cc7d9d`; local scratch command `node --check src/transition/three-world-loader.mjs && node --check src/transition/transition-telemetry.mjs && node --check tests/transition-worlds-a-b.spec.mjs && node --test 'tests/transition-*.spec.mjs'` previously reported **44 passed, 0 failed**. Do not count this as browser verification.
- Current head `d9bb97d` includes registry/loader, transition state machine/manager, player-state handoff, physical/masked/explicit gate providers, bounded telemetry, a Three.js staged loader, synthetic A/B tests, and the new isolated browser smoke fixture/spec: `tests/fixtures/ctm-runtime-smoke.html` and `tests/transition-runtime-smoke.spec.cjs`.
- Runtime correction verified from repository source: root `index.html` routes to `game-v3.html?beta=20261016performance`, which uses Three.js 0.170; `/babylon/` is a separate classic-script experiment. The Three.js adapter stages detached `Object3D` roots and requires factory-owned resource disposal. Browser smoke tests exercise CTM modules with a fake scene tree only; CTM is still not wired into `game-v3.html`, and there is no real second-world factory/gate.
- CTM PR #77 remains draft; no merge or production promotion is authorized.


## Key player-approved design decisions

### World architecture and transitions

- World 1 is the existing coastal city.
- World 2 is planned as a private island reached by a bridge and/or tunnel.
- World 3 is the mansion interior. Entering the mansion garage or crossing its front door should use the same transition system.
- Additional reusable transition patterns: apartment rooftop/elevator and a doorman conversation that transitions to another apartment/home.
- A small interior may receive a higher fidelity budget because only the current world and a limited warming destination should need full activity. The system should scale by loading one world/segment at a time, not by cloning everything into the same active scene.
- CTM owns orchestration, not persistent player state. The old world remains usable until the destination is loaded, warmed, validated, state-restored and activated. Failures/cancellation must not strand the player or dispose the source prematurely. Repeated requests should coalesce; conflicting in-flight requests must not create duplicate instances.
- Physical gates (bridge/tunnel/door), masked gates (elevator, doorman interaction, garage/cinematic corridor), and explicit travel should use the same lifecycle pipeline.

### Current World 1/gameplay requests

These are user-requested targets to verify against the actual current build, not proof they are all implemented:
- Temporarily remove missions and landmark-discovery messages while the free-roam foundation is stabilized.
- Make the garage visually distinguishable from ordinary row homes and position it near the corner/curb.
- Start the player parked outside that garage; allow garage entry only while in the vehicle, through a proximity-based “enter garage” interaction. Do not allow on-foot entry.
- Increase starting cash.
- Fix steering/reverse behavior without repeating a blind left/right sign flip. Previous user playtests reported left/right were correct in one build but steering was too tight; a later CI check observed zero displacement. Diagnose spawn position, obstruction, movement state and sign in that order.
- Remove lag without downgrading close-range visual quality. Preserve authored vehicle appearance/materials and realistic visuals through runtime optimization.
- Keep the game family-friendly and without weapons.

## CTM architecture and next tasks

Specification: [`docs/COASTLINE_TRANSITION_MANAGER_V1.md`](https://github.com/molson835-ai/Coastline/blob/coastline-transition-manager-v1/docs/COASTLINE_TRANSITION_MANAGER_V1.md)  
Plan: [`docs/superpowers/plans/2026-10-20-coastline-transition-manager-v1.md`](https://github.com/molson835-ai/Coastline/blob/coastline-transition-manager-v1/docs/superpowers/plans/2026-10-20-coastline-transition-manager-v1.md)

The state lifecycle is: `IDLE → REQUESTED → PRELOADING → WARMING → READY → TRANSFERRING → ACTIVATING → RETIRING_OLD_WORLD → UNLOADING → COMPLETE`, with explicit `FAILED` and `RECOVERING` paths.

The manager patch provides explicit state changes/history, single-flight requests, same-destination coalescing, cancellation before activation, injected state-handoff and telemetry seams, source-world protection on preload/activation failure, and old-world retirement only after destination activation succeeds. Continue from this foundation rather than starting a parallel transition implementation.

**Immediate next actions:**

1. Current repair head is `112ba744432ce2126dd5000d031d3b398387ae54`; exact-head workflow [#39580528844](https://github.com/molson835-ai/Coastline/actions/runs/39580528844) is the verification source. Engine, system, and vehicle/fidelity/package jobs passed on this SHA; browser shards were still running at the checkpoint update.
2. Browser harness fixes in commits [#02f6a69](https://github.com/molson835-ai/Coastline/commit/02f6a69633a4cd70d6abdcac107a58bc1dc4dd23) and [#112ba74](https://github.com/molson835-ai/Coastline/commit/112ba744432ce2126dd5000d031d3b398387ae54): central-road bounded spawn helper replaces broad synchronous world scans; steering tests now wait for vehicle speed and poll heading deltas; NPC test clears saved state only on the first query-tagged navigation and verifies persistence on a clean URL. The first run on `02f6a69` caught a test syntax typo (`const restored` missing `=`); corrected at `112ba74`. Do not count the first run as behavioral verification.
3. After run #39580528844 completes, inspect each browser shard's logs. Do not weaken collision/steering assertions, change production steering without evidence, or lower visual fidelity. Pedestrian collision passed on the prior exact head and was not changed.
4. CTM's isolated browser smoke coverage passed on `d9bb97d`; recheck exact-sha results on `112ba74` once the latest run completes.
4. If tests pass, proceed toward the guarded runtime smoke integration only after defining an actual destination world factory and asset ownership/fallback contract. Keep the current smoke fixture test-only and unlinked.
5. Do not use Babylon APIs in `game-v3.html`; active beta uses Three.js 0.170. Keep `/babylon/` distinct.
6. Do not build World 2 assets/gates until CTM lifecycle and browser acceptance tests pass together on the exact same SHA.
7. Preserve visual quality; focus optimization on world scope and measured hotspots, not reduced fidelity.
8. Keep PR #77 draft; do not merge or promote without a human decision.
9. Before the next chat/context limit, update this handoff and the implementation plan with exact results, head SHA, open failures, and next task.

## Latest CI result and failures to preserve as open until disproven

Exact-head run #39535395919 on `9cc7d9d` remained reported as `in_progress` with stale update time; engine/system/vehicle-fidelity jobs had passed but it is superseded for acceptance by the newly triggered exact-head runs on `d9bb97d`: [push #39535884754](https://github.com/molson835-ai/Coastline/actions/runs/39535884754) and [PR #39535888939](https://github.com/molson835-ai/Coastline/actions/runs/39535888939). At last poll both were pending; no result should be claimed yet. Older `ff5f04f` failures remain historical evidence and need rechecking.

## Older CI failures (context only)

The last **completed** workflow inspected was [run #39529433357](https://github.com/molson835-ai/Coastline/actions/runs/39529433357) on parent commit `3b16b27`. Engine tests, system tests, vehicle/fidelity/package tests and browser shard 3 passed. Browser shards 1 and 2 failed:

- `tests/gameplay.spec.cjs`: reverse input did not build negative speed (observed speed 0).
- `tests/mega-patch2-core.spec.cjs`: A/left and D/right steering test observed displacement 0.
- `tests/npc-world-slice.spec.cjs`: public-works NPC story remained `idle` instead of `complete`.
- `tests/pedestrian-collision.spec.cjs`: observed on-foot displacement was only about 0.1, below its asserted threshold.
- `tests/performance-budget.spec.cjs`: timed out waiting for a valid telemetry snapshot.

These results are from the parent SHA, not the new CTM head. Re-check the newer run before deciding which failures remain. Some test failures may be caused by blocked spawn locations or timing assumptions; retain the behavioral assertions and fix the setup/underlying behavior rather than weakening the tests.

## Performance diagnostic retained from the user

User-provided Android snapshot, 2026-10-20 11:04 UTC, URL path `/game-v3.html?beta=20261016performance`:
- Android 10 / Chrome 155; viewport 384×721; pixel ratio 2.8125.
- Mode: on foot; position approximately x=-2.97, z=-552.77, heading=-4.7.
- Reported counts: 48 buildings, 81 vehicles, 110 pedestrians, 74 trees.
- The prior 2026-10-19 report recorded a runtime of 72 seconds and persistent lag from load. Treat these as dated diagnostics, not as current production metrics. The last user-shared report also recorded approximately 323 seconds runtime.
- Next performance work should inspect category timings, active object counts, streaming/culling and collision/AI work at representative near/far distances. Keep the graphics-quality contract intact.

## Deployment and free-tier caveats

- Vercel reports `api-deployments-free-per-day` (more than 100 deployments), with “try again in 1 day/24 hours”; `ff5f04f` status failed at this free daily limit. Avoid unnecessary builds; GitHub Actions validates source behavior, while no representative phone playtest has been performed in this session.
- Cloudflare produced successful preview deployments for the CTM branch in the previous inspected PR comments, but verify the latest URL/commit before sharing a preview. A preview deployment is not proof that the feature works or that production was promoted.
- GitHub account access is working through the repository integration. No need to ask the user to reconnect GitHub unless actual permission errors appear.
- Keep PR #76 (performance mega-batch, draft) separate from CTM PR #77. It removes adaptive quality downgrades and adds profiling, but still has its own verification/failure ledger. Do not merge that batch as part of CTM.

## Mandatory conversation checkpoint protocol

For every substantial Coastline conversation, update the **Current code checkpoint**, **Immediate next actions**, open blockers, and dated log before stopping. Do this before a chat/context limit is expected, not after. When the conversation includes a durable decision (feature scope, approved architecture, user constraint, rejected approach, unresolved bug, tested result or deployment limitation), write the useful conclusion here or in the relevant source plan immediately; do not let it live only in chat text.

Each checkpoint must state:
- Date/time and timezone.
- Repo, branch, PR, exact head SHA, and whether the SHA is verified.
- Files/commits changed and anything intentionally not changed.
- Exact commands and pass/fail outcomes; label local, CI, preview, and physical-device evidence separately.
- Known failures with links to runs/logs and the last known reproduction.
- User-approved decisions and constraints, pending choices/approvals, and the one concrete next task.
- Deployment or cost limits that can affect the next action.
- What remains unsaved/unpushed, if anything.

Never claim work has been saved if it exists only in a chat or local scratch file. Never delete older checkpoints just to make the newest one shorter; keep a concise dated log below and update the current summary above. Do not log secrets, tokens, cookies, credentials or personal data.

## Checkpoint log

- **2026-10-20/21:** CTM PR #77 head `d9bb97d` includes CTM core/state handoff/gates/telemetry/Three.js adapter/synthetic A/B acceptance and newly added isolated Playwright browser tests. Exact-head runs #39535884754 (push) and #39535888939 (PR) were pending at last check. Prior run #39535395919 on parent `9cc7d` had engine/system/vehicle-fidelity passed but browser jobs stale in progress. No test result is claimed for the newest head yet. Handoff PR #78 is open/unmerged; CTM remains draft and no production promotion was performed.

- **2026-10-21 — browser harness repair in progress:** Commit `02f6a69633a4cd70d6abdcac107a58bc1dc4dd23` added `tests/helpers/nearby-world-spawn.cjs` and moved tests away from full-world synchronous searches; `112ba744432ce2126dd5000d031d3b398387ae54` fixed an NPC persistence test syntax typo. On `112ba74`, exact-head PR browser shards 2 and 3 passed (15 and 14 tests respectively), including repaired steering, NPC completion/persistence, and the isolated CTM smoke tests. Shard 1 still failed: walking-controls movement test hit the overall 90-second timeout, while the duplicate push run also failed pedestrian collision because the fixture expected `x > -501.4` but received `-501.5`. Commit `03d631459e2df6ccb29f41fdaf366f445feaaaa9` now limits the walking probe to a central road segment, clears only test pedestrians near that short path, and rewrites the pedestrian test to approach a stationary NPC from a central road while checking collision separation. This commit is test-only; no production game code, physics, visual settings, or assets were changed. Exact-head Actions runs [push #39582329578](https://github.com/molson835-ai/Coastline/actions/runs/39582329578) and [PR #39582337683](https://github.com/molson835-ai/Coastline/actions/runs/39582337683) have engine/system/vehicle-fidelity/package jobs green; their browser shards were still running at the time of this entry. The earlier `112ba74` tests do not validate the new pedestrian/walking harness changes.


- **2026-10-21 — pedestrian collision fixture isolated from traffic:** On `03d6314`, browser shard 1 passed all 15 tests, including walking controls; shard 3 passed all 14 tests including CTM synthetic browser smoke. The PR shard 2 then failed only `tests/pedestrian-collision.spec.cjs`: player z was 40.28 versus a stationary test NPC at 42.5, so the test advanced a fraction and was blocked before approaching its target. To remove moving traffic from the test's scenario, commit `0b6b486b3dbab21a0ad7a28acbc994be964c3d2b` adds `findNearbyQuietGround` to `tests/helpers/nearby-world-spawn.cjs` and updates `tests/pedestrian-collision.spec.cjs` to use an off-road, static-obstacle-checked, vehicle-clear segment, relocate only nearby test pedestrians, and allow a 12-second poll. No production game code or collision/vehicle behavior changed. Exact-head validation is running in [push #39583522814](https://github.com/molson835-ai/Coastline/actions/runs/39583522814) and [PR #39583529071](https://github.com/molson835-ai/Coastline/actions/runs/39583529071). Do not wire CTM into the active game until this exact head is green.


- **CI efficiency follow-up (after current exact-head verification):** `.github/workflows/gameplay-watchdog.yml` currently keys concurrency on `github.ref`, so the push and pull-request events for the same branch/commit launch duplicate three-shard browser suites. Change the group to use `${{ github.head_ref || github.ref_name }}` (preserve `cancel-in-progress: true`) in a later code commit after `0b6b486` is fully verified. This should cancel duplicate runs for the same head without skipping the surviving suite. Do not change the workflow mid-run, because that would create a new head before the current fixes are validated.
