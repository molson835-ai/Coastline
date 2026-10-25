# Coastline Patch Budget Design v1

**Date:** 2026-10-21  
**Status:** Approved operating design; calibration required before CI enforcement.

## Purpose

Coastline should optimize for **successful verified progress per submission**, not maximum lines changed. Patch size is therefore determined by independent testability, regression surface, risk, and verification cost—not line count alone.

This design is advisory until real project data is sufficient to calibrate it. It must never be used to weaken tests or hide a production regression.

## Patch classes

| Class | Definition | Normal gate |
|---|---|---|
| Micro | One localized behavior, test, or documentation adjustment with minimal regression surface. | Targeted test/check. |
| Small | One coherent component or bug fix with one primary verification cycle. | Targeted tests + relevant smoke/regression gate. |
| Medium | One feature slice crossing a few related files with one bounded acceptance boundary. | Targeted tests + affected subsystem gate + broader regression as appropriate. |
| Large | Multiple subsystems or significant runtime behavior. | Explicit decomposition review before submission; full relevant gate. |
| Oversized | Unrelated systems, no coherent test boundary, excessive operational cost, or confidence too low to attribute failures. | Split by default. Emergency override requires written reason and follow-up verification. |

## Scoring inputs

The preflight assessment considers:

- files changed;
- estimated lines changed;
- production/test/docs ratio;
- systems touched;
- interfaces/dependencies touched;
- runtime criticality;
- renderer/asset lifecycle impact;
- persistence/save-state impact;
- world/CTM impact;
- test count and expected duration;
- recent failures/retries;
- expected CI/shard consumption.

### Risk areas

Highest-risk areas are:

1. world loading / CTM;
2. save and persistence;
3. renderer / asset lifecycle;
4. player input / physics;
5. NPC simulation;
6. performance-critical loops.

A patch touching a high-risk area can require a deeper gate even when its diff is small.

## Advisory score

The score is a decision aid, not a line-count law.

Start with a **surface score**:

- +1 each production file changed, capped at +5;
- +0.5 each test file changed, capped at +2;
- +0.25 each documentation-only file changed, capped at +1;
- +1 for each distinct runtime subsystem touched after the first, capped at +4;
- +1 for each independent interface/dependency boundary changed, capped at +3;
- +1 for a high-risk runtime area, +2 when two or more high-risk areas are touched;
- +1 for renderer/asset lifecycle impact;
- +1 for persistence/save-state impact;
- +1 for CTM/world lifecycle impact;
- +1 for expected CI/shard cost above the normal targeted gate;
- +1 for each recent failed retry without a new hypothesis, capped at +3.

Lines changed are recorded for context but do **not** independently determine class. A small diff that crosses several systems can therefore be Large/Oversized.

Suggested interpretation:

- **0–2:** Micro candidate
- **3–5:** Small candidate
- **6–9:** Medium candidate
- **10–13:** Large candidate / decomposition review
- **14+:** Oversized candidate unless an explicit atomicity or emergency exception is documented

These ranges are calibration starting points, not permanent limits.

## Decomposition triggers

Split before submission when any of these apply:

- unrelated subsystems are mixed together;
- architectural and cosmetic work are combined without one acceptance boundary;
- multiple independent acceptance criteria exist;
- failures would be difficult to attribute to one behavior;
- the patch needs unrelated rollback strategies;
- expected CI runtime or queue pressure becomes excessive;
- a retry is being made without new evidence or a new hypothesis.

### Valid atomic exception

A Large change may remain atomic when splitting would make correctness worse—for example, two tightly coupled state-machine changes that cannot be tested independently. Record:

1. why the pieces cannot be separated safely;
2. the single acceptance boundary;
3. the rollback strategy;
4. the exact verification evidence.

## Verification depth

| Risk | Required verification |
|---|---|
| Low | Targeted unit/documentation check. |
| Normal | Targeted test + affected smoke suite. |
| High | Targeted test + affected subsystem gate + relevant broader regression. |
| Critical | High-risk targeted gate + complete required CI for the affected surface; physical-device evidence when the claim is device-specific. |

High-risk classification can override an otherwise Micro/Small patch.

## Operational rule

Until calibration data exists, prefer **one independently testable behavior per patch**, normally Micro/Small. Use Medium only when the pieces share one acceptance boundary. Treat Large/Oversized as review events rather than normal submission sizes.

## Calibration requirement

After several representative patches, compare predicted class and verification cost against actual CI duration, failure rate, retries, and defect attribution. Adjust weights only from observed project evidence. Do not create a fictional platform daily limit.

## Representative examples

| Example | Expected class | Reason |
|---|---|---|
| Correct one wording/README typo | Micro | Documentation-only, isolated. |
| Fix one steering sign/logic defect with focused regression test | Small | One behavior, one acceptance boundary. |
| Add one CTM telemetry field plus its bounded test | Small/Medium | Related lifecycle interface and test. |
| Add a new world factory, gate, loader integration, and persistence handoff | Large | Multiple lifecycle interfaces; must be staged. |
| Change CTM, renderer, NPC simulation, and vehicle controls together | Oversized | Unrelated high-risk surfaces and poor failure attribution. |
| Character GLB benchmark: fixture + one player + one NPC + benchmark test | Medium | Tightly coupled benchmark slice with one decision boundary. |
