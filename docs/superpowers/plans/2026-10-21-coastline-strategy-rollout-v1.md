# Coastline Strategy Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the approved Coastline Strategic Direction into durable execution gates without destabilizing World 1.

**Architecture:** Treat the strategic direction as the product-level source of truth, then split implementation into independently testable workstreams: World 1 stability, CTM, character/NPC foundation, visual language, World 2, adventure/discovery, living world, properties, broader world systems, and constrained AI augmentation. Each workstream must have its own spec/plan and acceptance gate before implementation.

**Tech Stack:** Existing Coastline Three.js beta, JavaScript/ES modules, GitHub Actions, Playwright/Chromium smoke coverage, PostHog telemetry where already established, CTM modules, and existing Vercel/itch packaging.

**Spec:** `docs/superpowers/specs/2026-10-21-coastline-strategic-direction-v1.md`

## Global Constraints

- Preserve visual quality; do not use blanket visual downgrades to solve performance problems.
- Root playable beta remains Three.js; do not introduce Babylon APIs into `game-v3.html`.
- CTM owns world transition lifecycle, not gameplay logic.
- Deterministic game systems own game truth; runtime AI must not own money, progression, save state, mission completion, physics, collision, or world transitions.
- Color is never the sole required accessibility signal.
- New worlds remain bounded and independently budgeted for memory, loading, performance, and testing.
- Do not expand scope merely to increase feature count.
- Exact SHA/run/test evidence is required before declaring work complete.
- Important decisions, failures, rejected approaches, and durable recovery information must be recorded in handoff documentation.

## Review Focus

1. **Cross-workstream dependency drift** — a later feature must not silently assume CTM, character, or persistence interfaces that have not been accepted. Test: each plan references an accepted predecessor contract rather than an informal branch state.
2. **World 1 regression** — future work must not degrade the playable beta. Test: required World 1 smoke/fidelity/performance gates remain part of every affected PR.
3. **Visual-quality regression** — optimization must preserve the intended close-range presentation. Test: visual regression evidence accompanies changes affecting rendering, assets, LOD, lighting, or character representation.
4. **Accessibility regression** — NPC semantic color must remain understandable without color alone. Test: each semantic NPC state has at least one non-color cue.
5. **Scope creep / oversized patches** — a patch that crosses unrelated systems should be split before implementation. Test: patch-budget gate rejects or requires explicit review for over-limit changes.

---

### Task 1: Establish roadmap gate contract

**Files:**
- Create: `docs/superpowers/specs/` — one subsystem spec per future architectural workstream before implementation.
- Modify: `docs/COASTLINE_HANDOFF.md` — record the approved strategic direction and rollout order.
- Test: Documentation review checklist / handoff verification.

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-10-21-coastline-strategic-direction-v1.md`
- Produces: explicit dependency order and rule that each architectural workstream receives its own spec and implementation plan before code.

- [ ] **Step 1: Record the strategy as the roadmap source of truth**

Update the durable handoff so a future chat can recover the approved hybrid identity, layered persistence, expandable worlds, visual language, AI boundaries, and priority stack.

- [ ] **Step 2: Verify dependency ordering**

Confirm the handoff states: World 1 stability → CTM → character foundation → visual language → World 2 → adventure/discovery → living world → homes/properties → broader systems → AI augmentation.

- [ ] **Step 3: Review documentation for contradictions**

Expected: no document says future features are already implemented or playable when they are not.

- [ ] **Step 4: Commit**

Commit only documentation changes for this task.

---

### Task 2: Finish World 1 stability gate before expanding gameplay scope

**Files:**
- Modify: existing CI/test files only where an identified failure requires it.
- Test: existing gameplay watchdog, engine, vehicle, fidelity, loader, and browser smoke suites.

**Interfaces:**
- Consumes: current World 1 beta and current CI/shard contracts.
- Produces: repeatable evidence that the beta is stable enough to accept the next architectural workstream.

- [ ] **Step 1: Capture exact failing SHA/run/test evidence**

Record the latest gameplay watchdog run and every failing shard/test before making a corrective change.

- [ ] **Step 2: Diagnose each failure independently**

Separate production defects from test/setup/timing/environment defects. Do not weaken a test merely to obtain a green run.

- [ ] **Step 3: Apply the smallest corrective change**

Change only the identified failure point and keep unrelated future systems out of the patch.

- [ ] **Step 4: Re-run the targeted test**

Expected: the previously failing test passes without reducing assertion strength.

- [ ] **Step 5: Run the complete required gate**

Expected: all required World 1 CI jobs for the target SHA pass.

- [ ] **Step 6: Commit and document evidence**

Record SHA, workflow/run IDs, test results, remaining limitations, and whether the beta is actually promoted/playable.

---

### Task 3: Verify and integrate CTM under a bounded gate

**Files:**
- Existing: `src/transition/*`
- Existing: `tests/transition-runtime-smoke.spec.cjs`
- Existing: `tests/fixtures/ctm-runtime-smoke.html`
- Modify: `game-v3.html` only when the accepted CTM integration plan explicitly requires it.
- Test: CTM synthetic/Chromium acceptance plus affected World 1 smoke tests.

**Interfaces:**
- Consumes: current CTM modules and accepted CTM spec/plan.
- Produces: a verified transition lifecycle contract that future worlds can consume.

- [ ] **Step 1: Verify CTM branch/PR state and exact SHA**

Do not assume draft PR #77 is merged or current. Record the actual ref and SHA used for verification.

- [ ] **Step 2: Run CTM acceptance tests without gameplay integration**

Expected: loader staging/activation/retirement, player-state handoff, telemetry bounds, failure recovery, and browser smoke behavior pass.

- [ ] **Step 3: Review integration boundary**

Confirm CTM owns lifecycle only and does not absorb gameplay logic.

- [ ] **Step 4: Integrate only the minimum guarded path**

Use a small patch that can be independently reverted.

- [ ] **Step 5: Re-run CTM and World 1 gates**

Expected: CTM passes and World 1 shows no regression.

- [ ] **Step 6: Commit with exact verification evidence**

---

### Task 4: Create character/NPC foundation spec and benchmark spike

**Files:**
- Create: dedicated character foundation spec and plan.
- Test: benchmark fixture for one GLB player and one GLB NPC.

**Interfaces:**
- Consumes: CTM world lifecycle contract and current procedural character implementation.
- Produces: measured decision on GLB character rendering, animation, and NPC simulation tiers.

- [ ] **Step 1: Specify player/NPC responsibilities**

Gameplay code owns movement, state, interaction, collision, and AI state; GLB assets own visual rig/animation data.

- [ ] **Step 2: Prototype one player and one NPC**

Measure Android frame time, memory, draw calls, animation cost, and loading impact.

- [ ] **Step 3: Compare against current baseline**

Expected: a data-backed migration decision rather than a blanket population conversion.

- [ ] **Step 4: Record go/no-go criteria**

The benchmark becomes the gate for expanding GLB use to the wider NPC population.

---

### Task 5: Create visual-language subsystem spec

**Files:**
- Create: visual-language spec and implementation plan.
- Test: semantic-state/accessibility test matrix.

**Interfaces:**
- Consumes: character foundation contract.
- Produces: semantic NPC appearance states with redundant cues.

- [ ] **Step 1: Define semantic states**

Document candidate color families, non-color cues, state transitions, and where each signal is visible.

- [ ] **Step 2: Define asset reuse rules**

Prefer base character + clothing/material/accessory/state combinations over unique special-NPC models.

- [ ] **Step 3: Define accessibility acceptance tests**

Every meaningful color-coded state must remain identifiable through at least one non-color cue.

- [ ] **Step 4: Define the dirty-to-clean discovery example as a bounded test case**

This proves the system can support gameplay without hard-coding the mechanic into the generic NPC renderer.

---

### Task 6: Build World 2 only after CTM and character gates are accepted

**Files:**
- Create: World 2 manifest/factory/assets and tests according to its own spec/plan.
- Modify: CTM integration only through defined interfaces.
- Test: transition, memory, load/unload, spawn, and World 2 gameplay smoke tests.

**Interfaces:**
- Consumes: CTM, player-state, character, and visual-language contracts.
- Produces: first real segmented world demonstration.

- [ ] **Step 1: Define World 2 boundary and budget**

Island/estate should be independently unloadable and bounded.

- [ ] **Step 2: Define bridge/tunnel transition**

The physical transition should feed CTM rather than implement its own loader.

- [ ] **Step 3: Define mansion/World 3 transition contract**

Garage/front-door transition remains a future destination contract until its interior world is built.

- [ ] **Step 4: Test load/unload and player-state continuity**

Expected: no duplicated world roots, stale assets, lost state, or incorrect spawn.

- [ ] **Step 5: Run performance budget gate**

Expected: World 2 meets its measured memory/frame-time/loading budgets without blanket visual downgrades.

---

### Task 7: Add adventure/discovery and living-world workstreams as separate plans

**Files:**
- Create: discovery subsystem spec/plan.
- Create: NPC/living-world subsystem spec/plan.
- Test: each subsystem independently before cross-system integration.

**Interfaces:**
- Consumes: visual-language, character, world, persistence contracts.
- Produces: authored discoveries, encounters, NPC schedules/personality, and layered memory.

- [ ] **Step 1: Define discovery data model**

Discoveries must be authored and deterministic, with optional non-quest outcomes.

- [ ] **Step 2: Define NPC simulation tiers**

Near/nearby/far behavior must have explicit update and fidelity budgets.

- [ ] **Step 3: Define persistence boundaries**

Only state with player-visible payoff should persist initially.

- [ ] **Step 4: Create isolated tests**

Expected: discovery selection, NPC schedule state, and persistence serialization each work without requiring the entire city to be simulated.

---

### Task 8: Add homes/properties and broader world systems only after world lifecycle is proven

**Files:**
- Create: home/property subsystem spec/plan.
- Create: weather/time/economy subsystem specs/plans as needed.
- Test: each system independently plus CTM transition tests.

**Interfaces:**
- Consumes: world, persistence, CTM, vehicle, and visual-language contracts.
- Produces: persistent physical progression and reusable world-state systems.

- [ ] **Step 1: Implement the Rooftop Studio Apartment from its existing approved design only after prerequisites are green**

- [ ] **Step 2: Define property persistence**

Expected: achievements/discoveries/customization can be represented without keeping an entire prior world active.

- [ ] **Step 3: Define weather/time systems as reusable world-state inputs**

Avoid coupling weather or time-of-day logic to a single world.

- [ ] **Step 4: Verify bounded-world performance**

---

### Task 9: Introduce constrained AI augmentation last

**Files:**
- Create: AI augmentation spec/plan only after deterministic systems are mature.
- Test: offline deterministic fallback tests and content validation.

**Interfaces:**
- Consumes: authored NPC facts, event library, world context, and persistence state.
- Produces: bounded dialogue/content assistance or optional event selection.

- [ ] **Step 1: Define AI boundaries**

AI cannot mutate core game truth.

- [ ] **Step 2: Define deterministic fallback**

Ordinary gameplay must remain functional if AI is unavailable.

- [ ] **Step 3: Prototype one constrained use case**

Prefer development-time content assistance or constrained ambient dialogue before a runtime director.

- [ ] **Step 4: Measure latency, cost, privacy, and reliability**

Expected: evidence determines whether runtime AI is worthwhile.

---

### Task 10: Final strategy review gate

**Files:**
- Modify: `docs/COASTLINE_HANDOFF.md` and strategy docs as needed.
- Test: documentation consistency review plus final required CI evidence.

- [ ] **Step 1: Compare implementation state against the strategic spec**

List implemented, in-progress, deferred, and rejected items.

- [ ] **Step 2: Record lessons from each workstream**

Include performance findings, failed approaches, and revised limits.

- [ ] **Step 3: Update next-priority recommendation**

Use actual evidence rather than the original calendar/order if the project has learned something material.

- [ ] **Step 4: Commit durable handoff update**

---

## Patch-right-sizing policy

The strategy rollout is governed by the separate patch-budget plan `docs/superpowers/plans/2026-10-21-coastline-patch-budget-v1.md`. No implementation task should be allowed to grow merely because the original idea was larger than the smallest independently testable change.
