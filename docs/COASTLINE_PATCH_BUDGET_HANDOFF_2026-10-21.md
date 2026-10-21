# Coastline Patch Budget — Durable Handoff Checkpoint

**Checkpoint:** 2026-10-21 America/New_York  
**Purpose:** Preserve the patch-sizing/submission strategy across chat limits and future agent handoffs.

## Decision

The user approved proceeding with the Coastline patch-sizing/submission-control system.

Core rule:

> Optimize for successful verified progress per submission, not maximum lines changed per day.

Normal development should favor Micro/Small patches. Medium is acceptable for one tightly coupled feature slice with one acceptance boundary. Large/Oversized changes require decomposition review.

## Durable files on this branch

- `docs/superpowers/specs/2026-10-21-coastline-patch-budget-design.md` — classification model and risk/verification rules.
- `docs/COASTLINE_SUBMISSION_BUDGET.md` — weighted operational budget and retry/cooldown model.
- `docs/COASTLINE_PATCH_PREFLIGHT.md` — pre-submission decision checklist.
- `docs/patch-budget.schema.json` — optional machine-readable metadata schema.
- `docs/patch-budget.examples.json` — valid/invalid schema examples.
- `docs/COASTLINE_CHANGE_DISCIPLINE.md` — operating discipline.

## Starting heuristics

- docs-only: 0.25 units
- test-only: 0.5
- micro code: 1
- small: 1.5
- medium: 2.5
- large: 4+
- failed retry without a new hypothesis: +1 penalty

These are calibration values, not daily platform quotas.

## Important limits

Do not invent ChatGPT/GitHub daily submission limits. Record authoritative limits only when verified. Otherwise record observed behavior such as CI duration, concurrency, successful submissions/day, deployment throttling, and recent failure rate.

Known Coastline operational constraint: Vercel free deployment throttling has previously blocked unnecessary deployments. Avoid generating preview/deployment work when source/CI verification is sufficient.

## Risk policy

Extra verification is mandatory for changes touching CTM/world loading, persistence, renderer/asset lifecycle, player controls/physics, NPC simulation, or performance-critical loops.

Repeated retries without a new hypothesis should trigger a smaller diagnostic patch rather than another broad submission.

## Calibration status

This system is **not yet CI-enforced**. It should first be applied manually to several successful and failed Coastline patches. Compare predicted patch class and budget against actual CI duration, shard consumption, failure attribution, and retries. Adjust weights from evidence.

## Current project evidence to preserve

- PR #77 CTM remains draft and is not production-promoted.
- PR #79 is a draft mission-deferral change and must be evaluated on its exact SHA/run results before being called green.
- Recent browser-shard failures have shown that test/setup/timing issues can dominate a submission; do not assume a failing browser test is a production defect until the fixture and exact run are inspected.
- Duplicate push/PR browser suites have consumed verification capacity; a later CI concurrency-efficiency change is planned after the current exact-head verification, not during an active run.

## Next action

Apply the preflight model to the next real Coastline code patch and record its predicted class, units, risk areas, exact SHA, and actual verification cost. After several observations, calibrate the model before adding an advisory CI check.

## Chat-limit checkpoint protocol

Before a Coastline chat/context limit, record the latest:

1. exact branch/PR/SHA;
2. files and systems changed;
3. targeted and full CI results;
4. failed tests and failure category;
5. current budget observation;
6. deployment/CI constraints;
7. approved decisions and rejected approaches;
8. one concrete next task;
9. anything that remains unsaved or unpushed.

Never claim that chat-only information is durable until it is committed to the repository or otherwise preserved in a verifiable project artifact.
