# Three-Cave Geometry-First Labyrinth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current stacked-rock side-cave maze with a geometry-first labyrinth whose wall layout is the source of truth for both visible stone and collision.

**Architecture:** Build deterministic tunnel/passage boundaries first. Generate continuous geological wall surfaces from those boundaries, then generate narrow collision traces from the same boundaries. Empty space between those walls remains playable. The existing three CTMs and center-cave destination remain intact.

**Tech Stack:** Existing Three.js runtime, JavaScript modules, existing `coastlineColliders` boundary system and cave CTM system.

**Spec:** User-approved approach A, with two hard requirements: stone must equal barrier/no-stone must equal playable, and each interior must be a large explorable labyrinth of tunnels.

## Global Constraints
- Keep approved `assets/3_evil_rock_mountains_with_cave_stylized.glb` as the only Waterfront mountain/cave formation.
- Do not restore the old single-cave GLB, old exterior cave, old invisible blockers, or cave Use button.
- Keep all three entrance thresholds clear and automatic.
- Keep center cave's Electric Lemonade/rocket-boots destination.
- Side caves target roughly 120 units of exploration with branches/chambers/dead ends.
- Collision must be derived from the exact visible wall boundary layout.
- No unrelated gameplay, vehicle, steering, mission, NPC, lighting, or world changes.
- Keep mobile-browser geometry/object counts bounded and deterministic.

## Review Focus
- Entrance clearance and CTM activation.
- Exact wall/collision footprint parity.
- Connected labyrinth with multiple branches/chambers/dead ends.
- No leaks through outer/rear walls.
- Rebuild/unload persistence without duplicates.
- No per-frame regeneration.

### Task 1: Geometry-first side-cave labyrinth

**Files:** Modify `coastline-three-cave-system.js`.

- [ ] Define deterministic passage graphs/layouts for left and right caves: winding main route, branches, chambers, alcoves, dead ends, enclosed rear, approximately 120 units long.
- [ ] Convert passage boundaries into continuous wall segments with variable width and bends.
- [ ] Replace stacked `DodecahedronGeometry` wall instancing and the old alternating maze walls.
- [ ] Generate irregular continuous geological wall surfaces from the same segments: strata bands, shelves, fractures, recesses and large alcoves.
- [ ] Generate narrow collision traces directly from those same wall segments; no collision for empty passage space.
- [ ] Remove the current open-tunnel-rib approach; labyrinth shape comes from actual wall layout.
- [ ] Keep floor/ceiling/stalactite treatment inside the wall-defined playable envelope unless intentionally part of a wall.
- [ ] Make generation idempotent and remove old named maze geometry/colliders before replacement.
- [ ] Run the remaining relevant static tests; do not restore the removed redundant Electric Lemonade gameplay suite.
- [ ] Commit the focused implementation.

### Task 2: Browser verification

- [ ] Verify left/center/right entrances are clear and automatic CTMs trigger.
- [ ] Walk into representative visible walls from multiple angles and confirm they block at the stone surface.
- [ ] Walk through empty tunnel areas and confirm they remain playable.
- [ ] Check bends, branch mouths, chambers and rear/dead-end walls for leaks or invisible blockers.
- [ ] Confirm both side caves have long winding exploration routes with multiple branches/chambers/dead ends.
- [ ] Confirm center cave and automatic return behavior remain intact.
- [ ] Leave/re-enter worlds and confirm deterministic persistence with no duplicates.
- [ ] Do not recommend merging PR #146 until these checks pass.
