# Coastline Agent Recovery Guide

**Purpose:** Make Coastline recoverable across ChatGPT context limits, new chats, different agents, and interrupted development sessions without relying on hidden conversational memory.

## 1. First principle

Treat the repository as the durable source of truth. Chat is a working session, not permanent storage.

A future agent should never have to infer whether something was approved, attempted, rejected, merged, deployed, or merely discussed.

Use explicit status words:

- **Approved** — user agreed to the direction.
- **Planned** — a plan/spec exists but implementation has not started.
- **In progress** — implementation is actively being changed.
- **Verified** — exact SHA/run/test evidence supports the claim.
- **Draft** — intentionally not production-promoted.
- **Deferred** — intentionally postponed.
- **Rejected** — explicitly ruled out.
- **Observed** — measured fact, not a theory.
- **Hypothesis** — explanation that still needs evidence.

## 2. Recovery order

When starting a new Coastline session:

1. Read the durable handoff/checkpoint documents.
2. Identify current production/main branch and active draft PRs.
3. Verify exact head SHAs.
4. Check current CI runs for those SHAs.
5. Read the relevant spec/plan before changing architecture.
6. Inspect the smallest implementation surface needed for the current task.
7. Reproduce the failure before fixing it when debugging.
8. Run the smallest targeted verification first.
9. Run required broader CI only after the targeted hypothesis survives.
10. Update the handoff with the new evidence before context ends.

Do not begin by rereading the entire repository unless the task genuinely requires it.

## 3. Failure ledger format

For every meaningful failure, preserve:

```text
Date:
SHA:
PR/run:
Symptom:
Exact failing test/job:
Cause hypothesis:
Evidence supporting it:
Evidence against it:
Change made:
Observed effect:
What this rules out:
Next smallest experiment:
Status:
```

This prevents circular debugging and repeated failed experiments.

## 4. Debugging discipline

Use this order:

**Observe → reproduce → isolate → hypothesize → make the smallest diagnostic change → verify → document.**

Do not start with a broad “fix everything” patch.

Separate these categories:

- production/runtime defect;
- test expectation defect;
- test fixture/setup defect;
- timing/race condition;
- CI/environment problem;
- intentional product-scope change;
- stale test contract;
- deployment/package problem.

A failing test does not automatically identify the category.

## 5. Current known Coastline debugging lesson

PR #79 showed why this separation matters. Its courier mission was intentionally disabled, but the browser run also produced independent failures in walking, steering, rendering, landmarks, jump, mobile controls, NPC behavior, pedestrian collision, performance telemetry, and graphics state.

Therefore:

> Never attribute a heterogeneous browser failure set to the most recently changed feature without evidence.

The exact PR #79 failure signatures and run IDs are preserved in `docs/COASTLINE_PATCH_BUDGET_HANDOFF_2026-10-21.md`.

## 6. Patch sizing

Before implementation, classify the patch:

- **Micro:** one localized behavior/documentation/test adjustment.
- **Small:** one coherent component or bug fix with one primary acceptance boundary.
- **Medium:** one tightly coupled feature slice crossing a few related files.
- **Large:** multiple significant systems or broad runtime behavior.
- **Oversized:** unrelated systems, unclear acceptance boundary, or excessive regression surface.

Default to Micro/Small. Medium is acceptable when the pieces cannot be independently verified. Large/Oversized requires decomposition review or a documented emergency reason.

## 7. High-risk Coastline areas

Extra caution is required for:

1. CTM/world loading;
2. persistence/save state;
3. renderer and asset lifecycle;
4. player input/physics;
5. NPC simulation;
6. performance-critical loops;
7. service-worker/cache behavior;
8. deployment/package entry points.

Do not combine high-risk architectural work with cosmetic changes merely for convenience.

## 8. Visual-quality guardrail

Coastline prioritizes visual fidelity. Performance work should first target:

- simulation LOD;
- spatial bucketing;
- update scheduling;
- asset lifetime/disposal;
- instancing;
- visibility and streaming;
- shadow allocation;
- expensive work outside the near-player quality radius.

Do **not** solve lag by globally lowering visual quality unless the user explicitly approves that tradeoff.

The desired strategy is:

> Reduce invisible work before reducing visible quality.

## 9. Architecture boundaries

- Root playable beta is Three.js.
- Do not introduce Babylon APIs into `game-v3.html`.
- Babylon remains a separate preview/prototype surface.
- CTM owns transition lifecycle, not gameplay truth.
- Deterministic game systems own money, progression, physics, persistence, identity, mission truth, and transitions.
- AI may provide variety/intelligence but must not own authoritative game state.
- Worlds are intentionally bounded and independently loadable.

## 10. CTM recovery rule

Before modifying CTM, verify:

- loader ownership;
- activation/retirement lifecycle;
- player-state handoff version;
- gate semantics;
- camera handoff;
- cleanup/disposal;
- failure recovery;
- telemetry bounds;
- browser acceptance tests.

Do not create a second transition framework to work around an incomplete CTM implementation.

## 11. Tool and tutorial map

Prefer official documentation when learning or repairing a workflow. Record useful links here or in the relevant project document so the next agent does not rediscover them.

### GitHub Actions

Use GitHub Actions documentation for workflow/job/run concepts, artifacts, reruns, concurrency, and workflow syntax.

Official: https://docs.github.com/en/actions

### Playwright

Use Playwright documentation for browser fixtures, locators, tracing, retries, test timeouts, projects, and test isolation.

Official: https://playwright.dev/docs/intro

For debugging a failed browser test, inspect the trace before changing application code whenever the trace is available.

### Three.js

Use the Three.js documentation for renderer lifecycle, loaders, Object3D ownership, disposal, animation, materials, shadows, and performance patterns.

Official: https://threejs.org/docs/

### Vercel

Use Vercel documentation for deployment lifecycle, previews, project configuration, and deployment limits. Avoid unnecessary preview deployments when CI/source verification is sufficient.

Official: https://vercel.com/docs

### GitHub repository navigation

For an unfamiliar subsystem, search the repository for the relevant exported/test-facing symbol first, then fetch the smallest file/range needed. Avoid reading large unrelated files merely to build context.

## 12. Efficient tool-use rules for future agents

- Search before fetching large files.
- Fetch exact PR patches when reviewing changes.
- Use workflow-job logs for exact failure signatures.
- Use artifacts/traces when browser behavior is ambiguous.
- Verify current branch/SHA before making assumptions.
- Prefer targeted tests before full browser suites.
- Do not rerun a failed job solely because it failed; rerun only when the hypothesis is “transient/environmental” and there is evidence supporting that theory.
- When a failure is deterministic, change the smallest relevant surface first.
- When multiple failures appear, cluster them by likely subsystem before patching.
- Preserve successful test evidence; passing tests are evidence against broad theories.

## 13. Chat-limit preservation protocol

Before context becomes constrained, write a checkpoint containing:

- current branch/PR/SHA;
- exact current task;
- latest verified CI;
- active failures;
- current hypothesis;
- changes already attempted;
- changes deliberately not attempted;
- approved decisions;
- deferred decisions;
- next experiment;
- useful links/tutorials discovered;
- unsaved ideas or user decisions that still need durable storage.

If a user says something that materially changes Coastline architecture, priorities, constraints, or acceptance criteria, add it to a durable project document rather than leaving it only in chat.

## 14. Handoff quality test

A handoff is good enough when a new agent can answer these questions without asking the user to repeat history:

1. What is Coastline?
2. What branch/SHA is authoritative right now?
3. What is currently broken?
4. What was already tried?
5. Why did those attempts succeed or fail?
6. What must not be changed?
7. What has the user approved?
8. What is merely planned?
9. What exact test should be run next?
10. What evidence would prove the next hypothesis wrong?
11. What known operational limits affect the patch?
12. Where are the relevant official tutorials/docs?

If any answer is missing, the handoff is incomplete.

## 15. Anti-rediscovery rule

When a future agent discovers a new important technical fact, ask:

> “Would another agent have to rediscover this from chat, logs, or trial-and-error?”

If yes, record it in the repository.

This includes:

- root causes;
- regressions;
- successful fixes;
- failed fixes;
- benchmark results;
- device/browser differences;
- deployment quirks;
- CI behavior;
- test fixture assumptions;
- architectural boundaries;
- user-approved decisions;
- rejected approaches;
- asset licensing decisions;
- performance discoveries;
- useful documentation/tutorial locations.

## 16. Never claim completion without evidence

Use the exact SHA and verification result in completion statements.

Bad:

> “The tests should pass now.”

Good:

> “SHA X was verified by targeted test Y and workflow run Z; browser shard A passed and shard B remains in progress.”

A plan, a commit, a successful local test, a successful CI run, a merged PR, and a production deployment are different states. Never collapse them into one claim.
