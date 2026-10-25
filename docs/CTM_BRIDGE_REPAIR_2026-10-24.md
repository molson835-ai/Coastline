# CTM Bridge Repair Findings — 2026-10-24

## Resume point

PR #90 (`fix/ctm-directional-trigger-traffic-lanes`) remains the actual repair PR, targeting `feat/ctm-world2-live-integration`. PR #91 is validation-only and must not be merged. No Vercel deployment is authorized until the automated gates are green and the user accepts a fresh exact-head build.

## Handoff review

The master handoff and `docs/CTM_DEBUG_FINDINGS_2026-10-22.md` correctly identified the CTM architecture, fixed-spawn contract, serializable test API, collision-scope isolation, and the requirement for physical bridge traversal. The latest 40/42 browser result narrowed the remaining work to two bridge regressions.

## Root-cause findings

### 1. Island → City `wrong-heading` failure

The failing browser assertion expected `autoTriggerState()` to report `ready` after calling `updatePrompt()`. That API is intentionally side-effecting: `updatePrompt()` checks the bridge zone and immediately requests the CTM transition. By the time the test queried the state, the active world had legitimately become City and the diagnostic was evaluating the City → island direction, where the arrival heading is intentionally wrong for an immediate reverse transition.

This is a test sequencing bug, not evidence of a broken CTM transition. The regression test was changed to set the vehicle position, then poll for the expected world transition instead of asserting `ready` after the side-effecting call.

### 2. City → island `outside-end-zone` failure

The runtime diagnostic reported the vehicle at approximately `z=-815.56` after the test's 30 × 10-frame loop. The City bridge endpoint is `z=-850`, with an 18-unit endpoint trigger zone beginning at `z=-832`. The vehicle had simply not simulated far enough to enter that zone.

The current vehicle dynamics use a 7.8 m/s² car acceleration with damping. A 300-frame (5-second) test drive from `z=-740` reaches roughly `z=-814`, matching the observed failure. Extending the loop to 350 frames moves the simulated vehicle past `z=-836`, entering the existing trigger zone without changing production bridge geometry or weakening the trigger.

This is therefore a test-duration defect, not a production bridge endpoint defect.

## Repairs applied

- `tests/ctm-browser-regressions.spec.cjs`: removed the side-effecting `updatePrompt()` readiness assertion and let the test verify the resulting automatic world transition.
- `tests/world-transition-runtime.spec.cjs`: increased the City-side simulated bridge traversal from 300 to 350 frames so it reaches the existing physical end trigger under the actual vehicle acceleration/damping model.

Repair commits are on the same PR #90 branch. The exact current head after these two test commits is recorded by CI as `8afd71597ea82d2035f5e9ad9010629f7571c19c`.

## Verification required

1. Fresh gameplay watchdog run for exact head `8afd71597ea82d2035f5e9ad9010629f7571c19c` must finish with the two bridge failures cleared.
2. Full browser suite must remain green; do not stop at the CTM subset.
3. Engine, systems, vehicle, and itch package checks must remain green.
4. Review any unrelated failures independently; do not mask them as bridge fixes.
5. Only after all gates pass: fresh exact-head preview, then user Android physical round trip.

## Research note

The trigger design follows the standard game-development pattern of a non-blocking spatial trigger/volume that detects entry and starts the transition while leaving the physical route traversable. Unity's current trigger documentation describes the same separation: trigger volumes detect actors without causing physical collision, and corridor/checkpoint triggers are appropriate for automatic events. See the official Unity trigger documentation if future bridge trigger architecture is expanded.

## Guardrails

- Do not merge PR #90 or #87 based on partial green status.
- Do not use a Vercel preview as a verification result before the test gate.
- Do not replace the physical bridge with a teleport-only button.
- Do not reduce visual quality to address these transition test failures.
