# Coastline Next Home + Camera + Adventure Design

**Date:** 2026-10-27  
**Base:** `main` at `f38c54c60f677c154901f9b43949887e3b53626d` (PR #129 merged)

## Goal
Deliver the next consolidated Coastline feature set without regressing CTM, vehicle/character persistence, island detail, mobile performance, or the family-friendly no-weapons direction. The Homey house becomes larger and more usable, tight spaces get a dynamic proximity camera that prevents rear-wall occlusion, and the previously approved interaction/adventure/controls scope is implemented and tested together.

## User-facing design

### Dynamic proximity camera
- Keep the normal third-person camera in open spaces.
- When the player enters a constrained room, hallway, closet, cave, doorway, or other nearby obstruction, smoothly shorten camera distance and adjust the look target so the playable area remains visible.
- Use geometry-aware obstruction handling rather than a permanent close camera or a manual toggle.
- Prevent walls immediately behind the player from dominating the view; prefer a clear view of the player and forward playable space.
- Restore the normal camera smoothly when clearance returns.
- Apply only to camera placement/occlusion; do not change movement, vehicle physics, CTM thresholds, or collision rules.

### Larger Homey interior
- Expand the existing procedural interior while retaining the current house/garage CTM contract.
- Preserve a usable entry path, bedroom/closet interaction, kitchen/living/dining functionality, and collision-safe walls/doorways.
- Do not activate the three-part apartment GLB; it remains reference-only.

### Approved gameplay scope
- Rope-bridge side guardrails become real, profile-following vehicle collision barriers.
- City roads terminate naturally before the map perimeter; bridge approaches remain reachable without an artificial perimeter road ring or invisible blockers.
- Audit the actual character/accessory GLB pack and expose every supported option; do not invent unsupported variants. Choices visibly affect the player and persist through CTM.
- Add the Electric Lemonade cave/dungeon adventure on the confirmed neighboring island/bridge route: stand, pedestrian, exact `ELECTRIC LEMONADE` sign, 10 Coast Bucks purchase, real body glow/light in a pitch-dark dungeon, rocket boots for exactly five minutes of on-foot speed, reset/recharge behavior, and reliable CTM cleanup.
- Contextual Use/Action prompt appears only for an eligible nearby interaction and disappears promptly when eligibility ends.
- Correct the underlying vehicle steering sign so left is left and right is right across keyboard, touch, controller, forward/reverse, and shared vehicle handlers.

## Safety and invariants
- No missions or landmark-discovery notifications are reintroduced.
- No weapons.
- Preserve one active player vehicle and selected vehicle/paint/appearance across CTM transitions; never flash the old model during loads.
- Garage remains vehicle-only for garage entry/exit; garage-to-house is on-foot-only.
- Paint affects only safe body/paint roles and never glass, wheels, lights, trim, interior, or other cars.
- Camera collision must never become an invisible gameplay blocker.
- Dungeon light must be bounded and tied to the purchased glow; no hidden permanent room light.
- Rocket boots cannot bypass walls or CTM boundaries and cannot affect vehicles.
- Mobile performance remains a release criterion; repeated scenery uses instancing and active-island simulation budgets stay bounded.

## Verification strategy
- Source-level regression tests for camera mode selection, distance/occlusion bounds, interior dimensions/collision, bridge guardrails, road endpoints, accessory matrix, Use prompt gating, steering direction, Electric Lemonade purchase/balance, darkness/light, rocket-boot timer/reset, and CTM persistence.
- Playwright/browser tests for critical round trips and interaction behavior.
- Exact-head engine/system, graphics guard, Babylon preview, gameplay watchdog, and itch package smoke tests.
- Real Android visual/playability check remains mandatory for camera framing, tight-room occlusion, steering, performance, transitions, and dungeon illumination.

## Non-goals
- Do not replace the house with the apartment GLB in this PR.
- Do not add missions, combat, weapons, or landmark discovery.
- Do not solve performance by materially lowering visual quality.
- Do not add a permanent manual camera mode when dynamic proximity behavior can satisfy the requirement.
