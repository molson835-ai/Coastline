# Coastline — Failure-Only Change Discipline & Trial Ledger

**Checkpoint:** 2026-10-21 America/New_York

## Purpose

This document preserves the project's debugging discipline across chat/context limits. It is a companion to `docs/COASTLINE_HANDOFF.md`, not a replacement for it.

## Non-negotiable change rule

When a test, CI job, runtime diagnostic, or physical playtest fails:

1. **Reproduce and isolate the actual failure first.**
2. **Inspect the failing assertion, production path, setup, timing, spawn state, and relevant logs before changing anything.**
3. **Determine whether the failure is production behavior, a test/setup defect, or an environmental/CI artifact.**
4. **Change only the smallest necessary failure point.**
5. **Do not modify unrelated systems merely because they are nearby or could theoretically be improved.**
6. **Do not weaken an assertion just to make CI green.** Preserve the intended behavioral contract.
7. **Do not change production gameplay/graphics/performance behavior when evidence shows the test or CI assumption is wrong.**
8. **Do not lower visual quality to solve performance unless the user explicitly approves that tradeoff.** First investigate measured redundant work, world scope, streaming/culling, instancing/caching, collision/AI scope, and other hotspots.
9. **After a correction, evaluate likely secondary failure modes before resubmitting.** Do not immediately stack speculative fixes.
10. **Only submit a new revision once the cause and correction are sufficiently supported by evidence.**

## Evidence standard

Every material correction should record:

- exact branch and head SHA;
- exact failing workflow/run and job/shard;
- failing test/assertion and observed behavior;
- reproduction details and relevant logs/artifacts;
- root-cause classification: production / test / setup / timing / CI-environment / unknown;
- why the proposed correction addresses that cause;
- exact files changed;
- what was intentionally **not** changed and why;
- local/CI/preview/physical-device verification separately;
- remaining uncertainty and the next diagnostic if it fails again.

A green result on an older SHA is never evidence that a newer SHA is green.

## Current verified repair ledger

### Performance telemetry gate
- Failing test: `tests/performance-budget.spec.cjs` on browser shard 2.
- Observed failure: timeout waiting for a telemetry snapshot whose FPS value satisfied `fps > 0`.
- Relevant project policy: `docs/PERFORMANCE_BUDGET.md` explicitly says headless CI FPS is not representative of real-device performance and should validate telemetry shape rather than impose a hard FPS gate without a stable hardware baseline.
- Root cause classification: **test/CI expectation**, not established production rendering failure.
- Correction: changed the test readiness/final validation to require `Number.isFinite(fps)` rather than `fps > 0`.
- Production code: **not changed**.
- Commit: `d57080ef383adc5ad41fa93b2c6e66b821277230` (`test: align CI performance telemetry gate with documented headless FPS policy`).

### Courier replay probe
- Failing test: `tests/replayable-mission.spec.cjs` replay courier mission.
- Observed failure: timeout waiting for `missionState === 'done'`.
- Production delivery target: `(100, -50)`.
- Production completion condition is strict `< 9` distance.
- Previous test probe `(100, -41)` was exactly 9 units from the target and therefore **outside** the production completion zone.
- Root cause classification: **test setup defect / boundary-condition error**.
- Correction: moved the test probe to `(100, -44)`, six units from the target and safely inside the strict `< 9` zone while avoiding the exact target center.
- Production mission code: **not changed**.
- Commit: `d8b2895db0ddcc1b26f3be555e0ce1fbf67f847` (`test: use strict-inside courier delivery probe`).

## Current exact-head verification

- Branch: `coastline-transition-manager-v1`
- PR: #77, draft, base `coastline-fidelity-core`.
- Exact submitted head: `d8b2895db0ddcc1b26f3be555e0ce1fbf67f847`.
- Exact-head workflow: Coastline gameplay watchdog #838, run ID `39590300455`.
- At checkpoint creation: workflow was pending; no green result is claimed.
- Required next action: inspect every job/shard on this exact SHA and diagnose any new failure before making another change.

## Scope protection

The following are explicitly protected from speculative changes during this CI repair cycle:

- root Three.js game runtime and its visual quality;
- vehicle steering direction/sign unless a reproducible production defect is demonstrated;
- pedestrian collision behavior;
- NPC gameplay behavior;
- CTM lifecycle architecture;
- World 2/Home 1 implementation;
- Babylon experiment under `/babylon/`.

The root beta is Three.js 0.170. Do not introduce Babylon APIs into `game-v3.html`.

## Trial-and-error memory

When a failure is disproven as a test/setup problem, preserve that conclusion so future agents do not repeat the same investigation or “fix” production behavior unnecessarily. In particular:

- persistent `addInitScript` state clearing can erase state on reload and create false NPC persistence failures;
- large synchronous browser-thread world scans can create artificial test timeouts;
- dense/blocked spawn points can make movement assertions appear to be steering failures;
- exact geometric boundaries must account for strict vs inclusive production comparisons;
- headless FPS is not a substitute for Android device performance evidence.

## Chat-limit checkpoint protocol

Before a conversation ends or context becomes constrained, record the current exact SHA, open failure(s), root-cause findings, commits, test results, and next action here or in `COASTLINE_HANDOFF.md`. Do not leave critical trial-and-error conclusions only in chat history.

Never record secrets, credentials, cookies, tokens, or unnecessary personal information.
