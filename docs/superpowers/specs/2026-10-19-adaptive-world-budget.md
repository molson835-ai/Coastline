# Coastline Adaptive World Budget

## Goal
Reduce GPU and CPU workload across Coastline's world rendering and simulation while preserving or improving all close-proximity visuals, gameplay functionality, collisions, and the existing fidelity baseline.

## Scope
This is a coordinated world-performance architecture covering buildings, vegetation, traffic, pedestrians/NPCs, infrastructure, ground clutter, lighting/shadows, water/atmosphere, and visibility/occlusion. It is additive to the existing fidelity-core renderer and must not replace visual quality with global resolution, texture, shadow, or density downgrades.

## Core rules
1. Close-proximity content remains at the highest existing visual/functional quality.
2. Gameplay-relevant content remains fully functional regardless of distance optimization where the player can interact with it.
3. Distance optimization changes representation/update frequency rather than deleting the authored world.
4. Repeated assets should prefer shared geometry/materials and instancing where compatible.
5. Hidden or occluded content should not consume render work when it cannot contribute to the current view.
6. Expensive simulation, animation, physics, reflection, and shadow work should be activated according to proximity and relevance.
7. The designated player garage is the only fully enterable/upgrade interior in this phase; ordinary buildings retain convincing exterior presentation without unnecessary interior workloads.
8. The centralized Coastline render configuration remains the single authority for renderer-wide quality settings. Feature modules must not independently lower pixel ratio or other global fidelity settings.
9. Progressive steering, collision behavior, audio startup, mission UI behavior, and other established gameplay regressions must remain protected by tests.
10. Cloudflare Workers are out of scope for this change. No Cloudflare deployment or promotion is permitted as part of implementation.

## Adaptive world tiers
The system should expose a shared, deterministic relevance decision that can be consumed by world subsystems. Exact distance thresholds should be selected from measured scene behavior rather than guessed globally, but the tiers are conceptually:

- **Hero:** immediate player vicinity or active interaction. Full geometry, materials, animation, collision, lighting, and gameplay systems.
- **Near:** visible and relevant nearby content. High visual fidelity, with reusable assets and reduced unnecessary simulation/update work.
- **Mid:** visible but not immediately relevant. Preserve silhouette and recognizable appearance while reducing geometry complexity, update frequency, animation detail, and expensive effects.
- **Far:** distant visible world. Preserve composition/silhouette using inexpensive representations and minimal simulation.
- **Hidden:** outside the camera/occluded and not required for gameplay. Skip rendering and unnecessary updates.

The system must account for gameplay relevance so an interactable or active quest object is not degraded solely because it is beyond a visual distance threshold.

## Subsystem requirements

### Buildings
- Preserve detailed exterior appearance near the player.
- Make only the designated garage fully enterable/interactive for this phase.
- Ordinary buildings must not maintain unnecessary interior geometry, interior simulation, or interaction state.
- Reuse repeated building geometry/materials where compatible.
- Apply distance/visibility rules to hidden or distant props while preserving building silhouette.
- Preserve collision volumes needed by driving and exploration.

### Vegetation
- Instance repeated grass, weeds, bushes, and compatible trees.
- Keep close vegetation at the existing high-detail presentation.
- Reduce distant vegetation representation/update cost without visibly thinning the nearby scene.
- Avoid per-frame work for static vegetation.

### Traffic
- Preserve full nearby vehicle presentation and behavior.
- Reuse vehicle geometry/material resources where possible.
- Reduce distant physics/animation/reflection/update frequency while maintaining believable traffic motion.
- Maintain collision and gameplay relevance for nearby traffic.

### Pedestrians/NPCs
- Preserve full nearby rigs, animation, and behavior.
- Reduce simulation/animation frequency for distant NPCs.
- Keep distant population visually represented where it contributes to the scene.
- Never deactivate an NPC needed for an active gameplay interaction solely due to distance.

### Infrastructure
- Instance repeated signs, lights, poles, barriers, curbs, and similar assets where safe.
- Preserve close visual detail and required collisions.
- Avoid redundant per-object update work for static infrastructure.

### Ground clutter
- Preserve close rocks, dirt patches, weeds, debris, and landscape detail.
- Cull or simplify only distant/insignificant clutter.
- Keep the intended landscape composition and silhouette intact.

### Lighting and shadows
- Preserve expensive lighting/shadow treatment for nearby important objects.
- Avoid unnecessary shadow/light updates for distant or inactive objects.
- Do not introduce a global shadow disable or equivalent fidelity regression.

### Water and atmosphere
- Preserve close water appearance and environmental atmosphere.
- Reduce simulation/update frequency where distance makes it imperceptible.
- Maintain visibility and dusk/sunset readability improvements already established.

### Visibility and occlusion
- Add reusable visibility/relevance decisions so content that cannot contribute to the current view does not render or update unnecessarily.
- Do not remove gameplay-required objects merely because they are currently hidden.

## Quality protections
Automated regression coverage must prove:
- centralized renderer quality authority remains intact;
- constrained/full profile behavior is correct;
- close-detail configuration is not intentionally downgraded;
- garage interactivity remains available;
- ordinary buildings do not require full interiors;
- repeated world assets can use shared resources/instancing where expected;
- progressive steering remains progressive and speed-sensitive;
- relevant collisions remain available;
- no cache/release behavior regresses;
- the full gameplay/fidelity gate remains green before promotion.

## Measurement
Before/after measurements must include at minimum:
- FPS and average/p95 frame time;
- draw calls;
- triangles;
- geometry count;
- texture count;
- JS heap/runtime memory where available;
- loading time;
- runtime errors/fatals.

The optimization is successful only if measured workload improves without a close-range visual/functionality regression. A single metric improvement is not sufficient if it comes from an unacceptable fidelity loss.

## Release policy
Implementation is developed and tested from the approved fidelity branch/worktree. The exact tested commit is the only candidate for beta promotion. Cloudflare remains untouched. No merge or production/beta promotion occurs without explicit user authorization after verification.
