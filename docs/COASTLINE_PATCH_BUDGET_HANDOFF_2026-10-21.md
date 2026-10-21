# Coastline Patch Budget — Durable Handoff Checkpoint

**Checkpoint:** 2026-10-21 America/New_York  
**Purpose:** Preserve patch-sizing/submission strategy, failure evidence, recovery knowledge, and agent operating guidance across chat limits and future agent handoffs.

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
- `docs/COASTLINE_AGENT_RECOVERY_GUIDE.md` — durable instructions for future agents/chats, including failure taxonomy, evidence capture, tool/workflow guidance, and knowledge-retention rules.
- `docs/COASTLINE_AI_ENGINEERING_PLAYBOOK.md` — end-to-end human–AI operating workflow, test-runner hygiene, exact current P0 browser failure ledger, user-feedback guidelines, and free-tier/tool-cost discipline.

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

## Latest verified failure evidence — PR #79

**PR:** #79, `coastline-defer-courier-missions-v1`  
**Source SHA:** `6922fae44b41d0f19c3f7f766de46940dc2dcfdc`  
**Merge-test SHA:** `398d00d9301b6a183b60770c458f2df4bfdce5c1`  
**Gameplay watchdog:** run #846 / ID `39619317311`  
**Result:** failed; 23 passed, 12 failed.

The run proves several important things:

1. Deterministic system tests passed.
2. World-engine tests passed.
3. The browser suite reached the application and ran 35 tests; this was not a simple server-start failure.
4. The failures were heterogeneous rather than one single obvious production defect.
5. Courier deferral intentionally caused the existing courier test to fail (`missionState` remained `go` instead of `deliver`). This is expected scope/test mismatch and must be handled as a deliberate product/test contract decision, not by weakening the test.
6. Several unrelated browser tests failed in the same run: cinematic pixel-ratio assertion, walking timeout, steering acceleration, landmark reload, jump, mobile controls, graphics-shadow state, NPC repair state, pedestrian collision, performance FPS, and courier mission.
7. Therefore this run must **not** be summarized as “the courier change broke everything.” The evidence indicates a broader browser-runtime/test-fixture compatibility or initialization problem plus intentional mission deferral.

### Concrete failure signatures to preserve

- Cinematic rendering: expected pixel ratio `<= 1.15`, received `1.5`.
- Walking: `page.evaluate(() => window.__coastlineTest.state())` timed out after 45s.
- Steering: W acceleration expected `>2`, received `0.271...`.
- Landmark reload: `window.__coastlineTest` failed to become available within 20s after reload.
- Interactable world: jump had neither positive height nor upward velocity.
- Mobile controls: forward movement only `0.0284`, expected `>0.5`.
- Next-phase smoke: graphics shadow state was false.
- NPC world slice: phase remained `idle`, expected `repairing`.
- Pedestrian collision: player x did not advance from `-701.5`.
- Performance budget: FPS was `0` when the test expected a positive value.
- Courier: `startMission()` left `missionState` as `go` because courier mission was deliberately disabled.

### Environment/evidence notes

The browser job used GitHub-hosted Ubuntu 24.04, Node 20.20.2, Playwright Chromium 156.0.8078.4, and a local `http-server` on port 4173. The server eventually served tests successfully. Playwright's FFmpeg first encountered a DNS resolution error and then downloaded successfully from its fallback CDN; this did not prevent the test suite from running.

Do not treat a browser-run failure as a source-code regression until the failure signature, fixture state, initialization state, and exact SHA are compared against the nearest known-good run.

## Current CI state after PR #80 submission (historical snapshot)

PR #80 is the documentation/process branch for this operating system. The prior snapshot recorded watchdog run #847 in progress at an earlier point. Live re-check on 2026-10-21 showed PR #80 head `e183f6d62d9c63aa82b43c95530a93045c6da0e7`: gameplay watchdog run `39642460781` failed; itch.io package run `39642460918` and Babylon preview run `39642460784` passed. These are branch-specific results, not evidence about main or the current renderer-normalization branch. Always query live status before acting.

## Latest P0 renderer evidence — 2026-10-21

- PR #81: `https://github.com/molson835-ai/Coastline/pull/81`, still draft/open at the checkpoint; source head `4afbf75e3dc03c8a62c13b4d56cd8bd4b82d53a8`.
- Graphics guard run `39645237767`, HTML package run `39645237782`, and Babylon preview run `39645237776` passed on that head.
- Gameplay watchdog run `39645237597` failed on tested merge SHA `27a4097523b89b86f5fab7cfaa4d8c1945612fa4`: engine/system jobs passed; Playwright reported 31 passed and 4 failed over 4.8 minutes.
- Four reported browser failures: vehicle acceleration (speed 0.271 vs >2 expected), jump input sampled before positive height/velocity, mobile forward displacement 0.3368 vs >0.5 expected, and graphics shadow state false when test expected true.
- The same job emitted a separate TAP failure from `tests/performance-cache.spec.mjs`; the assertion appears inconsistent with the raw service-worker source at the same merge SHA. Treat this as unresolved test-runner/path evidence, not as a confirmed source defect.
- Artifact `12367401801` / `coastline-gameplay-report` expires 2026-10-28; SHA-256 `57da7542a7c9a845393c1ba78ef9ea03e8273103b79929cd96edb993cdbedb44`.
- Next action: inspect traces and exact runner/path behavior, classify these failures individually, and create one focused test/fix at a time. Do not weaken tests or merge PR #81 while unresolved.

## Calibration status

This system is **not yet CI-enforced**. It should first be applied manually to several successful and failed Coastline patches. Compare predicted patch class and budget against actual CI duration, shard consumption, failure attribution, and retries. Adjust weights from evidence.

## Patch sizing rule for future work

Before changing code, write down:

1. single behavior being changed;
2. exact files/systems touched;
3. highest-risk subsystem;
4. targeted test proving the change;
5. broader CI required;
6. predicted patch class and budget units;
7. what evidence would prove the hypothesis wrong;
8. what can be split into a separate patch.

If the answer cannot be stated cleanly, the patch is probably too large.

## Failure-learning rule

Every meaningful failure should leave behind four durable facts:

**Cause hypothesis → Evidence → Effect → Next experiment.**

Also record rejected hypotheses when they were tested. A failed experiment is valuable only if a future agent can tell what it ruled out.

Never overwrite an old failure with “fixed.” Preserve the original SHA/run and add the later verification that changed the conclusion.

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
9. anything that remains unsaved or unpushed;
10. useful commands, tool locations, official documentation, or workflow tutorials discovered during the work;
11. any reasoning that would otherwise exist only in chat.

Never claim that chat-only information is durable until it is committed to the repository or otherwise preserved in a verifiable project artifact.

## Recovery priority

A new agent should read, in order:

1. `docs/COASTLINE_HANDOFF.md` if/when present on the active recovery branch;
2. `docs/COASTLINE_AGENT_RECOVERY_GUIDE.md`;
3. this checkpoint;
4. current CTM/spec/plan documents;
5. current PR/CI state;
6. only then inspect implementation files.

The goal is to prevent a new chat from spending its context rediscovering decisions, failed experiments, architecture boundaries, or operational constraints.

## Next action

Apply the preflight model to the next real Coastline code patch and record its predicted class, units, risk areas, exact SHA, and actual verification cost. Before fixing PR #79 browser failures, isolate the smallest reproducible browser-runtime failure rather than bundling multiple fixes.
