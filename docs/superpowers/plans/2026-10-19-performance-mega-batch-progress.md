# Performance Mega Batch v1 — Execution Ledger

Plan: `docs/superpowers/plans/2026-10-19-performance-mega-batch.md`  
Spec: `docs/superpowers/specs/2026-10-19-performance-mega-batch-design.md`  
Branch: `coastline-performance-mega-batch-spec`  
PR: #76 (draft only; do not merge/promote)

## Progress

- Task 1 — Diagnostics: added `categoryTimingsMs` to `performanceSnapshot()`, per-frame timing wrappers for world, traffic, pedestrians, collision checks, vehicle movement, animation, audio, and rendering; added `tests/performance-category-timings.spec.cjs`. Focused fidelity test job passed on commit `fe9ae7743bf394da649bfb3e89b7543027067250`. Browser suite includes the new test but has been slow-running; reserve the full browser gate for integrated verification.
- Task 2 — Runtime cleanup/quality contract: added failing source-contract assertions in `tests/fidelity-core.spec.cjs` that forbid adaptive runtime changes to pixel ratio, bloom, or shadows under frame pressure; removed those adaptive downgrades from `game-v3.html`. Focused fidelity job passed on commit `fe9ae7743bf394da649bfb3e89b7543027067250`.
- Existing unrelated CI failures observed on this branch: `tests/world-engine-live.spec.mjs` actor-separation assertion `assert.ok(s.x < 0)`; `tests/world-engine-map.spec.mjs` expects old `coastMap` markup while current service-worker transform emits the inert `mapCanvas` compatibility shell. System tests and vehicle/fidelity tests passed.

## Rulings

- Ruling: Use fast, focused Node/fidelity contract checks after each code package and reserve the slow full Playwright browser suite for integrated verification — the existing gameplay watchdog takes several minutes and is still running after the focused jobs finish; this preserves iteration speed while retaining a final browser gate — cost if wrong: a browser-only regression may be detected later rather than immediately.
- Ruling: Do not fold the actor-separation or stale map-shell failures into this performance patch unless a later change proves they are caused by the mega batch — both fail in unrelated engine tests and fixing them here would expand scope and blur regression attribution — cost if wrong: an existing failure may still block a future merge.
- No deployment, merge, or beta promotion has occurred.
