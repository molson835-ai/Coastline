# Coastline Patch Budget and Submission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a measurable patch-sizing and submission-budget system that helps Coastline move quickly while reducing regressions, oversized changes, wasted CI runs, and avoidable daily-limit/context pressure.

**Architecture:** Use a lightweight preflight score rather than a rigid line-count rule. The system evaluates change surface, files/systems touched, test burden, risk, dependency count, and recent failure history. It assigns a patch class (micro/small/medium/large/oversized), recommends the smallest viable patch boundary, selects the required verification depth, and tracks empirical submission/CI limits without pretending that undocumented ChatGPT/GitHub daily limits are fixed constants.

**Tech Stack:** Markdown/JSON documentation, existing GitHub Actions metadata, existing test commands, optional small JavaScript validation utility if implementation proves useful, and existing handoff/CI documentation.

**Spec:** `docs/superpowers/specs/2026-10-21-coastline-strategic-direction-v1.md`

## Global Constraints

- Never weaken tests to make a patch fit the budget.
- Patch size is determined by independent testability and risk, not by an arbitrary line-count target alone.
- A large feature may be strategically correct but must be decomposed into independently verifiable patches.
- Daily submission limits are treated as empirical operational constraints unless an authoritative documented limit is available.
- Failed submissions consume budget; repeated retries without new evidence are discouraged.
- Production changes, test-only changes, documentation-only changes, and generated artifacts are scored differently.
- Emergency hotfixes may use an override but must record the reason and follow-up verification.
- Every completed patch records exact SHA and verification evidence.

## Review Focus

1. **False precision** — the system must not claim an exact ChatGPT/GitHub daily cap that has not been verified. Test: unknown limits are represented as observed usage and conservative budget recommendations.
2. **Line-count gaming** — a tiny diff that changes many systems must still score large. Test: system-touch and dependency-touch metrics can escalate patch class independent of lines changed.
3. **Under-testing** — a small patch with high-risk behavior must receive deeper verification. Test: risk tier can increase required gate depth.
4. **Retry storms** — repeated failed submissions must reduce confidence/budget. Test: recent failure history increases caution and can force decomposition.
5. **Velocity collapse** — over-fragmentation can create unnecessary overhead. Test: closely coupled changes with one test cycle may remain one patch when reviewer boundaries support it.

---

### Task 1: Define the patch classification model

**Files:**
- Create: `docs/superpowers/specs/2026-10-21-coastline-patch-budget-design.md`
- Test: documented example matrix covering representative Coastline changes.

**Interfaces:**
- Consumes: current Coastline change discipline and strategy docs.
- Produces: patch classes, scoring inputs, thresholds, overrides, and required verification depth.

- [ ] **Step 1: Define patch classes**

Use five classes:

- **Micro:** one localized behavior/documentation/test adjustment; minimal regression surface.
- **Small:** one coherent component or bug fix with one primary verification cycle.
- **Medium:** one feature slice crossing a few related files with a bounded integration test.
- **Large:** multiple subsystems or significant runtime behavior; requires explicit decomposition review.
- **Oversized:** crosses unrelated systems, lacks a coherent test boundary, or exceeds operational confidence limits; must be split unless an emergency override is justified.

- [ ] **Step 2: Define scoring inputs**

At minimum score:

- files changed;
- estimated lines changed;
- production vs test/docs ratio;
- number of systems touched;
- number of interfaces/dependencies touched;
- runtime criticality;
- asset/renderer impact;
- persistence/save-state impact;
- world/CTM impact;
- test count and test duration;
- recent failure/retry history;
- expected CI/shard consumption.

- [ ] **Step 3: Define risk multipliers**

Highest-risk areas should include:

1. world loading/CTM;
2. save/persistence;
3. renderer/asset lifecycle;
4. player input/physics;
5. NPC simulation;
6. performance-critical loops.

- [ ] **Step 4: Define decomposition triggers**

Examples:

- more than one unrelated subsystem;
- both architectural and cosmetic changes in one patch;
- multiple independent acceptance criteria;
- test suite becomes difficult to attribute to one change;
- patch needs several unrelated rollback strategies;
- CI runtime or submission cost becomes excessive.

- [ ] **Step 5: Define explicit exceptions**

A large atomic change may remain together when splitting would make correctness worse, but the reason and test boundary must be documented.

---

### Task 2: Define the operational submission budget

**Files:**
- Modify: `docs/COASTLINE_CHANGE_DISCIPLINE.md`
- Create: `docs/COASTLINE_SUBMISSION_BUDGET.md`
- Test: documentation examples using observed CI history.

**Interfaces:**
- Consumes: GitHub workflow/run history and existing Coastline automation constraints.
- Produces: a practical daily/rolling budget model.

- [ ] **Step 1: Separate known limits from observed limits**

Track:

- authoritative platform limits when verified;
- observed successful submissions/day;
- observed CI concurrency;
- typical CI duration;
- recent failed-run ratio;
- available review/context capacity.

- [ ] **Step 2: Define budget units**

Use a simple weighted unit model rather than treating every submission equally.

Example starting weights:

- docs-only: 0.25
- test-only: 0.5
- micro code patch: 1
- small patch: 1.5
- medium patch: 2.5
- large patch: 4+
- failed retry without a new hypothesis: additional penalty

These are starting heuristics and must be calibrated against real project behavior rather than treated as permanent limits.

- [ ] **Step 3: Define rolling budget windows**

Track both:

- daily operational budget;
- rolling recent-failure budget.

This prevents exhausting a day's useful verification capacity through repeated speculative retries.

- [ ] **Step 4: Define cooldown/escalation behavior**

When failure rate or CI queue pressure rises, recommend smaller patches and targeted tests before another full submission.

- [ ] **Step 5: Record budget observations in handoff**

Future chats must be able to recover current observed limits without guessing.

---

### Task 3: Build the patch preflight checklist

**Files:**
- Create: `docs/COASTLINE_PATCH_PREFLIGHT.md`
- Test: representative patch examples.

**Interfaces:**
- Consumes: patch classification model and submission budget.
- Produces: a fast go/split/stop decision before code submission.

- [ ] **Step 1: Define preflight questions**

Before submission answer:

1. What single behavior changes?
2. What exact files/systems change?
3. Can it be tested independently?
4. What is the smallest useful patch?
5. What existing tests prove it?
6. What new test is required?
7. What is the highest-risk subsystem touched?
8. How much CI budget will it consume?
9. What could be split out?
10. What evidence would prove the patch failed?

- [ ] **Step 2: Define stop conditions**

Stop and split if the patch contains unrelated fixes, unclear ownership, untestable behavior, or multiple independent rollback paths.

- [ ] **Step 3: Define fast-path conditions**

Allow rapid submission for low-risk micro/small patches with targeted tests and no high-risk subsystem impact.

- [ ] **Step 4: Define full-gate conditions**

Renderer, CTM, persistence, player-control, or performance-critical changes require the relevant targeted gate plus the broader regression gate appropriate to the risk.

---

### Task 4: Add machine-readable patch-budget metadata

**Files:**
- Create: `docs/patch-budget.schema.json` or an equivalent project-local format only if the implementation benefit justifies it.
- Test: validation of valid/invalid examples.

**Interfaces:**
- Consumes: patch preflight model.
- Produces: optional structured data for future automation.

- [ ] **Step 1: Define minimal schema**

Include patch class, risk areas, files/systems touched, expected verification, budget estimate, override reason, and exact SHA after completion.

- [ ] **Step 2: Validate example records**

Expected: incomplete or contradictory metadata is rejected.

- [ ] **Step 3: Keep schema optional until automation proves useful**

Do not introduce a dependency merely to store a checklist.

---

### Task 5: Integrate patch-budget checks into CI only after the policy is proven manually

**Files:**
- Modify: GitHub workflow only after at least several patches have been evaluated manually.
- Test: workflow fixture/validation test.

**Interfaces:**
- Consumes: patch metadata and changed-file information.
- Produces: advisory or blocking patch-budget check.

- [ ] **Step 1: Collect calibration data**

Evaluate a representative sample of recent Coastline patches, including successful and failed runs.

- [ ] **Step 2: Compare predicted vs actual difficulty**

Adjust weights where the model routinely misclassifies patches.

- [ ] **Step 3: Start as advisory**

The first CI implementation should warn, not block, unless the patch is explicitly marked oversized/high-risk.

- [ ] **Step 4: Promote only evidence-backed checks to blocking**

Avoid turning a heuristic into a development bottleneck.

---

### Task 6: Add patch-sizing evidence to durable handoff

**Files:**
- Modify: `docs/COASTLINE_HANDOFF.md`
- Modify: `docs/COASTLINE_CI_RECOVERY_2026-10-21.md` or its successor/current recovery document.

**Interfaces:**
- Consumes: operational budget records and CI results.
- Produces: chat-to-chat recovery of the current patch/submission strategy.

- [ ] **Step 1: Record current observed limits**

Do not invent platform limits; record only verified or observed values.

- [ ] **Step 2: Record calibration lessons**

Document which patch sizes caused reliable failures, which stayed stable, and which risk areas require extra testing.

- [ ] **Step 3: Record current recommendation**

State the preferred patch class for normal development and the conditions for larger changes.

- [ ] **Step 4: Commit documentation**

---

## Initial operating rule

Until enough calibration data exists, prefer **one independently testable behavior per patch**, usually Micro/Small. Use Medium when the pieces are tightly coupled and share one acceptance boundary. Treat Large/Oversized as a decomposition-review event, not as a normal submission size.

The system should optimize for **successful verified progress per submission**, not maximum lines changed per day.
