# Coastline Performance Mega Batch v1 — Design Specification

**Date:** 2026-10-19  
**Status:** Awaiting user review  
**Target:** Android/mobile-first beta performance while preserving near-field visual fidelity  
**Working branch:** `coastline-performance-mega-batch-spec`

## 1. Goal and non-negotiable constraints

The current Android telemetry reports approximately 9 FPS, 218.5 ms average frame time, 399.8 ms p95 frame time, 8,390 draw calls, 1.53 million triangles, 3,783 geometries, 313 reported world entities, and no runtime errors. The draw-call and geometry counts are the strongest initial leads, but the patch must measure before assuming a single cause.

The goal is to reduce CPU submission cost, redundant simulation work, and GPU/render overhead through one coordinated, testable batch while keeping Coastline's high-end visual direction intact.

**Hard visual contract**
- The player vehicle and meaningful near-field scene retain their current or better visible quality: meshes, materials, lighting, environmental richness, and animation are not globally downgraded.
- Do not lower global texture quality, globally reduce resolution, disable effects broadly, or replace authored player-car assets with cheaper models as a performance shortcut.
- Optimize hidden, off-screen, distant, duplicated, or repeated work first. Distance-based simplification is permitted only outside the near-field fidelity envelope and must transition without obvious popping.
- Keep collision representations separate from render batching where needed. Batching must not silently change driving, collision, damage, garage access, or traffic behavior.
- The existing approved core sandbox remains: driving/exploration, traffic, ambient pedestrians/wildlife, one usable garage, exterior buildings, and vehicle collision/damage. Do not restore deferred missions, pedestrian interaction, discovery labels, map UI, or background activity systems.

## 2. Approaches considered

1. **Render-only cleanup:** consolidate static geometry and repeated props. Low gameplay risk, but it would leave avoidable CPU simulation and visibility work.
2. **Broad quality reduction:** reduce resolution, effects, entity counts, and detail. Potentially quick, but conflicts with the user's visual requirements; rejected.
3. **Layered performance mega batch (recommended):** profile first; eliminate inactive/redundant work; add visibility and spatial relevance; batch/instance compatible scene objects; optimize non-player traffic and distant ambience; preserve near-field visuals. This addresses multiple bottlenecks without betting on one unverified cause.

## 3. Proposed architecture and work packages

### A. Baseline and instrumentation
- Establish reproducible telemetry for the same scene/device/build before and after changes.
- Record average and p95 frame time, FPS, draw calls, triangles, geometries, heap, loading time, and runtime errors.
- Add category-level timings/counters where practical: render submission, traffic, pedestrian updates, collision, animation, audio, world streaming, and other scheduled work.
- Distinguish main-thread CPU time from renderer/GPU pressure as far as browser diagnostics permit. Report uncertainty rather than infer a GPU bottleneck from draw calls alone.
- Keep diagnostic instrumentation low-overhead and removable/disableable for normal play.

### B. Inactive-system and frame-loop cleanup
- Retain the already-approved sandbox behavior that removes/deactivates deferred missions, ordinary interiors, pedestrian interaction/AI, discovery/activity notifications, map rendering, and related background work.
- Confirm the production game source and sandbox/cache path do not accidentally run the same expensive systems through a second code path.
- Preserve the renderer resize/reconfiguration guard so stable settings do not recreate render targets on a timer.
- Avoid repeated full-scene traversals, allocations, or material/geometry setup inside per-frame loops.

### C. Visibility and spatial relevance
- Integrate the Fidelity Core world-cell/spatial primitives into the active scene where they are compatible with current runtime behavior.
- Frustum-cull non-visible objects; use distance/relevance tiers and cell activation for far-world work.
- Add occlusion only where it is practical and reliable; do not make complex occlusion a blocker for simpler measurable wins.
- Keep collision and gameplay query behavior correct even when render objects are hidden or streamed.
- Use hysteresis and deterministic thresholds to avoid rapid tier switching and visual popping.

### D. Static environment and repeated props
- Batch/merge compatible static building exterior, road, sidewalk, curb, road-marking, and street-furniture render geometry when it reduces submissions.
- Share equivalent materials and freeze static transforms/material state where safe.
- Use GPU instancing for repeated trees, shrubs, grass, dirt patches, rocks, lamps, benches, and compatible props.
- Preserve meaningful material variation, shadows, silhouettes, lighting response, and near-field density. Split batches by material/render state and spatial cell instead of creating one enormous world-wide batch.
- Keep interaction and collision colliders independent from visual mesh merges.

### E. Vehicle rendering
- Preserve the authored high-quality player sedan as the hero vehicle and maintain its material/lighting appearance.
- Profile mesh/material submission from authored GLBs; where safe, consolidate compatible non-animated submeshes or reduce redundant material groups without altering visible shape/material.
- Avoid repeated full hierarchy traversals or per-frame work on static vehicle components.
- Use shared resources and a distinct optimized representation for non-player traffic only outside the near-field fidelity envelope. Keep nearby traffic visually rich and avoid a large mesh-count vehicle multiplied across all active cars.
- Keep wheel animation, steering, lights, collisions, and vehicle controls functional.

### F. Traffic and ambient pedestrians
- Use the existing spatial broadphase for nearby-vehicle queries and verify it preserves current collision/threat thresholds.
- Separate visual update cadence from simulation cadence where appropriate. Nearby relevant entities remain responsive; medium/far entities update less frequently or become dormant when safe.
- Share compatible pedestrian geometry/materials and use instancing or simplified representations only when animation and appearance remain correct.
- Keep pedestrians ambient scenery only under the approved sandbox; do not reintroduce interaction or mission logic.
- Keep traffic behavior and player-visible motion stable; do not simply slash active entity counts as the primary fix.

### G. Fidelity Core and release path integration
- Reuse the adaptive render configuration, CPU/GPU budgets, scheduler, cell streaming, LOD primitives, instancing helpers, and render-statistics fixes already present in the open Fidelity Core work where they pass compatibility checks.
- Reconcile overlap with cache/render hardening work rather than duplicating competing implementations.
- Do not merge or promote existing PRs automatically. Integrate changes on an isolated feature branch and keep the existing playable build recoverable.
- If Vercel deployment quotas block preview deployment, report the limitation and continue with source-level/unit/build validation; do not claim live verification.

## 4. Near-field fidelity tiers

Use semantic relevance and measured screen-space impact rather than arbitrary distances alone:
- **Tier 0 — player/interaction envelope:** player vehicle, immediate road surface, collision-critical nearby objects, garage and nearby scene. No visible detail reduction.
- **Tier 1 — near visible scene:** preserve current meshes/materials and meaningful lighting; optimize duplicate submissions, visibility, static state, and shared resources.
- **Tier 2 — mid-range:** allow subtle LOD, batching, and lower update frequency when visually stable and validated.
- **Tier 3 — far/off-screen:** aggressively cull, stream, simplify, or suspend rendering/simulation when not relevant.
- Use distance, camera visibility, object class, gameplay relevance, and screen-space contribution together. Tune thresholds with repeatable device captures; do not hard-code unvalidated distances as final policy.

## 5. Test and acceptance gates

Every work package must have focused automated coverage before implementation (test-first where feasible), then integration validation.

Required gates:
1. Existing fidelity-core, vehicle asset, cache/render, and sandbox regression tests pass.
2. New tests cover tier boundaries/hysteresis, cell activation/visibility, batching/instancing resource ownership, collision independence, and preserved sandbox exclusions as applicable.
3. Same-scene before/after comparison on a representative Android device reports frame-time percentiles, draw calls, triangles, geometries, heap, loading time, and errors.
4. Draw calls and p95 frame time improve materially; the target is a large draw-call reduction from the reported 8,390, but no fixed percentage is claimed before profiling establishes feasible limits.
5. No new startup/runtime errors, black screens, vehicle steering/handling regressions, collision regressions, visual popping, missing near-field detail, or re-enabled deferred systems.
6. Inspect the player vehicle and nearby environment at close range before accepting any render simplification.
7. Preview deployment and hands-on beta testing are required for live claims. If deployment is blocked by platform quota, clearly mark browser/device validation pending.

## 6. Rollout and safety

- Implement in a single coordinated feature branch, organized as independently testable commits/work packages.
- Keep optimization flags or clean rollback points around higher-risk merging/LOD/instancing work where practical.
- Run static/unit checks after each package and a full regression suite at the end.
- Do not merge to main or promote a beta alias without reviewing the resulting diff and confirming required tests. Deployment success alone is not proof of runtime performance.
- Deliver a concise before/after report and a verified beta link only when the exact deployment URL and build are confirmed.

## 7. Explicit exclusions

This batch does not add new missions, NPC personalities, activities, map/minimap/waypoints, building interiors beyond the one garage, or new gameplay systems. It does not pursue a visual downgrade as the optimization strategy and does not copy proprietary game code or assets.

## 8. Open implementation questions to resolve during planning

- Which current Fidelity Core primitives are already integrated into the active runtime versus only defined/tested as helpers?
- Which scene categories account for the largest share of the 8,390 draw calls?
- Which static meshes can be merged without material, shadow, collision, or streaming regressions?
- What baseline browser/device tooling is available for consistent CPU/GPU profiling on the user's Android device?
