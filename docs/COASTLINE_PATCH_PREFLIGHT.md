# Coastline Patch Preflight v1

Use this checklist before submitting a material Coastline patch.

## 1. Define the boundary

1. **What single behavior changes?**
2. **What exact files and systems change?**
3. **Can the change be tested independently?**
4. **What is the smallest useful patch?**
5. **What existing test proves the behavior?**
6. **What new test is required, if any?**
7. **What is the highest-risk subsystem touched?**
8. **How much CI/submission budget should this consume?**
9. **What could be split into a separate patch?**
10. **What evidence would prove this patch failed?**

## 2. Classify

Use `docs/superpowers/specs/2026-10-21-coastline-patch-budget-design.md`.

- [ ] Micro
- [ ] Small
- [ ] Medium
- [ ] Large — decomposition review completed
- [ ] Oversized — split, or emergency override documented

Record the estimated budget units from `docs/COASTLINE_SUBMISSION_BUDGET.md`.

## 3. Stop conditions

Do not submit yet if any apply:

- [ ] Unrelated fixes are bundled.
- [ ] Architecture and cosmetics are mixed without one acceptance boundary.
- [ ] Behavior cannot be independently tested.
- [ ] Failure attribution would be ambiguous.
- [ ] Multiple unrelated rollback strategies are required.
- [ ] The patch is growing because the original idea was larger than the smallest useful slice.
- [ ] A retry has no new evidence or hypothesis.

## 4. Fast path

A Micro/Small patch may use the fast path when:

- one behavior is affected;
- no high-risk subsystem is touched;
- targeted tests are deterministic;
- no persistence, CTM, renderer/asset lifecycle, player-control, or performance-critical behavior is changed;
- the acceptance boundary is obvious.

Run the targeted verification before submission.

## 5. Full-gate path

Use the relevant targeted gate plus broader regression verification for changes affecting:

- CTM/world loading;
- persistence/save state;
- renderer or asset lifecycle;
- player controls/physics;
- NPC simulation;
- performance-critical loops;
- visual quality or device-specific behavior.

Do not claim physical-device results from browser CI.

## 6. Retry rule

A failed submission is evidence, not permission to blindly retry.

Before retrying:

1. identify the exact failing SHA/run/test;
2. classify the failure as production, test/setup, timing, environment, infrastructure, or unknown;
3. state the new hypothesis;
4. make the smallest corrective change;
5. run the narrowest useful test;
6. then spend another full-gate submission if justified.

## 7. Completion record

Every material patch should leave:

- exact SHA;
- branch/PR;
- patch class and budget units;
- files/systems changed;
- targeted test result;
- required CI result;
- physical-device result when applicable;
- deployment status;
- known remaining limitations;
- next recommended patch boundary.

This record belongs in the relevant handoff/recovery document before chat/context limits are reached.
