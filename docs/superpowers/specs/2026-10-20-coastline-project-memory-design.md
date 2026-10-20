# Coastline Project Memory System — Design Specification

**Date:** 2026-10-20  
**Status:** Approved for specification; implementation pending written-spec review.

## Goal
Create a persistent, lightweight project-memory system inside the Coastline GitHub repository so a new chat, developer, or AI agent can understand the project's current state, goals, architecture, constraints, decisions, research, known issues, and active priorities without relearning the project from conversation history.

## Design Principles

1. **Documentation-only:** memory files live under `docs/` and are never imported by the game runtime or shipped as game assets.
2. **Git is the source of truth:** the memory travels with the repository and its history rather than depending on ChatGPT conversation history.
3. **Handoff-first:** one `START-HERE.md` file is the canonical entry point for any new human or AI contributor.
4. **Decision-oriented:** record durable decisions, constraints, findings, and current state rather than copying conversation transcripts.
5. **Continuously maintained:** important decisions, architecture changes, discoveries, limitations, performance measurements, and roadmap changes should be added as Coastline evolves.
6. **No runtime cost:** documentation must not add browser requests, bundle size, renderer work, memory usage, or game startup work.
7. **No stale authority:** current status must identify dates/commits/branches where relevant so historical notes cannot silently masquerade as current facts.
8. **Preserve user priorities:** visual quality is not to be reduced as the default solution to performance problems; prioritize architectural optimization such as batching, HLOD, culling, streaming, instancing, and visibility control.

## Canonical Folder

```text
docs/coastline-memory/
├── START-HERE.md
├── CURRENT-STATE.md
├── ARCHITECTURE.md
├── GOALS-AND-ROADMAP.md
├── DECISIONS.md
├── CONSTRAINTS-AND-LIMITATIONS.md
├── PERFORMANCE.md
├── VISUAL-DIRECTION.md
├── GAMEPLAY-SYSTEMS.md
├── TESTING-AND-CI.md
├── DEPLOYMENT.md
├── KNOWN-ISSUES.md
├── RESEARCH.md
└── CHANGELOG.md
```

## File Responsibilities

### `START-HERE.md`
The single AI/human handoff page. It should be short enough to read first and authoritative enough to orient a new contributor. It links to the other memory files and includes explicit instructions to read the memory before changing Coastline and to update the memory when durable project knowledge changes.

It should include:
- project identity and vision
- current development status
- current active branch/PR/commit when known
- current priority
- non-negotiable constraints
- major architectural principles
- known critical issues
- links to deeper memory files
- instructions for future AI agents
- a compact "do not repeat these mistakes" section

### `CURRENT-STATE.md`
A dated snapshot of what is true now: active work, current branch/commit, current beta/deployment status, latest representative telemetry, current tests/CI state, and immediate next actions. Historical state belongs in `CHANGELOG.md` unless it remains a useful active constraint.

### `ARCHITECTURE.md`
The current technical architecture and authoritative ownership model. It should document the "one authoritative source" principle and the major runtime systems, module relationships, renderer architecture, world streaming, vehicle visual architecture, and important boundaries.

### `GOALS-AND-ROADMAP.md`
Long-term product vision plus ordered development priorities. Separate committed priorities from exploratory ideas. The performance/visual roadmap should preserve the near-field visual-quality contract.

### `DECISIONS.md`
Durable architecture and product decisions. Each entry should contain date, decision, rationale, alternatives rejected when useful, and status. Examples include keeping authored vehicles authoritative, avoiding visual downgrades as the primary performance fix, and preserving dormant mission/replayability architecture during sandbox work.

### `CONSTRAINTS-AND-LIMITATIONS.md`
Hard constraints, platform limitations, budget/usage constraints, known tooling limitations, compatibility requirements, and explicit things future agents must not do without reconsideration.

### `PERFORMANCE.md`
Performance baselines, telemetry, bottlenecks, optimization experiments, measured outcomes, render architecture targets, and the current optimization queue. Include the distinction between CPU and render/GPU bottlenecks and retain evidence for why a technique is being pursued.

### `VISUAL-DIRECTION.md`
The visual-quality contract, target references/principles, authored vehicle/material expectations, lighting goals, environment/vegetation/character goals, and explicit visual regressions to avoid.

### `GAMEPLAY-SYSTEMS.md`
Gameplay systems and their current state, including vehicle controls, garage behavior, sandbox mode, collision expectations, character movement/animation, missions/replayability architecture, notifications, audio, and interaction rules.

### `TESTING-AND-CI.md`
Test suites, CI workflows, what each gate proves, known workflow failure modes, diagnostic-only workflows, and rules for interpreting failures. Include important test architecture decisions such as behavioral rather than hard-coded fleet tests.

### `DEPLOYMENT.md`
Vercel/Cloudflare/GitHub deployment information, beta URLs when current, deployment conventions, and safeguards against unnecessary or premature deployments.

### `KNOWN-ISSUES.md`
Current unresolved bugs/regressions with severity, reproduction context, affected systems, suspected/confirmed cause, and status. Resolved issues should move into `CHANGELOG.md` or `DECISIONS.md` when their lessons remain useful.

### `RESEARCH.md`
Useful external research and transferable architectural principles from high-end games and rendering technologies. Record conclusions and applicability to Coastline, not large copied source material.

### `CHANGELOG.md`
A concise chronological record of meaningful project milestones, major fixes, architectural changes, benchmark results, beta observations, and decisions. It is not a transcript.

## Maintenance Protocol

Future contributors should update memory when any of the following happens:
- a durable architectural decision is made
- a hard constraint changes
- a major bug is discovered or resolved
- performance measurements materially change
- a new system becomes authoritative
- a roadmap priority changes
- a deployment architecture changes
- a research finding changes an implementation decision
- a beta test reveals a new important behavior

Routine edits that do not change project knowledge do not require a memory update.

## Freshness Rules

Every current-state claim that can become stale should carry a date or commit/PR reference where practical. Historical observations should not be presented as current telemetry. When a new authoritative value supersedes an old one, update the current file and preserve the old measurement in the changelog/performance history as appropriate.

## AI Handoff Contract

A future AI taking over Coastline should:

1. Read `docs/coastline-memory/START-HERE.md` first.
2. Read the linked current-state, architecture, constraints, performance, testing/CI, known-issues, and roadmap documents relevant to the requested work.
3. Inspect the actual repository and current Git state before making assumptions.
4. Treat documented decisions and constraints as binding unless the user explicitly changes them.
5. Do not blindly resurrect historical approaches that were rejected or isolated; understand why they were rejected first.
6. Prefer measured evidence over guesses when diagnosing performance or regressions.
7. Preserve visual quality, especially near the player, while optimizing rendering architecture.
8. Update the memory folder when new durable project knowledge is created.
9. Never treat memory documentation as runtime configuration unless a future design explicitly creates a separate generated/configuration interface.

## Scope Exclusions

This system does not include:
- runtime memory or save-game data
- player-facing documentation
- secrets, credentials, API keys, or personal/private information
- automated injection of documentation into the game's JavaScript
- full chat transcripts
- automatic generation of every minor development event

## Success Criteria

The system is successful when a technically capable new AI can open `START-HERE.md`, follow its links, inspect the current repository state, and understand the active Coastline development direction, major constraints, current architecture, known problems, and immediate next steps without requiring the original conversation history.
