# Coastline — Changelog

## 2026-10-20
- Created the Coastline persistent project-memory design.
- Added free-first/cap-aware development rules as a hard project constraint.
- Established `docs/coastline-memory/` as documentation-only project memory.
- Added the curated research-source index and AI handoff prompt.
- Preserved the measured performance baseline: 17 FPS, 53.2 ms render, 3,233 draw calls, 2.06M triangles, 15,329 geometries.
- Documented the renderer-first optimization strategy: visibility, batching, instancing, HLOD, screen importance, and streaming before visual reduction.
- Documented the authoritative-player-vehicle architecture and behavior-based fleet testing.
- Documented the bounded/non-mutating beta diagnostics workflow and prior timeout lesson.

## Prior meaningful milestones
- Coastline received cinematic/high-end visual work, authored vehicle integration, stability/control work, and static batching foundations through earlier project branches/PRs.
- Spatial visibility was improved with cell bucketing and minimum cell-distance rejection.
- Vehicle GLB tests were corrected to follow authoritative behavior rather than fixed array positions.
- Mega Patch 2 was defined around sandbox foundation, authored hero vehicle, renderer architecture, and regression protection.

## Maintenance rule
Keep this file concise. Record milestones, not conversation transcripts. Detailed measurements belong in `PERFORMANCE.md`; durable decisions belong in `DECISIONS.md`; source links belong in `RESEARCH-SOURCES.md`.
