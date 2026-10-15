# Coastline competitive open-world research

This document records design patterns studied from high-end open-world driving/action games and how Coastline will use the underlying principles without copying proprietary code or assets.

## Driving and roads

- **Forza Horizon:** road flow is handcrafted around the driving experience rather than relying on raw procedural road generation. Coastline therefore treats road geometry, lane placement, shoulders, intersections and terrain transitions as one system.
- **Forza Horizon 6:** the latest design emphasizes distinct districts, verticality, shortcuts, exploration and roads that reveal landmarks as the player turns. Coastline's regional layout should prioritize readable silhouettes and meaningful route choices rather than a uniform grid.
- **GTA:** roads are part of a larger city simulation: traffic, pedestrians, missions, landmarks and ambient events all reinforce traversal. Coastline should make driving itself a discovery loop, not merely transportation.

## Living world

- **Red Dead Redemption 2:** schedules, ambient interactions, wildlife behavior, weather and reputation make the world feel authored even when the player is not on a mission. Coastline already uses bounded deterministic simulation, memory, reputation, rumors and role-based NPC agency; the next step is to increase visible consequences while keeping simulation cost bounded.
- **GTA:** pedestrian dialogue and contextual reactions are treated as content rather than background noise. Coastline should prefer small authored-feeling reactions selected from deterministic state over generic repeated chatter.

## Rendering and performance

- High-end open worlds separate simulation, rendering and world data, then reduce work with distance/importance-based LOD and streaming. Coastline's spatial hash, chunk model, simulation LOD and render LOD follow the same general principle.
- Browser constraints make this even more important: visual richness should come from instancing, material variation, procedural detail and selective post-processing instead of brute-force object counts.

## Coastline upgrade doctrine

1. **Make every road fun to drive.** Curvature, sightlines, elevation and intersections should create choices.
2. **Make every region legible.** City, suburbs and countryside need different density, terrain texture, lighting, audio and NPC behavior.
3. **Make background simulation causal.** NPCs should observe, remember, react and sometimes create opportunities without requiring an expensive per-frame AI call.
4. **Spend detail where the player looks.** Use distance-aware simulation and rendering so close objects get premium treatment while distant objects remain convincing.
5. **Preserve determinism.** Bugs become dramatically easier to reproduce when world generation, NPC decisions and routing are seeded.
6. **Prefer systems over decoration.** A road that changes traffic behavior or reveals a new shortcut is more valuable than another static prop.

## Current pass

The research pass upgraded the shared terrain model with multi-scale landforms, restrained micro-detail, regional identity, stable building pads, slope/material hints and road-surface invariants. This is deliberately a foundation for later visual passes rather than a one-off texture trick.
