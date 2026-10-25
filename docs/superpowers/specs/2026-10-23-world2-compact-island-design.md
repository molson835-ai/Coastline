# World 2 Compact Island Design

## Intent
Shrink the current World 2 blank shell from an oversized landmass to a compact, roughly 2× city-block playable island so the bridge is easy to find and the world remains inexpensive while CTM traversal is validated.

## Goals
- Use a rounded-square/compact island footprint approximately two normal city blocks in overall playable area.
- Keep the physical City ↔ World 2 bridge and automatic transition behavior unchanged.
- Spawn the player near the World 2 bridge so the route is immediately understandable.
- Put one prominent palm tree just off the side of the road at the World 2 bridge entrance as a visual landmark without blocking vehicle travel.
- Keep World 2 static and lightweight: no new buildings, NPC systems, missions, or extra environmental asset packs.
- Preserve active-vehicle visibility, vehicle control, and World 2 collision isolation.

## Non-goals / Anti-goals
- Do not add detailed scenery yet.
- Do not reduce City visuals to solve this layout issue.
- Do not replace physical bridge traversal with a teleport-only interaction.
- Do not reintroduce landmark discovery or mission behavior.

## Constraints
- Continue using the existing `feat/ctm-world2-live-integration` branch and PR #87.
- Build on the existing `coastline-world-transitions.js` runtime rather than creating a second transition system.
- Keep the island compact enough to be visually and physically navigable on the existing Android test device.

## Approach
Use the existing static blank-shell implementation, replacing its large plane/shore footprint with a compact rounded-square footprint and retaining a short bridge approach road. Place the palm tree as a single low-cost procedural tree group beside the road near the bridge entrance. Update browser diagnostics/tests to assert the compact bounds, spawn proximity, and palm-tree marker while retaining the existing City → World 2 → City acceptance coverage.

## Success Criteria
1. World 2 visibly reads as a small island rather than a large empty world.
2. From the World 2 spawn, the bridge and palm-tree marker are easy to identify.
3. The player can drive around the compact island without immediately losing the bridge.
4. Driving across either physical bridge end still automatically transitions between worlds with the same active vehicle.
5. Targeted CTM tests and the full gameplay browser gate pass before Android retesting.
