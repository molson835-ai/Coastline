# Coastline Submission Budget v1

**Date:** 2026-10-21  
**Status:** Advisory calibration model.

## Goal

Protect useful development capacity by treating CI submissions as a limited operational resource. The objective is **successful verified progress per submission**, not maximum submissions or maximum lines changed.

## Do not invent platform limits

The project must distinguish:

- **Authoritative limits:** documented by GitHub, Vercel, ChatGPT/OpenAI, or another platform source and verified at the time of use.
- **Observed limits:** what Coastline actually experiences, such as successful submissions/day, CI concurrency, queue time, and deployment throttling.

If an authoritative limit is unknown, write **unknown** and use observed behavior conservatively. Never turn an observed pattern into a claimed platform quota.

## Starting weighted units

| Patch type | Starting units |
|---|---:|
| Documentation-only | 0.25 |
| Test-only | 0.5 |
| Micro code | 1.0 |
| Small | 1.5 |
| Medium | 2.5 |
| Large | 4.0+ |
| Failed retry without a new hypothesis | +1.0 penalty |

These are starting heuristics. They are not a daily quota and must be calibrated against actual Coastline history.

## Rolling windows

Track two independent signals:

### Daily operational budget

Estimate the day's useful verification capacity from:

- available CI capacity;
- current queue/concurrency;
- expected test duration;
- recent deployment throttling;
- available review/context capacity;
- observed successful submissions so far today.

Do not require a fixed number of units/day until enough history exists to justify one.

### Recent-failure budget

Track the last several relevant submissions and record:

- patch class;
- exact SHA;
- workflow/run IDs;
- targeted tests;
- whether failure was production, test/setup, timing, environment, or infrastructure;
- whether the retry introduced a new hypothesis.

Repeated failures without new evidence should trigger smaller patches and targeted verification rather than another full submission.

## Cooldown and escalation

Recommend a cooldown when:

- multiple recent runs fail for different reasons;
- CI queue pressure is high;
- a patch is Large/Oversized;
- a retry is being proposed without a new hypothesis;
- a deployment limit has recently blocked a preview.

During cooldown:

1. inspect the exact failing run;
2. reproduce or isolate the smallest failure surface;
3. run the narrowest useful test;
4. submit only after a concrete hypothesis exists;
5. record the result in the handoff.

Escalate to a larger patch only when the evidence shows that the smaller boundary cannot prove correctness.

## Current Coastline observations

Known project constraints that affect submission planning:

- Vercel free deployment throttling has previously blocked unnecessary deployments; avoid treating every code commit as a deployment opportunity.
- GitHub Actions browser suites can be expensive in both time and duplicate execution when push and pull-request events target the same branch. Duplicate-suite reduction is a future CI-efficiency change, not a reason to alter an in-progress verification run.
- Physical-device testing is separate from headless CI and should be reserved for changes where device evidence is actually needed.
- Exact SHA/run evidence is mandatory before a patch is considered verified.

## Submission ledger template

For each material patch, record:

```text
Date/time:
Branch / PR:
Exact SHA:
Patch class:
Budget units:
High-risk areas:
Targeted verification:
Full-gate verification:
Workflow/run IDs:
Result: pass / fail / partial
Failure category, if any:
New hypothesis on retry, if any:
Deployment impact:
Next recommended patch size:
```

## Operating recommendation

Until calibrated, normal Coastline work should favor **Micro/Small** patches. Medium is appropriate for a tightly coupled feature slice with one acceptance boundary. Large/Oversized changes require decomposition review and should be rare.
