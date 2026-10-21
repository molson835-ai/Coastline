# Coastline — Durable Handoff & Recovery Notes

**Checkpoint updated:** 2026-10-20 (America/New_York; GitHub timestamps may show 2026-10-21 UTC)  
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
- CTM branch head: [`ff5f04f`](https://github.com/molson835-ai/Coastline/commit/ff5f04fb16a0aef21080965fa053ca7513e686cd) on `coastline-transition-manager-v1`. The next CTM slices are staged on WIP branch [`coastline-player-state-handoff-v1`](https://github.com/molson835-ai/Coastline/commit/b81a761337ff9acd4b88fd4fc7c1f964392f20e0), whose current checkpoint includes telemetry and a Three.js staging adapter.
- Completed parent validation [run #39533658401](https://github.com/molson835-ai/Coastline/actions/runs/39533658401) on `9e7f36e` failed overall: engine, deterministic system, and vehicle/fidelity/package jobs passed, while all three browser shards failed. The Task 4–5 commit was then fast-forwarded into CTM at `ff5f04f`. Current exact-head runs on `ff5f04f` are [push run #39534474998](https://github.com/molson835-ai/Coastline/actions/runs/39534474998) and [PR run #39534481432](https://github.com/molson835-ai/Coastline/actions/runs/39534481432); at this checkpoint, engine/system/vehicle-fidelity jobs passed and browser shards were still running (push run shard 3 already passed; shards 1–2 still in progress). These runs do not include the later WIP-only telemetry/Three.js adapter code.
- Local scratch validation of the newly added manager suite reported **8 tests passed, 0 failed**. This is useful focused evidence only, not repository CI acceptance. The full workflow and other repository tests must be checked against the current SHA.
- New implementation in that commit: `src/transition/transition-state-machine.mjs`, `src/transition/transition-manager.mjs`, `tests/fixtures/transition-worlds.mjs`, and `tests/transition-manager.spec.mjs`. Existing registry/loader modules and tests were already in the CTM branch.
- CTM now includes the engine-agnostic state handoff contract and gate providers on head `ff5f04f`. Local scratch verification: `node --check src/transition/transition-manager.mjs && node --test 'tests/transition-*.spec.mjs'` — **24 passed, 0 failed**. This is local evidence only; no GitHub Actions result was visible for `ff5f04f` at checkpoint time. CTM is **not yet wired into `game-v3.html`**; there is no production Babylon adapter or real in-game gate yet. Do not describe World 2 transitions as playable.
- The next planned slice is saved separately on branch [`coastline-player-state-handoff-v1`](https://github.com/molson835-ai/Coastline/commit/a703b356c1f771c36bf93ae095b186a63132e0bb), commit `a703b35`. It adds the canonical `PlayerStateHandoff` contract, destination/source rollback hooks, diagnostics for rollback failures, and 10 state-handoff tests (8 new cases beyond the manager tests). A local scratch run of `node --test 'tests/transition-*.spec.mjs'` reported **18 passed, 0 failed**. This branch has not yet been fast-forwarded into PR #77, because the parent commit's full browser run was still active at the last check.
- CTM PR #77 remains draft and must not be merged until its acceptance gate is satisfied.

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

1. Finish and record the results of Actions runs #39534474998 (push) and #39534481432 (PR) on exact SHA `ff5f04f`; do not call the current head green until they finish.
2. Keep fixing the browser blockers without weakening assertions: steering/movement, NPC story phase, pedestrian movement, courier mission completion/replay.
3. Once `ff5f04f` run completes, verify CTM branch has not moved, then fast-forward WIP branch `b81a761` into CTM and rerun all checks. WIP has bounded transition telemetry and a Three.js loader adapter with local 38/38 tests, but no GitHub CI yet.
4. Add the deterministic synthetic A/B acceptance harness. Do not wire the adapter into `game-v3.html` until the world factory/asset ownership contract is defined and smoke tests are ready. Do not use Babylon APIs in `game-v3.html`; the root beta target is Three.js 0.170.
5. Add bounded transition telemetry; telemetry failure must never break gameplay. Do not retain unbounded per-frame history.
6. Implement the Babylon loader behind the adapter and use the existing runtime conventions. Consult official [Babylon.js Asset Containers documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/assetContainers.md): `LoadAssetContainerAsync` returns assets without automatically adding them to the scene; explicitly add them for activation, remove them from the scene during retirement, and dispose owned assets only after the destination is safe. Check shared materials/references before disposal.
7. Wire CTM behind a non-disruptive runtime initialization path, leaving current World 1 playable if CTM initialization fails.
8. Add deterministic synthetic A/B acceptance tests and the Playwright/runtime smoke test; run the relevant engine, transition, streaming-performance, mega-patch and three browser-shard checks on one exact head SHA.
9. Only after these gates pass, begin World 2 (island/bridge/tunnel). Keep production art, actual mansion interior, and final doorman/elevator animations out of CTM v1.

## Latest CI result and failures to preserve as open until disproven

The last completed workflow available at checkpoint time is [run #39533658401](https://github.com/molson835-ai/Coastline/actions/runs/39533658401) on parent SHA `9e7f36e`; it finished with `failure`. Engine, system, and vehicle/fidelity/package jobs passed. Browser shard 2 failed left/right displacement (delta 0), public-works NPC story remaining `idle`, and pedestrian movement (`x=-501.5`, required `>-501.4`). Browser shard 1 failed a clear-ground walk displacement assertion after the 90-second test timeout and steering-left movement (delta 0). Browser shard 3 timed out waiting for replayable courier mission state `done`. These are observed results for the parent SHA, not claims about the newer `ff5f04f` head.

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

- Vercel reports `api-deployments-free-per-day` (more than 100 deployments), with a “try again in 1 day/24 hours” response. The current `ff5f04f` Vercel status check is failure at the free daily limit. Do not repeatedly trigger Vercel deployments while this cap applies or propose a paid upgrade without explicit approval.
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

- **2026-10-20/21:** CTM PR #77 head `9e7f36e` adds the transition state machine, manager, synthetic fixture and 8 manager lifecycle tests. Actions run #39533658401 had engine/system/vehicle-fidelity/package jobs pass while browser shards were still running; final result must be rechecked. Task 4 is saved on `coastline-player-state-handoff-v1` at `a703b35`, with a local scratch result of 18/18 combined transition tests passing; it is not yet part of PR #77. Prior completed run #39529433357 on `3b16b27` had the browser failures listed above. No merge or production promotion was performed.
