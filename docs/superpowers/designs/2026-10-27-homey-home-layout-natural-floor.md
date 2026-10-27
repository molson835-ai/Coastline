# Homey Home Interior Layout Redesign

**Date:** 2026-10-27
**Branch:** `feat/homey-home-layout-natural-floor`
**Base:** `main`

## Goal

Make the procedural Homey home interior feel like a cohesive, believable American home while keeping it lightweight, navigable, and compatible with the existing CTM house/garage transition system.

## Explicit scope

1. **Do not integrate the three-part apartment GLB yet.** The procedural interior remains the runtime interior. The GLB remains reference/inspiration only.
2. **Natural hardwood floor:** replace the current mixed floor/rug-heavy presentation with a cohesive natural hardwood floor across the main home. Use restrained procedural material treatment rather than a large external texture dependency.
3. **One cohesive carpet:** add a single intentional carpet/rug treatment to anchor the main living area without breaking the hardwood continuity. It should read as one coordinated piece, not multiple unrelated rugs.
4. **Enclosed rear-wall closet:** move the existing clothing/wardrobe area to the back wall and make it visually read as an actual closet with enclosing side/back structure and a clear opening/door treatment. Preserve the existing wardrobe interaction and clothing persistence.
5. **Clear home circulation:** redesign furniture placement around a normal walking path from the garage/entry through the home. Remove or relocate objects that currently occupy the main walkway. The couch is explicitly retained as a major living-room anchor.
6. **Keep functional zones:** kitchen, dining, bathroom, laundry, office, bedroom, TV, refrigerator, kitchen, bed, bathroom, and wardrobe interactions remain functional unless a placement change requires their coordinates to move.
7. **Preserve CTM behavior:** house entry/return remains on-foot-only; garage remains vehicle-only; selected vehicle and appearance remain persistent; no vehicle is spawned inside the house.
8. **Mobile performance:** prefer simple procedural geometry and shared materials; avoid introducing a heavy model or texture package.

## Layout direction

The redesign should use the reference apartment's strongest spatial ideas without importing its geometry: clear entry-to-living circulation, fitted kitchen organization, distinct private bedroom/closet zone, and practical utility spaces. The central route should remain visually obvious and physically unobstructed.

The closet should move to the rear wall rather than remaining exposed beside the bed. Its opening should face the usable bedroom area, while the closet structure itself stays outside the main walking lane.

The living room should retain the couch and use the single carpet as its visual anchor. The coffee table and decorative items should be reduced/repositioned if they interfere with the entry-to-room route.

## Non-goals

- No three-part GLB integration.
- No new world or CTM architecture.
- No missions or landmark discovery notifications.
- No vehicle-system redesign.
- No intentional reduction of visual quality to solve performance issues.

## Acceptance criteria

- Main floor visually reads as continuous natural hardwood.
- Exactly one intentional main living-room carpet is present; old unrelated floor rugs/runners are removed or consolidated.
- Closet is visibly against the rear wall and reads as an enclosed closet rather than an exposed wardrobe.
- Wardrobe interaction remains available from a sensible standing position.
- A player can walk from the house entry through the main home without furniture blocking the normal route.
- Couch remains in the living room.
- Existing functional zones and interactions remain usable.
- Garage ↔ house CTM transition still works in both directions.
- No duplicate vehicle or vehicle geometry appears in the home.
- Regression coverage pins the layout contracts and CTM invariants.
- Preview is manually checked before the PR is considered merge-ready.
