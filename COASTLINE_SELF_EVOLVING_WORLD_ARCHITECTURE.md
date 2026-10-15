# Coastline: Self-Evolving World Architecture

## Product promise
Coastline should feel maintained and alive without requiring the player or owner to manually trigger every content update. Owners can still direct priorities, accept or reject changes, and override automated decisions. The system should favor stable, incremental evolution over uncontrolled self-modification.

## Three independent loops

### 1. Runtime world loop — every playable frame
Runs locally in the browser while a player has the game open.
- Keep driving, camera, input, and rendering on the highest-priority path.
- Advance traffic, pedestrians, ambience, and active activities at tiered update rates.
- Persist durable world state and player progress locally; recover gracefully when storage is unavailable.
- Generate deterministic, seed-based activities and district data from validated templates.
- Use time-budgeted background work. Pause or reduce optional work when frame-time budgets are exceeded.
- Never depend on an AI API, remote service, or network connection for core driving.

**Limit:** a browser tab cannot keep advancing a world after the tab/device is closed or suspended. Offline time can be simulated deterministically on the next visit; real shared-world time needs a backend.

### 2. Free caretaker loop — scheduled GitHub Actions
Runs on a schedule and on every code change. It is a maintenance system, not an always-on game server.
- Run engine, deterministic system, and headless-browser tests.
- Check module paths, manifest schemas, content bounds, reproducibility, and build outputs.
- Preserve browser traces, screenshots, and logs for failures.
- Open/update one actionable bug report instead of silently hiding regressions.
- Report build/test state and avoid deploying unvalidated changes.
- Run on a best-effort schedule; hosted CI can be delayed, queued, or temporarily unavailable.

### 3. Improvement loop — propose, test, promote, learn
This loop may use an AI coding agent when an authorized model is available. Without a configured model/key, the system must still run deterministic tests and procedural content tools; it must not pretend to be autonomously writing new code.
1. Observe: diagnostics, reproducible failures, performance budgets, content repetition, and missing coverage.
2. Rank: choose a small improvement with a measurable player benefit.
3. Propose: create a scoped patch or data-only content proposal.
4. Validate: lint/syntax, unit tests, seeded world checks, browser smoke/regression tests, and budget checks.
5. Stage: publish to a preview/beta build, never replace the known-good build first.
6. Promote: deploy only if required checks pass and no protected rule is violated.
7. Measure: compare stability, load time, frame-time distribution, errors, and gameplay completion.
8. Roll back: restore the previous known-good version when health checks regress.

## Permission and safety boundaries
- The owner retains control over product direction, irreversible decisions, secrets, spending, public communications, and destructive repository changes.
- Automated changes are small, traceable commits with test evidence and a rollback path.
- AI-generated code is untrusted input. It cannot execute directly in the live world without review and automated validation.
- Generated world content is data, not arbitrary executable JavaScript.
- Keep credentials out of the repository and never expose private user/game telemetry by default.
- No paid model or third-party service is assumed to exist. Any optional paid dependency must be explicitly configured by the owner.

## World simulation tiers
- Tier 0 — player-critical: input, vehicle physics, collision response, camera.
- Tier 1 — near field: nearby traffic, pedestrians, collision-relevant props, current mission.
- Tier 2 — neighborhood: simplified traffic flow, schedules, activity demand, district ambience.
- Tier 3 — distant/offline: deterministic aggregate district state, demand, ownership/reputation/event clocks.
- Unload detailed objects outside the active region; persist only compact state and deterministic seeds.
- On return, advance offline state within a capped elapsed-time window to avoid huge catch-up spikes or runaway rewards.

## Stability objectives
- Prefer frame-time percentiles and long-frame counts over average FPS alone.
- Degrade distant shadows, effects, and nonessential simulation before input responsiveness.
- Time-slice generation; never synchronously build an unbounded city chunk on the render thread.
- Detect non-finite transforms, broken road connectivity, stuck agents, failed modules, storage failures, and WebGL loss.
- Repairs must be bounded, logged, reversible, and unable to silently remove important world content.
- Keep deterministic seeds and regression replays so failures can be reproduced.

## Delivery phases
1. **Stability foundation:** validate the active beta on desktop and mobile; fix loading, controls, collision, and traffic regressions.
2. **Runtime governor:** turn diagnostics into real, measured budgets for AI ticks, distant effects, and chunk generation.
3. **Persistent world state:** versioned local saves, migration, recovery, and bounded offline-time advancement.
4. **Validated world streaming:** deterministic chunk descriptors, adjacency/connectivity checks, staging, and unload/reload.
5. **Scheduled caretaker:** reliable CI tests, failure artifacts, concise health reports, and deployment gates.
6. **AI patch pipeline:** only after model access is configured; isolated work branches, scoped patches, test evidence, preview promotion, and rollback.
7. **Optional shared live world:** only when a backend is intentionally configured for shared state, events, moderation, privacy, and uptime.

## Definition of "self-managing"
A feature is not autonomous merely because it is called AI. It qualifies when it can observe a defined signal, take a bounded action, verify the result, log what happened, and recover safely from failure. The system must expose its current mode and health so the owner can understand and override it.
