# Coastline 2.0 Reference Notes

This document records reusable engineering principles found by cross-referencing mature open-world talks and public browser-game implementations. We do not copy proprietary code or assets.

## Repeated principles

### 1. One world truth, many consumers
Roads, terrain, navigation, traffic, collision and rendering should query the same underlying world representation. This avoids the classic failure where the visual road says one thing while physics or AI assumes another.

### 2. Streaming and spatial partitioning
Large worlds are divided into regions/chunks so navigation and simulation can be loaded and updated locally. Coastline uses deterministic 200 m cells and a spatial hash as a browser-scale equivalent.

### 3. AI simulation LOD
Not every NPC needs the same update rate. Near actors get full behavior; farther actors use cheaper state/proxy simulation. Coastline's initial tiers are 0–80 m, 80–220 m, 220–520 m and beyond 520 m.

### 4. Collision can only remove energy
OpenRoad's public architecture notes emphasize separating position correction from velocity correction and preventing collision responses from manufacturing energy. Coastline's collision profiles follow the same invariant.

### 5. Fixed/shared coordinate conventions
A mature driving stack benefits from one explicit forward/right/up convention. Coastline should document its vehicle convention and make steering, camera, traffic and collision derive from it rather than applying hidden sign flips.

### 6. Rendering is budgeted, not uniformly detailed
Three.js provides LOD and InstancedMesh for exactly the browser-side version of this principle. Repeated trees, props and distant buildings should use shared geometry/instancing and progressively cheaper representations.

### 7. Tests are necessary but insufficient
Open-world projects repeatedly warn that headless tests can pass while the visual result is wrong. Coastline therefore needs both deterministic invariant tests and actual screenshot/playtest review.

## Useful public references

- OpenRoad: browser-first procedural roads, terrain, traffic, damage and explicit regression harnesses.
- Overdrive City: deterministic city generation with separate city, traffic, peds and vehicle modules.
- Decarlo Boyz: explicit separation of world, buildings, props, vehicles, traffic, peds, physics and game systems.
- GDC open-world navigation sessions: streaming navigation, region partitioning and dynamic navigation data.

These references informed architecture only; Coastline remains its own implementation.
