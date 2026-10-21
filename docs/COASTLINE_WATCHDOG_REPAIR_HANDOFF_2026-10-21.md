# Coastline Gameplay Watchdog Repair Handoff — 2026-10-21

**Status:** In progress; CI queued, not yet field-proven  
**PR:** https://github.com/molson835-ai/Coastline/pull/84  
**Branch:** `coastline-repair-gameplay-watchdog-v1`  
**Current head:** `e37a7879de49b3cbf108064e2014d747db22595c`  
**Base:** `main`  
**No merge or production deployment has been performed.**

## Why this repair exists

The prior watchdog run (run 39663949401, PR #83 head `09858599512861cf633750896c3a27b1a36b0232`) reported 25 passed and 10 failed. Failure groups:

- Renderer pixel ratio: 1.5 when the test contract required <= 1.15.
- Walking movement: the test spawned at (0,0), which was not guaranteed to be collision-free.
- Vehicle acceleration: tests used short wall-clock sleeps, which are unreliable under a heavily loaded browser.
- Jump: the test sampled jump state before the next simulation update.
- Landmark persistence: reload waiting for DOMContentLoaded hit a long timeout.
- Mobile forward motion: test depended on wall-clock frame delivery while holding a mouse input.
- Smoke test: adaptive quality disabled shadows, violating the visual-system assertion.
- NPC story: test depended on rendered-frame scheduling and could inherit persisted story state.
- Courier mission: state completion was expected from the live loop after moving to the target.
- Playwright discovery: browser suite and Node `.spec.mjs` tests needed explicit separation.

## Changes on the repair branch

- Corrected initial renderer pixel ratio to `min(devicePixelRatio, lowPowerDevice ? 0.9 : 1.15)`, removing the forced 1.5 minimum.
- Removed adaptive auto-disabling of bloom and shadow maps. Pixel ratio remains the first adaptive response. This favors visual continuity; target-device performance must still be measured.
- Removed landmark discovery toast announcements while retaining discovery persistence and the $150 reward.
- Added test-only `advanceTestFrame(dt, frames)` and `findOpenWalkPosition()` helpers under the existing `window.__coastlineTest` surface.
- Updated movement, steering, jump, mobile-control, NPC, mission, and reload tests to use deterministic stepping or navigation commit where appropriate.
- Inherited `testMatch: '**/*.spec.cjs'` from the runner-isolation branch so Playwright does not discover Node-only `.spec.mjs` tests.

## Verification state

- CI run 39677806287 (gameplay watchdog #861) began for code/test SHA `a7045f65754c8e081c03b490c5579f35ce01e3d2`; a branch update cancelled that browser attempt before results were emitted. A rerun was requested and the run is pending. The latest head `e37a7879de49b3cbf108064e2014d747db22595c` includes one additional test-only fix so the NPC persistence reset happens only on the first page load; that final change is not covered by the pending run yet.
- No successful gameplay-watchdog result has yet been observed for this head.
- No Android field test has been run for this patch.
- The deterministic stepping hook is only called by tests; normal runtime continues to use the normal animation loop.
- Do not merge based on code inspection alone.

## Next actions

1. Inspect workflow run 39677806287 and retrieve exact failure output.
2. Fix source defects first; adjust test assumptions only when the assumption is demonstrably invalid or contradicts the approved scope.
3. If tests fail due to the deterministic helper, verify its state transitions against the real loop and avoid introducing divergent test-only behavior.
4. Verify package, Node, browser, and preview checks on the exact current SHA.
5. Playtest the resulting candidate on Android, especially image clarity, shadows/bloom, movement, steering, mobile controls, and sustained frame time.
6. Update this handoff with exact SHA, run IDs, results, remaining risks, and the next bounded task.

## Guardrails

- No test removals or assertion weakening in this patch.
- No automatic merge or production deployment.
- No global visual downgrade as a shortcut.
- Do not claim CTM field proof from this repair; CTM integration is still separate.
