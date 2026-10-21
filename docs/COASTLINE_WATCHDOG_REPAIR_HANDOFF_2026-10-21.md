# Coastline Gameplay Watchdog Repair Handoff — 2026-10-21

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
