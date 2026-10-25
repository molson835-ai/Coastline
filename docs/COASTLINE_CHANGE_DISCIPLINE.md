# Coastline Change Discipline v2

This document is the operating contract for making fast, safe changes to Coastline.

## Core rule

**Optimize for successful verified progress per submission.** Do not optimize for lines changed, feature count, or number of commits.

A patch should be the smallest independently testable unit that preserves correctness and gives CI a clear failure boundary.

## Non-negotiables

- Never weaken a test to make a patch fit a budget.
- Never claim a platform daily limit unless it is authoritative and currently verified.
- Treat observed CI/deployment limits as empirical evidence.
- Preserve the game's visual-quality contract; do not hide performance problems with blanket visual downgrades.
- High-risk runtime areas require deeper verification even when their diff is small.
- Failed retries without a new hypothesis consume confidence and should make the next patch smaller.
- Every material patch records its exact SHA and verification evidence.
- When chat/context limits approach, write the durable checkpoint before continuing feature work.

## Patch classes

Use the patch-budget design for classification:

- **Micro:** one localized adjustment.
- **Small:** one coherent component/bug fix.
- **Medium:** one tightly coupled feature slice with one acceptance boundary.
- **Large:** multiple subsystems/significant runtime behavior; decomposition review required.
- **Oversized:** unrelated systems, poor test attribution, or excessive operational risk; split by default.

See `docs/superpowers/specs/2026-10-21-coastline-patch-budget-design.md`.

## High-risk areas

1. CTM/world loading;
2. persistence/save state;
3. renderer/asset lifecycle;
4. player input/physics;
5. NPC simulation;
6. performance-critical loops.

## Before coding

State the single behavior being changed, affected files/systems, independent test boundary, highest-risk subsystem, and likely verification cost.

If the answer contains several unrelated behaviors, split the work.

## Before submission

Run `docs/COASTLINE_PATCH_PREFLIGHT.md` and record:

- patch class;
- budget estimate;
- targeted verification;
- expected full gate;
- exact SHA after completion.

## Retry discipline

A failed run is not a reason to immediately resubmit the same patch. Inspect the exact run, identify the failure category, formulate a new hypothesis, and make the smallest evidence-backed correction.

## Scope and merge discipline

Architectural work gets its own spec and implementation plan before code. Keep unrelated strategic work out of a bug-fix patch. Do not merge or promote a PR merely because CI is green; deployment and product promotion remain explicit human decisions.
