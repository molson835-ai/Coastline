# Coastline Master Handoff — Current Resume Point

> **Read this current status first.** This section is the live resume point for the next AI. Older notes below preserve history and may be superseded by this section. Update this handoff again before ending a future session.

## Active task: PR #87 — physical City ↔ World 2 bridge/runtime

- **Repository:** https://github.com/molson835-ai/Coastline
- **PR:** https://github.com/molson835-ai/Coastline/pull/87
- **Branch:** `feat/ctm-world2-live-integration`
- **Code SHA tested by the latest targeted workflow:** `d34b65ea20ae76e5094c76e4b949a2e5d47c12a4`
- **State:** Open/draft, **not merged**. Do not merge, promote, or claim it is fixed yet.
- **Latest targeted browser run:** [GitHub Actions run 39884933989](https://github.com/molson835-ai/Coastline/actions/runs/39884933989) — **FAILED: 5 passed, 1 failed**. The full gameplay browser gate was skipped because the focused CTM suite failed.
- **Failure artifact:** [ctm-targeted-verification artifact 12472516510](https://github.com/molson835-ai/Coastline/actions/runs/39884933989/artifacts/12472516510). The `verify` job is `120190781512`.
- Workflow execution time in logs is 2026-10-23 UTC; it was the evening of 2026-10-22 US Eastern.

### What is verified in that run

Passing tests (5/6):
1. `tests/ctm-browser-regressions.spec.cjs`: active World 2 vehicle remains visible and movable.
2. `tests/ctm-browser-regressions.spec.cjs`: bridge-end trigger test automatically transitions City ↔ World 2 and back.
3. `tests/world-transition-runtime.spec.cjs`: direct City → World 2 → City lifecycle/state restoration test.
4. `tests/world-transition-runtime.spec.cjs`: failed World 2 load cleans partial shell resources, preserves City, and can be retried.
5. `tests/world-transition-runtime.spec.cjs`: bridge prompt is limited to a nearby vehicle facing the bridge.

Failing test:
- `tests/transition-manager-browser.spec.cjs:30`, test title: **“live game runtime exposes the CTM bridge and returns to the preserved City state”**.
- Exact mismatch: test hard-codes expected player position `{x: 500, z: 500}`, but the new intended World 2 spawn is `{x: 500, z: 400}`.
- This is a **stale test expectation**, not evidence that the runtime's new spawn value itself is wrong: `coastline-world-transitions.js` defines a `world2Spawn()` diagnostic and intentionally moved the World 2 spawn beyond the bridge. Fix the test to derive its expected position from `window.__coastlineTransitionTest.world2Spawn()` (or the shared source of truth). Do **not** revert the runtime spawn to z=500 just to satisfy the old assertion without checking the bridge geometry/trigger zone.
- Since the targeted suite stopped on this failure, the full gameplay gate did not run. No full-suite green result exists for this exact SHA.

### User's actual beta report — treat as the acceptance requirement

The previous beta felt broken after entering World 2: bridge button moved the player to the edge/spawn but did not create a route; the player could not physically return to City; the active car was not visible; and driving hit invisible walls/poles. The player was left waiting for a button to return. This was a real integration failure, not user error.

The required outcome is:
1. Start in City in the same active vehicle.
2. Drive along a **physical, continuous bridge/road** to its City-side end trigger; CTM transitions automatically.
3. Arrive in World 2 with the same vehicle mesh visible and controllable.
4. Vehicle movement works and cached City-only collision data does not block the island.
5. Drive to the World 2-side bridge trigger; transition automatically back to City.
6. Arrive at a sensible City-side bridge location with the vehicle still visible/controllable.
7. No page errors, leaked resident worlds, stuck CTM state, teleport-only dependency, or unexpected collision walls.

The automated passing bridge-zone test demonstrates the trigger/CTM path under the harness; it does **not** replace a human drive across the complete route on a fresh build. Do not claim that the user's original field issue is resolved until that human playtest succeeds.

### Implemented in the current PR branch (not yet accepted)

- Reworked `coastline-world-transitions.js` with bridge end zones, a guarded automatic transition request, bridge/World 2 shell geometry, and diagnostic helpers.
- World 2 spawn moved to `{x: 500, z: 400, rotationY: 0}`; island bridge center is around `{x: 500, z: 500}`. City bridge/approach uses the `z ≈ -600` region.
- Active vehicle is explicitly made visible after reparenting; World 2 active scope is signaled with `window.__coastlineWorld2Active`.
- Added browser regressions for vehicle visibility/movement and automatic bridge-zone transitions.
- World 2 remains a **blank shell**; the current city-collision bypass is a temporary scope boundary, not a finished island-local collision system.

### Remaining risks / checks the next AI must not skip

1. **Fix the single stale spawn assertion first**, then rerun the focused CTM browser tests on the resulting exact SHA.
2. Inspect whether `.github/workflows/ctm-targeted-verification.yml` still exists in the remote branch. The workflow's cleanup step committed a deletion only inside the Actions checkout; its push failed with **non-fast-forward** (`fetch first`). Do not assume remote cleanup succeeded.
3. Run the **full gameplay browser gate plus relevant system/engine/package checks** on one exact head. Do not call the PR green if only the 5/6 targeted suite is green.
4. Review the bridge runtime restoration path. A known open concern is that `restoreState` may ignore the transition's `destinationSpawn`; verify that returning from World 2 lands at the intended City-side bridge/return point rather than silently restoring an unrelated saved position.
5. Inspect `coastline-runtime-fix.js`: the implementation plan called for full `scene.traverse()` restoration so meshes hidden by the spatial budget can be restored after reparenting. The current transition code force-enables the active vehicle hierarchy, but verify actual descendant meshes render; a visible root flag alone is not enough.
6. Verify that World 2 collision evaluation really excludes City-only collision arrays. Current scope bypasses City `buildingBlocked()` checks while `__coastlineWorld2Active` is true; World 2 still needs its own collision data before real props/buildings are added.
7. Only after automated tests pass, publish a fresh **exact-head** preview and ask the user to test that URL. The previously visible Vercel deployment `https://coastline-rchht5pd8-molson835-3446.vercel.app` was built from old commit `0b4244be06a7b1ef19118adfc97edfec5a080f5d`; it is **not** the current PR build and must not be provided as the corrected beta.
8. Keep PR #87 unmerged until the complete round trip and user-side playtest pass. Do not reduce visual quality, weaken movement/collision assertions, or replace the physical route with a teleport-only button to clear tests.

### Important project/product guardrails

- CTM is responsible for world lifecycle/state transfer; the world adapter owns each world’s geometry, movement/collision scope, and transition triggers.
- Keep the plain-data snapshot contract. Do not return live Three.js scene/world handles from `page.evaluate()` diagnostics; it can recursively serialize `parent → Scene → root` and stall for 60–100 seconds. Diagnostic transitions should await the real transition and return a compact serializable status object.
- Missions and landmark discovery/reward popups were previously removed from the current scope. Do not resurrect landmark cash rewards/tests; cash persistence should remain independent of landmark discovery.
- Do not use a broad visual downgrade as a lag fix. The user wants high visual fidelity with scoped/split worlds and mobile performance.
- The longer architecture goal is streamed independent world segments (City, island/mansion, apartment, garage/interiors), loading expensive systems only in the active/nearby segment. World 2 is the first real-world test, not a finished feature.

**Next bounded task:** update `tests/transition-manager-browser.spec.cjs:30` to use the spawn helper/source of truth; verify whether the temporary workflow remains in the remote branch; run the targeted suite, then the full gate on the exact new SHA; inspect resulting logs/artifacts before changing anything else.

---

## Historical watchdog repair notes

### Historical watchdog-repair handoff — 2026-10-21

**Status:** In progress; browser watchdog has two failures, not field-proven  
**PR:** https://github.com/molson835-ai/Coastline/pull/84  
**Branch:** `coastline-repair-gameplay-watchdog-v1`  
**Code/test head checked:** `1b41fe9c09209f1d80a124f470ba62a24a6e837b`  
**Latest browser workflow:** https://github.com/molson835-ai/Coastline/actions/runs/39678140842 (watchdog #865; PR merge ref `c019b6b92267ccc05858d745e6ddd10d9eb0a95b`)  
**No merge or production deployment has been performed.**

## Why this repair exists

The prior watchdog run (run 39663949401, PR #83 head `09858599512861cf633750896c3a27b1a36b0232`) reported 25 passed and 10 failed. Failure groups included renderer pixel ratio, blocked spawn positions, wall-clock movement timing, jump sampling before an update, reload timeouts, adaptive shadow disablement, persisted NPC story state, mission completion timing, and Playwright discovery of Node-only tests.

## Changes on the repair branch

- Corrected initial renderer pixel ratio to `min(devicePixelRatio, lowPowerDevice ? 0.9 : 1.15)`, removing the forced 1.5 minimum.
- Removed adaptive auto-disabling of bloom and shadow maps from `game-v3.html`; target-device performance still requires measurement.
- Removed landmark discovery toast announcements while retaining discovery persistence and the $150 reward.
- Added test-only `advanceTestFrame(dt, frames)` and `findOpenWalkPosition()` helpers under `window.__coastlineTest`.
- Updated movement, steering, jump, mobile-control, NPC, mission, and reload tests to use deterministic stepping or navigation commit where appropriate.
- Inherited `testMatch: '**/*.spec.cjs'` from the runner-isolation branch.

## Latest verification

Workflow run `39678140842`, watchdog #865, ran the current PR merge ref and finished **failure**:
- Browser suite: **33 passed, 2 failed** out of 35.
- System tests: passed (job `119493670370`).
- Engine tests: passed (job `119493670399`).
- Browser job `119493670513`: failed.
- Itch.io HTML package workflow `39678141191`: passed.
- Babylon preview validation workflow `39678141117`: passed.
- Vercel preview deployment failed separately because the free daily deployment limit was exceeded (`api-deployments-free-per-day`); this is a deployment quota issue, not a test failure.
- Cloudflare preview build also reported failure for commit `1b41fe9`; logs still need inspection. Do not infer it is the same root cause as the Vercel quota.

### Failure 1 — graphics smoke test

`tests/next-phase-smoke.spec.cjs:42` expected `systems.graphics.shadows === true`, received `false`.

Confirmed source path: `coastline-runtime-fix.js` disables `renderer.shadowMap.enabled` and bloom in `emergencyMode()`. That mode can be activated after sustained frame times above 48 ms (eight overload samples), on WebGL context loss, or restored from `sessionStorage` key `coastlineEmergency`. The new `game-v3.html` change does not remove this separate injected runtime path. This is the leading explanation for the failure, but the failed run did not expose a runtime snapshot proving which trigger fired.

**Next:** inspect the smoke-test browser context and runtime snapshot, then reconcile emergency safeguards with the visual-quality requirement. Do not simply weaken the assertion. Prefer preventing unnecessary emergency activation / reducing hidden work before sacrificing shadows, bloom, or image clarity. If emergency mode is genuinely required to avoid context loss, document and measure that tradeoff explicitly.

### Failure 2 — pedestrian collision test

`tests/pedestrian-collision.spec.cjs:37` expected X movement beyond `-701.4`, received `-701.5`.

The test places the player only 1.5 world units from the pedestrian, then moves directly toward them. This is likely at or inside the collision stop distance, so the player can be blocked from the very first movement step. The test also relies on a 900 ms wall-clock wait despite the newer deterministic stepping helper.

**Next:** start far enough away to permit an approach (while still avoiding other pedestrians, vehicles, and buildings), advance a bounded deterministic simulation interval, and assert both measurable approach movement and a final safe separation. Do not weaken the collision invariant.

### Other browser results

The remaining 33 browser tests passed, including basic walking/driving, steering, landmark persistence, mobile controls, NPC story progression, mission replay, performance telemetry, service worker cache checks, and world collision checks.

## Deployment / field state

- No Android field test has been run for this patch.
- No current preview URL was produced for the latest Vercel attempt because the free daily deployment cap was reached.
- Cloudflare preview build failed separately; logs remain to be checked.
- The deterministic stepping hook is called by tests; the normal game loop still uses its normal animation loop.
- Do not merge based on code inspection alone.

## Next actions

1. Diagnose the emergency-mode trigger and graphics smoke failure using runtime evidence.
2. Fix the pedestrian test setup and make its movement interval deterministic.
3. Rerun browser watchdog, system tests, engine tests, package, and preview checks on the exact updated SHA.
4. Inspect the Cloudflare build log; retry Vercel preview only when the free daily quota resets, unless the user explicitly chooses another route.
5. Playtest the candidate on Android for image clarity, shadows/bloom, steering, mobile controls, and sustained frame time.
6. Update this handoff with exact SHA, run IDs, results, remaining risks, and next bounded task.

## Guardrails

- No test removals or assertion weakening.
- No automatic merge or production deployment.
- No global visual downgrade as a shortcut.
- Diagnose the injected runtime emergency path as well as `game-v3.html`; testing only the latter misses behavior added by the service worker.
- Do not claim CTM field proof from this repair; CTM integration is still separate.

## Follow-up repair attempt (after watchdog #865)

Commits on `coastline-repair-gameplay-watchdog-v1`:
- `a13231bf4613255d491f4b850836130ece6d3489`: pedestrian collision test now searches for a clear 4-unit approach corridor and uses `advanceTestFrame(1/60, 45)` instead of a 900 ms wall-clock wait. It asserts approach movement, collision separation, and that the player actually closes distance.
- `ebf89e4951d2464bd3a2a4fb7c8514c8c8ec6a08`: emergency quality mode no longer turns off shadow maps or bloom; emergency protection still reduces render scale and distant workload.
- `0a91b9f9dff43e237e32d2386c4f757cb8021a02`: service-worker patch now keeps shadow maps enabled and auto-updating on low-power devices rather than forcing them off.

These are source/test fixes for the two latest failures. They have **not yet been validated by a completed CI run**. Watchdog #866 or the next run triggered by this branch update must confirm the outcome. If the graphics test still fails, inspect the runtime snapshot and browser logs rather than weakening the assertion. If pedestrian test fails, inspect the selected corridor and final player/NPC positions.

Scope note: the service worker still has other low-power rendering compromises (including its no-bloom path). This repair specifically restores shadow-map state and stops emergency mode from disabling bloom; it does not claim all low-power rendering differences have been removed.

- `49b87f6dc13fbc7648b35d612e9018dadc13f29b`: bumped the service-worker cache from `coastline-static-v47` to `coastline-static-v48`, so already-installed clients discard the cached runtime that could still force shadows off. This closes a stale-cache path; the new CI run must still validate it.

## Latest rerun result — watchdog #872

Run: https://github.com/molson835-ai/Coastline/actions/runs/39686784572  
Tested SHA: `041e38751b54289434e48b7c99b0d2d7f736eac6`  
Result: **31 passed, 4 failed** in 9.1 minutes. Engine and system tests passed. HTML package and Babylon preview validations passed.

The two failures this patch explicitly targeted are now passing in this run:
- `tests/next-phase-smoke.spec.cjs`: graphics smoke test passed.
- `tests/pedestrian-collision.spec.cjs`: pedestrian collision test passed.

Four other browser tests now fail:
1. `tests/gameplay.spec.cjs:127`, landmark reward/persistence: test timed out at 45 seconds while waiting for `window.__coastlineTest` after `page.reload({waitUntil:'commit'})` at line 145. This suggests reload/init did not expose the test API before the timeout, but runtime evidence is needed to determine why.
2. `tests/landmark-discovery.spec.cjs`, regional landmark reward/persistence: 45-second test timeout. The condensed job log does not show the exact wait/assertion where this second landmark test stalled; inspect its trace/error-context artifact.
3. `tests/npc-world-slice.spec.cjs`, public-works NPC repair story: 45-second test timeout. The condensed job log does not show the precise blocked assertion; inspect trace/error context and verify deterministic stepping plus NPC story-state persistence.
4. `tests/performance-budget.spec.cjs:14`: `expect(perf.fps).toBeGreaterThan(0)` received `0`. Telemetry object exists, but frame/FPS sampling was still zero when read; determine whether the first render/frame counter never advanced or the test sampled before enough frames.

Artifact: https://github.com/molson835-ai/Coastline/actions/runs/39686784572/artifacts/12385974165

Next actions: inspect the four failed traces/error-contexts; fix root causes without relaxing assertions. In particular, avoid serializing multiple expensive game boots/reloads under two browser workers unless evidence shows worker contention is the cause. Re-run all 35 tests and record exact results. No merge or production deployment.

## Landmark cash persistence bug found and fixed (follow-up)

Inspection of watchdog #872's actual Playwright artifact confirms the user's concern was valid: the regional landmark test's final post-reload page snapshot showed HUD **CASH $250** and mode **DRIVING**. The snapshot alone is from the reload phase and does not prove the in-session reward failed; the test had timed out before it could finish verifying the reloaded state. Source inspection identified the concrete persistence defect: `cashBalance` was always initialized to `250` on every page load, while only discovered landmark IDs were stored in localStorage. Thus the $150 reward could be awarded in-session but was lost after reload.

Fix commits on the repair branch:
- `1caa3ad07a4751ff7b0e2d26bb78f9434fd0a5da`: load cash from `coastline-cash-balance-v1` (default $250 if absent/invalid) and persist balance changes from landmark rewards, mission rewards, garage task payouts, and garage purchases.
- `5b23237372780e4548faf112cf77a2bb6958e4bd`: update gameplay landmark regression to assert the awarded balance persists across reload and reset test storage only once per tab.
- `a1b05da900d9caeb43451cce1b64b15a8935a40a`: update regional landmark regression to verify cash remains $400 after reload and reset local test storage once per tab.

**Validation pending:** these commits have not yet been covered by a completed watchdog run. The previous watchdog #872 result was 31 passed / 4 failed, with landmark tests timing out during reload initialization. New assertions are intentionally retained; if reload continues to time out, address slow startup/worker contention without removing the persistence check.

- `77a144f9614a6ceb1e653bdd95f79d4303a17d91`: hardened the cash loader so a missing localStorage key correctly defaults to $250 (rather than coercing `null` to zero). This was caught during code review before accepting the persistence fix; the latest watchdog must verify the clean-start balance and persistence together.


## Follow-up: fully remove landmark discovery/rewards (2026-10-22)

**Status at handoff update:** source and regression tests changed on branch `coastline-remove-landmark-rewards-v1`; PR #85 targets `main` to ensure the main-targeted CI workflows execute on the exact candidate commit; fresh CI is pending. This supersedes the earlier sections above that describe landmark discovery as a retained, rewarding mechanic. Do not interpret the older $150 reward/persistence tests as current intended behavior.

### Source changes

- `game-v3.html`: removed the `discoveredLandmarks` localStorage-backed set, `landmarkDiscoveryState()`, and `checkLandmarkDiscovery()`, including the `cashBalance += 150` payout, cash HUD mutation, persistence write, and discovery telemetry.
- Removed all calls to `checkLandmarkDiscovery()` from deterministic test stepping and the main runtime update loop.
- Removed the obsolete discovery API entries from `window.__coastlineTest` and the obsolete landmark toast filter term.
- Landmark map coordinates/roster remain available as world geography; they no longer grant money or create discovery state.

### Regression coverage

- `tests/landmark-discovery.spec.cjs`: replaced the old “regional landmarks reward exploration” expectation with a regression asserting that visiting a landmark does not change cash, the discovery API is absent, no discovery localStorage state is written, and cash remains unchanged after reload.
- `tests/gameplay.spec.cjs`: replaced the obsolete assertion expecting a $150 landmark reward and $400 balance with a seeded cash-persistence test ($375 survives reload independently of landmark behavior). Test storage is seeded once per tab, not on every reload.
- Tests are retained as behavioral coverage; no failure is being hidden by simply deleting the tests.

### Review / failure reporting contract

For each new CI run, report the exact tested commit SHA and link to the workflow and failed browser job. For every failed test, record the test title, source file and line number, exact failed assertion/expected-versus-actual values or timeout location, and a grounded explanation of the failure. Clearly label hypotheses as unconfirmed until logs or traces support them. Do not merge or deploy based on a partial green run.


## CTM + World 2 live integration — 2026-10-22

**Workstream:** [Draft PR #87](https://github.com/molson835-ai/Coastline/pull/87)  
**Branch:** `feat/ctm-world2-live-integration`  
**Latest code/test commit at this note:** `f6a514ff86aafd7efd97eebf4a46ee32f4c58e79`  
**Status:** implementation in progress; do not merge or deploy.

### Implemented on the feature branch

- Hardened CTM failure phases, per-world saved state/return points, destination-spawn delivery, partial-load cleanup hook, and degraded-state reporting for source-disposal failure.
- Added a scene-root registry and a live adapter imported by `game-v3.html`; City and a bounded World 2 island shell now use CTM lifecycle adapters.
- Added a city bridge affordance and a proximity-gated transition button; World 2 arrival is deterministic at `(1500, groundY(1500,1500), 1500)`.
- Added City → Island → City and injected-load-failure/retry browser coverage. Transition test hooks return serializable status instead of Three.js scene handles.
- While Island is active, city NPC/traffic/mission/wildlife/debris updates and city entity-index updates are paused. The runtime spatial-budget traversal skips invisible world roots. Local point lights are grouped with City; shared sky and player fill light remain global.
- Added the adapter to the service-worker cache and itch.io package. Bumped their cache versions.
- Made the gameplay, Babylon preview, and itch package workflows preinstall `http-server@14.1.1` before readiness polling to eliminate the observed asynchronous `npx` install race.

### Verification evidence and current state

- **CTM/engine tests:** 38 passed, 0 failed in the engine job of workflow run [39711380929](https://github.com/molson835-ai/Coastline/actions/runs/39711380929), tested commit `701d1a07ec4a620da800cee603c5ac44992ac868`.
- **Itch package:** run #476 ([39711381035](https://github.com/molson835-ai/Coastline/actions/runs/39711381035)) passed the packaged Chromium smoke test before the final adapter/test-hook refinements. Newer run #481 is in progress.
- **Babylon preview validation:** run #171 ([39711380985](https://github.com/molson835-ai/Coastline/actions/runs/39711380985)) failed in the repository-server startup step because `npx http-server` was still downloading while the 30-second readiness loop ran. The preinstall fix is in the branch; rerun #176 is in progress.
- **Gameplay watchdog:** run #909 ([39711380929](https://github.com/molson835-ai/Coastline/actions/runs/39711380929)) was cancelled as the branch advanced. Before cancellation, 31 tests passed and the CTM runtime test was still in progress. Failures seen before cancellation were `landmark-discovery.spec.cjs`, `npc-world-slice.spec.cjs`, `performance-budget.spec.cjs`, and the old `transition-manager-browser.spec.cjs` expectation for the placeholder `world-1/world-2` IDs. The CTM browser test was updated to exercise live `city/island` adapters and return state. These results are not a final full-suite verdict.
- **Latest gameplay watchdog:** run #914 ([39712612206](https://github.com/molson835-ai/Coastline/actions/runs/39712612206)) is in progress for the updated browser tests. Read its final logs before claiming the CTM browser tests pass.
- Vercel preview creation remains blocked by the account's free daily deployment quota; no preview URL was produced. No production deployment or merge occurred.

### Implementation rulings / limitations

1. **City root caching:** `game-v3.html` currently builds City as one monolithic runtime and has no safe world-builder function to recreate it on return. The adapter hides and caches the City root while Island is active; CTM reports one active world handle and only one visible world root, but City resources remain allocated in memory. This is a deliberate phase-one compromise to preserve return-state continuity, **not proof of true single-world memory unloading**. Cost if wrong: memory use will not scale linearly as more worlds are added. Before claiming true memory streaming or adding many large worlds, refactor City construction into an explicit reloadable builder/teardown lifecycle and update tests to assert actual resource disposal.
2. **CI server startup:** workflows now preinstall the exact server binary in the foreground before starting it. Cost if wrong: one extra cached/download step; this removes the race without adding a project runtime dependency.

### Next bounded actions

1. Wait for gameplay watchdog #914, itch package #481, and Babylon preview #176 to finish on the current code. Record exact outcomes.
2. If the two CTM browser tests fail, inspect their Playwright traces and fix the actual root cause; do not weaken assertions.
3. Keep the three pre-existing watchdog failures above visible as separate blockers; inspect their trace artifacts before changing behavior. In particular, the NPC repair-story timeout remains relevant to the earlier loader-test handoff.
4. Perform the final whole-branch self-review (no reviewer subagent is available in this session), then update this handoff with final run IDs and deferred blockers.
5. Do not merge or deploy until the CTM browser tests and package checks are green and the City-memory-caching limitation is explicitly accepted or resolved.


### CI follow-up — 2026-10-22 02:50 UTC

- Reviewed gameplay watchdog #916 (run `39713058275`): the `browser-smoke-test` job failed in **Start local web server**, before gameplay assertions. Logs confirm the `npx http-server` server process never opened port 4173 during the 30-second loop; `npx` attempted another install after the preceding `--version` step. This is a workflow setup failure, not a CTM test verdict.
- Corrected all three browser workflows on this branch: use `npm install --global http-server@14.1.1` as a completed installation step, then invoke the installed `http-server` executable directly. Commits:
  - gameplay watchdog: `c2a413511944046cf178b268df180e6b06b5d7b0`
  - Babylon preview: `c2bfd97c76863443f7f5fd4e613b3dc88a425c61`
  - itch package: `24fb2c775d7f6b79aa5e18bb0f06f3ad6b0c0fdc`
- Latest CI triggered by these changes: itch package #484, run [39713498991](https://github.com/molson835-ai/Coastline/actions/runs/39713498991); Babylon preview #179, run [39713498992](https://github.com/molson835-ai/Coastline/actions/runs/39713498992); gameplay watchdog #917, run [39713498888](https://github.com/molson835-ai/Coastline/actions/runs/39713498888). At the last check these were still pending/in progress; no green result has been confirmed.
- The prior gameplay run's engine/system jobs were still running when checked; their verdicts are unknown. Do not infer they passed. Continue by checking these latest run IDs and collecting final job conclusions. If global npm installation is also unexpectedly slow, increase no test assertions; inspect the specific step and use a lockfile-managed dev dependency only if justified.
