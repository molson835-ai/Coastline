# Coastline AI Engineering Playbook

**Status:** Proposed operating standard; documentation only. It does not change game code or automatically authorize merges/deployments.
**Purpose:** Make each human–AI development cycle more accurate, cheaper, easier to recover, and less likely to regress the playable game.

This playbook complements `AGENTS.md`, `docs/COASTLINE_AGENT_RECOVERY_GUIDE.md`, `docs/COASTLINE_CHANGE_DISCIPLINE.md`, and the patch-budget documents. It does not replace current source, tests, specs, or live CI evidence.

## 1. Mission and engineering values

Build Coastline as a family-friendly, cinematic coastal open-world game combining driving, exploration, life simulation, and authored adventure. Make the world feel larger and more alive through good systems—not uncontrolled technical complexity.

Non-negotiable values:

1. **Verified progress over activity.** A patch is valuable when its intended behavior is demonstrated on an exact SHA.
2. **Reduce invisible work before visible quality.** Preserve Coastline's visual identity; do not hide a performance defect behind a global visual downgrade.
3. **One cause, one focused experiment.** Avoid multi-system “fix everything” patches that cannot tell us what worked.
4. **Repository over memory.** Important decisions, causes, rejected hypotheses, test evidence, and next actions must be durable.
5. **Deterministic game truth.** Money, inventory, saves, progression, physics, collisions, identity, mission completion, and transitions remain owned by deterministic game systems. AI must not silently become authority for persistent gameplay truth.
6. **Honest state.** A planned, committed, tested, merged, deployed, and physically playtested change are different states.
7. **Cost awareness.** Coastline must remain buildable with the current free/low-cost setup. Do not assume or invent platform quotas; measure actual workflow duration, throttling, artifact retention, and retries.

## 2. Who does what

**Human product owner:** Sets the player experience, priorities, acceptable trade-offs, and subjective quality bar. Approves architectural direction and promotion decisions. Does not need to implement or diagnose the code personally.

**AI lead/orchestrator:** Recovers context, checks live branch/SHA/CI state, narrows the next task, selects relevant skills, chooses the smallest acceptance boundary, coordinates implementation and verification, and preserves the result in the repository.

**Implementer:** Makes the agreed change, normally in a dedicated branch/worktree, following existing architecture and tests. Changes no unrelated behavior.

**Verifier/reviewer:** Checks the diff against explicit acceptance criteria, reproduces the original symptom, reviews test output and artifacts, and challenges unsupported causal claims. A reviewer should receive the exact base/head SHAs, requirements, diff, and known risks—not a vague request to “check everything.”

These are roles, not a claim that separate AI agents were actually invoked. If no independent reviewer/tool is available, say so and perform an explicit self-review rather than pretending an independent review occurred.

## 3. Source-of-truth and recovery order

At the start of every resumed session:

1. Read `AGENTS.md` and this playbook.
2. Read `docs/COASTLINE_AGENT_RECOVERY_GUIDE.md` and the latest relevant checkpoint/patch-budget handoff.
3. Query live GitHub state: active PRs, current head SHAs, required workflows, latest job results, and merge/deploy state.
4. Open the exact current PR patch and only the source/tests needed for this task.
5. Read the accepted spec and implementation plan before architectural work.
6. Reproduce the failure and use the exact recent result, not a remembered summary.

A dated checkpoint is historical evidence, not a live status endpoint. Re-check its SHA and workflow run before taking action.

Use these labels consistently:

- **Observed:** directly measured or read at a named SHA/run.
- **Hypothesis:** explanation not yet proved.
- **Planned:** captured in a spec or plan; not implemented.
- **Approved:** the human approved the stated decision/scope.
- **Verified:** the specific behavior was checked on the named SHA.
- **Merged / Deployed / Device-tested:** only use when each action actually occurred.
- **Deferred / Rejected:** a deliberate product or engineering decision, not an unfinished task.

## 4. The task contract: one small outcome at a time

Before editing, write a short contract:

```text
Goal / player-visible outcome:
Acceptance evidence (what proves it works):
Constraints that must remain true:
In scope:
Out of scope:
Likely files/subsystems:
Targeted test:
Required broader checks:
Risk / rollback:
Patch class and expected CI cost:
```

Keep this short for a micro-fix. For architectural changes, use the brainstorming → written spec → spec review → implementation plan → execution-method choice flow. Never use an architectural idea as permission to skip its plan and approval gates.

Classify the task before work:
- **Spike:** answer a feasibility question with a bounded probe; throwaway code stays labelled throwaway.
- **Bounded:** change an existing, understood flow; state a short design and acceptance criteria before implementation.
- **Architectural:** new subsystem, interface, lifecycle, or cross-world design; use a written spec and implementation plan.

If the task expands across independent systems, stop and decompose it. Do not smuggle unrelated cleanup into a bug fix.

## 5. Standard development loop

### A. Recover and baseline
- Confirm active branch, base SHA, head SHA, uncommitted/unpushed work, and PR status.
- Read the nearest known-good evidence and the latest failure evidence.
- Run only the baseline checks needed to establish whether the workspace is already failing. Preserve existing failures distinctly.

### B. Form one falsifiable hypothesis
Write: “I believe **X** causes **Y** because **evidence Z**.” Also write what result would disprove it.

Trace state and data flow across component boundaries. In a multi-layer failure, establish what enters and leaves each layer before blaming the last visible symptom.

### C. Prove the test can detect the intended behavior
For code changes, use test-driven development where feasible:
1. Add or identify the targeted regression test.
2. Show it fails for the original reason when practical.
3. Make the smallest fix.
4. Show the same test passes.
5. Check nearby tests for regressions.

Never weaken an assertion just to get a green job. If product behavior intentionally changed, explicitly decide whether the test contract is stale and update it to test the new approved requirement—not to hide a defect.

### D. Make the smallest patch
- Prefer Micro/Small changes with one primary acceptance boundary.
- Avoid unrelated formatting, large file rewrites, and simultaneous renderer + physics + NPC changes.
- Keep interfaces explicit and assets/world resources owned by the right subsystem.
- For high-risk areas—CTM/world loading, persistence, renderer/assets, player input/physics, NPC simulation, service worker/cache, and performance loops—add focused tests and broader verification.

### E. Verify in layers
Use the cheapest reliable test first, escalating only when it remains green and the risk warrants it:

1. **Static/source policy:** required adaptive settings, no forbidden source mutation, no secret/paid dependency.
2. **Targeted unit/contract test:** the changed subsystem only.
3. **Focused browser test:** reproduce the original user-visible behavior.
4. **Related suites:** engine/system/vehicle tests as relevant.
5. **Full gameplay watchdog:** all current browser tests, traces and screenshots on the latest SHA.
6. **Package/build validation:** check distributable files and startup paths.
7. **Real-device smoke test:** only where headless CI cannot prove the behavior.
8. **Promotion:** only after explicit product-owner decision.

Do not run a costly full suite repeatedly without a new reason. Do not skip a required full gate to make the patch look complete. Before completion claims, use the verification-before-completion discipline: fresh output, exact SHA, exact run, failures counted.

### F. Review and preserve
- Inspect the entire PR diff for scope creep, accidental test edits, generated files, licensing, secrets, and unrelated changes.
- Request an independent review for important fixes/architecture when a genuine reviewer is available.
- Record the result in the failure ledger/checkpoint, including non-working experiments.
- Re-fetch the exact head and CI result after the last code/documentation commit; older green runs do not verify a newer SHA.
- Never auto-merge, force-push, or deploy a risky gameplay change without explicit human authorization.

## 6. Failure taxonomy and evidence ledger

Do not treat “a test failed” as a root cause. Classify it before patching:

- production/runtime defect;
- renderer/performance starvation;
- test assertion/contract mismatch;
- test discovery or runner contamination;
- fixture/spawn/setup problem;
- timing/race/condition-based wait problem;
- environment or browser difference;
- service worker/cache/package/deployment mismatch;
- intentionally deferred behavior;
- unrelated pre-existing failure.

For each significant failure, preserve:

```text
Date:
PR / branch:
Source head SHA:
Tested merge SHA (if different):
Workflow and run ID:
Job and exact failing test:
Expected vs actual:
Environment / viewport:
Hypothesis:
Evidence supporting:
Evidence contradicting:
Smallest next experiment:
Change and effect:
What is now ruled out:
Artifacts/traces URL and expiry:
Status:
```

Use the cycle:

**Cause hypothesis → Evidence → Effect → Next experiment.**

Keep failed hypotheses and their evidence. A failed experiment is useful when it saves future agents from repeating it. Never overwrite old evidence with the word “fixed”; add new evidence that updates the conclusion.

When several tests fail at once:
1. Cluster failures by subsystem.
2. Compare to the nearest known-good run and exact code change.
3. Check which tests still pass—passing tests count as evidence against broad theories.
4. Separate intended product changes from unintended failures.
5. Inspect traces/screenshots/runtime state before changing application code.
6. Change one cause at a time, re-run the targeted test, then the broader suite.

After three focused fixes fail or each fix moves the symptom elsewhere, pause and question the architecture with the product owner instead of continuing blind retries.

## 7. Coastline architecture and visual guardrails

- The root playable beta in `game-v3.html` uses **Three.js 0.170**. Do not inject Babylon APIs into it.
- `/babylon/` is a separate experimental/preview surface.
- CTM owns transition lifecycle, loading, handoff, camera/fade, scope cleanup, recovery, and bounded telemetry—not gameplay logic.
- Only the active world should retain expensive authoritative simulation unless profiling proves otherwise.
- Keep the many-world vision: authored, bounded worlds loaded one at a time, with versioned player-state handoff and reliable cleanup.
- Use GLB/GLTF/animation assets where appropriate, but retain deterministic gameplay movement, collision, navigation, identity, and AI state ownership.
- Runtime AI may add constrained variety/ambient dialogue; deterministic systems own game truth. Never create paid runtime AI dependencies without explicit approval.
- Verify asset licenses and attribution before shipping. Never assume an asset is free for commercial use because it is downloadable.
- Profile representative Android devices. Headless Chromium FPS is not proof of phone performance.

Performance investigations should prioritize invisible work first: unnecessary simulation, update loops, draw calls, asset duplication, stale resources, cache churn, shadow allocation, off-screen work, and world ownership. Change visible quality only for a measured, named bottleneck and a deliberate trade-off.

## 8. Test-suite hygiene

Coastline has multiple test styles. Keep each in its proper runner and make job summaries unambiguous.

- Playwright browser tests use `@playwright/test`.
- Node unit/contract tests use `node:test`.
- A test file importing `node:test` should not be accidentally executed as a Playwright test file merely because its name ends in `.spec.mjs`. Verify `playwright.config.cjs` test matching and use explicit commands/paths so unit and browser output cannot contaminate one another.
- A raw `node:test` TAP failure printed within a Playwright step must be classified separately from Playwright's reported pass/fail count.
- If a static assertion appears to contradict source at the same SHA, do not edit it immediately. Verify the exact tested merge SHA, loaded path, line/regex, runner, and checkout state, then reproduce the assertion with the same command.
- Avoid relying on arbitrary sleeps where the contract can be expressed as a state predicate; however, do not replace a short wait with a flaky immediate snapshot. Match tests to the intended interaction contract and distinguish input-edge behavior from next-frame simulation.
- Tests should validate adaptive quality policy, not assume every optional quality feature stays enabled on every device or every frame, unless that invariant is explicitly intended.

Current commands in `package.json`:
- `npm run test:engine`
- `npm run test:systems`
- `npm run test:vehicle`
- `npm run test:gameplay`
- `npm run package:itch`

Inspect the exact command and its test discovery before drawing a conclusion from a job result.

## 9. Current P0 renderer incident — 2026-10-21

**Purpose:** Preserve the current investigation; this is evidence, not a claim that P0 is fixed.

- **PR #81:** [P0 renderer runtime normalization](https://github.com/molson835-ai/Coastline/pull/81), draft/open, not merged.
- **Source head SHA:** `4afbf75e3dc03c8a62c13b4d56cd8bd4b82d53a8`.
- **Gameplay watchdog run:** [39645237597](https://github.com/molson835-ai/Coastline/actions/runs/39645237597), failed.
- **Tested merge SHA:** `27a4097523b89b86f5fab7cfaa4d8c1945612fa4`, merge of the PR head into base `187fa4a953a6a2328444aed7db549b27f3aef508).
- Engine tests and deterministic system tests passed.
- Playwright reported **31 passed, 4 failed in 4.8 minutes**.
- The graphics guard ([39645237767](https://github.com/molson835-ai/Coastline/actions/runs/39645237767)), HTML package ([39645237782](https://github.com/molson835-ai/Coastline/actions/runs/39645237782)), and Babylon preview ([39645237776](https://github.com/molson835-ai/Coastline/actions/runs/39645237776)) passed on the source head.

### Verified failing Playwright tests

1. `tests/gameplay.spec.cjs`: W acceleration expected speed (>2), received `0.2712829375510247`.
2. `tests/interactable-world.spec.cjs`: an immediate state sample after `keyDown('space')` saw neither positive jump height nor upward velocity.
3. `tests/mobile-controls.spec.cjs`: forward displacement expected (>0.5), received `0.336847119140657`.
4. `tests/next-phase-smoke.spec.cjs`: `graphics.shadows` expected `true`, received `false`.

The same job output also prints a Node TAP failure from `tests/performance-cache.spec.mjs` asserting the same-origin guard regex. At the exact tested merge SHA, raw `coastline-sw.js` visibly contains `url.origin!==self.location.origin`, and the test contains that literal regex, so this mismatch is **unresolved**. Do not label it a production cache defect or stale test yet. Determine why the assertion ran under `npm run test:gameplay` (which calls `playwright test`), verify actual test discovery/path and reproduce using the correct runner.

### Root-cause status and next experiment

The former max-graphics workflow was rewriting source after pushes, forcing pixel ratio, bloom, terrain, recovery, shadow/texture resolution, and anisotropy. PR #81 restored the adaptive values and converted that workflow to a validation-only guard. The exact guard and package checks pass, but the browser result proves renderer normalization alone has not established a clean gameplay suite.

The four Playwright failures are not yet proven to share a cause:
- vehicle steering / mobile movement may involve collision placement, simulation timing, or render-loop frame-time caps; inspect trace and state before editing;
- jump may be an input-edge/next-animation-frame test race; confirm with the intended interaction contract;
- shadows may be intentionally disabled by adaptive quality under load, so check the actual measured frame-time path and revise neither source nor test until that contract is established;
- the Node TAP failure needs an isolated reproduction and test-runner boundary review.

**Do not weaken tests, do not merge PR #81, and do not begin CTM/World 2 implementation until the next exact-SHA results have been diagnosed.** Artifact `coastline-gameplay-report` ID `12367401801` has SHA-256 `57da7542a7c9a845393c1ba78ef9ea03e8273103b79929cd96edb993cdbedb44` and expires 2026-10-28; preserve useful evidence before expiry.

## 10. How the human partner can best help

The product-owner feedback already provides strong value: the direction is clear, visual quality is protected, and approvals are explicit. The highest-value additional inputs are observations that automated headless tests cannot supply.

When testing an exact playable candidate, please share—only when convenient:
- the exact URL/build you tested;
- device/browser and whether it was Wi-Fi/mobile data if loading is relevant;
- one primary symptom at a time and the steps needed to reproduce it;
- what you expected versus what happened;
- a short screen recording or screenshot if visual/animation behavior is hard to describe;
- the in-game bug report/diagnostic JSON when practical.

A useful report is “on candidate X, tap Forward for three seconds; speed remains 0 and the car moves 20 cm,” rather than “driving feels broken.” No code reading or terminal work is required from the product owner.

Keep giving feedback in player-experience terms (“the car feels too twitchy,” “the garage doesn't stand out,” “the distance looks pixelated”). Let the engineering lead propose the smallest technical test and report its evidence. When priorities change, name the one outcome that should move ahead of the current queue. Explicitly say when something is a hard guardrail, a preference, or a deferred idea.

A green CI run never requires a human to accept a visually worse game. Conversely, a headless test cannot confirm how the game feels on a physical phone. Keep those two kinds of evidence separate.

## 11. Cost and tool discipline

- Keep the game free of paid subscriptions, metered runtime APIs, unlicensed/paid assets, and surprise recurring costs unless explicitly approved.
- The existing optional workflow described in `AI_CONTINUOUS_DEV.md` requires an `OPENAI_API_KEY`. Treat API usage as potentially billable; **do not enable or invoke it without explicit confirmation of account/billing allowance**.
- Never make up ChatGPT, GitHub Actions, or Vercel quotas. Track empirical runtime, queue delay, artifact expiry, retries, deployment throttles, and actual usage.
- Group related **read-only** repository/CI queries when useful; do not parallelize conflicting writes to the same file/ref.
- Use targeted searches/ranges before fetching giant files. Read only the part needed to form and test a hypothesis.
- Don't launch more than one redundant full watchdog for the same source SHA. If retrying, say whether the new hypothesis is transient-environment failure or a code/fixture correction.
- Avoid deploys when CI/source checks can answer the question. Deploy once the verified candidate is worth testing on the actual phone.
- Don't generate extra docs, schemas, CI enforcement, dashboards, or agents just because they are possible. First estimate the failure cost and the expected payoff; calibrate with evidence.

## 12. Improvement backlog (not automatic authorization to implement)

After the current P0 gate, consider these high-value process improvements in order:

1. **Separate test discovery/runner contracts** so Node TAP assertions and Playwright browser results are reported independently and reliably.
2. **Structured diagnostic artifact summary**: source SHA, tested merge SHA, browser/version/viewport, failures, trace locations, and artifact expiry in one durable report.
3. **Repeatable performance baseline** on representative Android hardware, including frame time, draw calls, active simulation counts, memory where supported, and visual comparison captures.
4. **Asset and world-lifecycle registry**: license, memory estimate, LOD, collision/shadow/animation cost, owning world, and disposal owner.
5. **Measured patch-budget calibration** based on actual CI duration, rework, and successful outcomes—not a guessed quota or rigid numeric limit.

These are candidates. Use the same task contract and approval/plan gates for implementation, especially where an item changes CI or architecture.

## 13. Final release checklist

Before saying a change is finished:
- [ ] Intended behavior and acceptance criteria are explicit.
- [ ] Exact branch/source SHA and tested merge SHA are recorded where relevant.
- [ ] A regression test targets the original symptom.
- [ ] Tests ran in the correct runner and the complete result was inspected.
- [ ] Existing failures are separated from new failures.
- [ ] The whole diff is reviewed for scope, secrets, licensing, and unintended visual regression.
- [ ] Required package/browser checks passed on the latest exact SHA.
- [ ] Real-device playtest is clearly marked as done or still needed.
- [ ] The handoff includes the root cause or current hypothesis, evidence, effect, and next smallest experiment.
- [ ] Merge/deploy/promotion remains a separate explicit human decision.
