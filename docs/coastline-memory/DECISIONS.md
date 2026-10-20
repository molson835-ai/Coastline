# Coastline — Decisions

## 2026-10-20 — Free-first is a hard constraint
**Decision:** Coastline remains a free-build/low-cost project.
**Rationale:** The development workflow must remain productive under free-tier caps.
**Implication:** Prefer free/local/deterministic tools, batch work, avoid redundant CI/deployments, and identify recurring costs before adoption.
**Status:** Binding.

## 2026-10-20 — Visual quality is not the default performance sacrifice
**Decision:** Preserve near-field visual quality.
**Rationale:** The goal is high-end presentation, and the current bottleneck is renderer work rather than a demonstrated need to remove detail.
**Preferred tools:** batching, instancing, HLOD, culling, streaming, screen importance, shared resources, asset optimization.
**Status:** Binding.

## 2026-10-20 — One authoritative runtime owner per critical behavior
**Decision:** Avoid competing vehicle, steering, visibility, garage, sandbox, or quality-control layers.
**Rationale:** Green startup flashes, duplicate visuals, and steering reversals have occurred when multiple systems competed.
**Status:** Binding.

## 2026-10-20 — Authored vehicle is authoritative
**Decision:** White sedan GLB is the normal starter visual; procedural vehicle is fallback-only.
**Rationale:** The debug/procedural green vehicle caused a visible startup flash and undermined the intended visual direction.
**Status:** Binding.

## 2026-10-20 — Sandbox first, systems preserved
**Decision:** Temporarily suppress missions, replayability encounters, landmark rewards/popups, and unnecessary activity UI without deleting their architecture.
**Rationale:** Establish a stable driving/exploration core before reactivating higher-level systems.
**Status:** Binding until intentionally revised.

## 2026-10-20 — Documentation-only project memory
**Decision:** Memory lives under `docs/coastline-memory/` and is not runtime-loaded.
**Rationale:** Provides handoff continuity without runtime cost or dependency lock-in.
**Status:** Binding.

## 2026-10-20 — Research is indexed, not duplicated
**Decision:** Maintain a source index with links, conclusions, applicability, date, and cost/free-tier notes.
**Rationale:** Prevents repeated research and makes handoff efficient while allowing new research when existing sources are insufficient.
**Status:** Binding.
