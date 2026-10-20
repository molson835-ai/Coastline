# Coastline — START HERE

**Canonical AI/human handoff document.** Read this first.

## What Coastline is
Coastline is a family-friendly, open-world coastal American driving/exploration game prototype. No weapons. The long-term target is a polished, realistic world with sleek upgradeable vehicles, detailed characters, traffic, wildlife, exploration, secrets, meaningful NPC stories/quests, and high-end rendering principles inspired by games such as GTA, RDR, Forza, Cyberpunk, and Watch Dogs.

Current platform: browser/Android prototype. Phone viability is a hard constraint. Eventual TV play and DualShock 4 support are desired.

## Current priority
**Mega Patch 2:** establish a clean sandbox foundation, make the authored white sedan authoritative, fix control/garage behavior, and build a render architecture that recovers performance without reducing near-field visual quality.

The latest representative mobile telemetry available to this memory snapshot was **17 FPS**, **61.78 ms average frame**, **53.2 ms render**, **3,233 draw calls**, **2.06M triangles**, **15,329 geometries**, **75 textures**, with **48 buildings / 81 vehicles / 110 pedestrians / 74 trees**. No runtime errors were reported in that telemetry. Treat these numbers as dated baseline evidence, not eternal truth.

Target: first **25+ FPS**, then **30+ FPS** on representative Android hardware **without blanket visual reduction**.

## Non-negotiable operating rules
- Free-build / low-cost project.
- Prefer free, local, deterministic, already-connected tools.
- No surprise subscriptions, paid APIs, hosted GPUs, or recurring infrastructure costs.
- Batch related work; avoid redundant CI, browser sessions, API calls, and deployments.
- Measure before changing performance architecture.
- Do not solve lag by degrading the player's immediate environment. Prioritize batching, instancing, HLOD, culling, streaming, screen importance, asset efficiency, and visibility management.
- Keep phone viability while pursuing high-end visual ambition.
- Memory files are documentation only and must never enter runtime code or shipped assets.

## One-authoritative-source rule
Critical behavior must have one owner: one player vehicle visual, one steering command, one render-quality controller, one world visibility controller, one garage interaction path, and one sandbox-mode authority. Green flashes, steering reversals, duplicate vehicles, and conflicting UI are usually signs of competing layers.

## AI takeover procedure
1. Read this file.
2. Read the relevant linked files below; do not load the whole folder blindly if the task is narrow.
3. Inspect the actual repository, current branch, commit, tests, and deployment state before assuming anything is current.
4. Treat documented decisions and constraints as binding unless the user explicitly changes them.
5. Check `RESEARCH-SOURCES.md` before repeating research. Search for new authoritative sources when existing material is insufficient.
6. Prefer measured evidence and one coherent implementation/test batch over speculative churn.
7. Preserve visual quality, especially near the player.
8. Update this memory when durable project knowledge changes.

## Read next
- [AI handoff prompt](./AI-HANDOFF-PROMPT.md)
- [Current state](./CURRENT-STATE.md)
- [Architecture](./ARCHITECTURE.md)
- [Goals and roadmap](./GOALS-AND-ROADMAP.md)
- [Decisions](./DECISIONS.md)
- [Constraints and limitations](./CONSTRAINTS-AND-LIMITATIONS.md)
- [Performance](./PERFORMANCE.md)
- [Visual direction](./VISUAL-DIRECTION.md)
- [Gameplay systems](./GAMEPLAY-SYSTEMS.md)
- [Testing and CI](./TESTING-AND-CI.md)
- [Deployment](./DEPLOYMENT.md)
- [Known issues](./KNOWN-ISSUES.md)
- [Research](./RESEARCH.md)
- [Research source index](./RESEARCH-SOURCES.md)
- [Changelog](./CHANGELOG.md)

## Do not repeat these mistakes
- Do not reintroduce procedural/debug starter visuals when an authored vehicle asset is available.
- Do not invert left/right steering.
- Do not keep multiple runtime systems authoritative over the same behavior.
- Do not use a global visual downgrade to hide a renderer bottleneck.
- Do not repeatedly deploy when local/CI verification can answer the question.
- Do not recreate research already captured in the research index.
- Do not turn this memory into a chat transcript.

## Maintenance rule
When a decision, constraint, performance baseline, architecture boundary, research conclusion, important bug, deployment convention, or durable roadmap priority changes, update the appropriate memory file in the same coherent work batch. Keep historical evidence in the changelog rather than overwriting useful history.
