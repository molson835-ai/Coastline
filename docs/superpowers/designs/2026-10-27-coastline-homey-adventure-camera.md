# Coastline Homey Adventure + Dynamic Proximity Camera Design

## Goal
Deliver the approved next Coastline PR as one coherent gameplay pass: expand the Homey house interior, make tight-space camera presentation usable, and implement the deferred Homey/island gameplay and interaction scope without regressing CTM, persistence, visual quality, or mobile playability.

## User experience
- Homey house interior becomes larger and more usable while retaining its procedural runtime implementation.
- In hallways, closets, the house interior, caves, and other tight spaces, the third-person camera automatically moves closer and resolves wall occlusion so the player remains visible and the space ahead is readable.
- In open areas the camera smoothly returns to the normal third-person distance.
- The rope bridge remains narrow and visually exposed, but its guardrails become real side barriers.
- City roads stop naturally before the perimeter rather than forming a conspicuous road ring.
- Wardrobe options expose only real character/accessory assets and visibly change the player.
- The Electric Lemonade cave adventure is a real CTM-connected dungeon with actual darkness, a purchased 10 CB body glow/light, a five-minute rocket-boot on-foot speed buff, and reset/expiry behavior.
- The contextual Use/Action button appears only when a valid nearby interaction is available.
- Vehicle steering is corrected so left means left and right means right across supported input paths.

## Architecture
- CTM remains the authority for world/interior transitions and persistence.
- Existing island/region metadata identifies the neighboring island and bridge route for the cave.
- Existing Homey procedural interior remains the runtime source; the three-part apartment GLB stays reference-only and is not loaded, packaged, or cached.
- Existing player/vehicle persistence remains the source of truth across transitions.
- Add a small camera-proximity controller that consumes player/camera collision context and smoothly adjusts camera distance/target without changing player physics.
- Reuse the existing interaction eligibility/range model for the contextual Use button.
- Reuse Coast Bucks balance/persistence for the lemonade purchase.
- Keep dungeon illumination bounded to the player glow/light rather than adding a hidden global room light.

## Camera behavior
1. Detect normal third-person camera obstruction or a configured tight-space condition.
2. Reduce camera distance toward a close minimum with smoothing/hysteresis to prevent jitter.
3. Adjust target/height enough to keep the player and nearby geometry readable.
4. Prevent walls immediately behind or beside the player from dominating the view.
5. Restore normal distance only after clearing the obstruction/tight-space condition.
6. Avoid changing camera behavior in normal open-world driving or open walking spaces unless collision requires it.
7. Work during CTM transitions without leaking state between worlds.

## Electric Lemonade rules
- The lemonade stand is outside the cave on the confirmed neighboring island/region.
- Sign text is exactly `ELECTRIC LEMONADE`.
- Cup costs exactly 10 Coast Bucks.
- Successful purchase subtracts 10 CB and enables a strong body glow plus practical bounded light for the dungeon excursion.
- Insufficient funds do nothing and do not partially charge.
- Glow is cleared on dungeon exit, including failed/interrupted transitions.
- Rocket boots are partially hidden in the dungeon.
- Pickup grants on-foot movement speed comparable to the intended car-like running speed for exactly 5 minutes.
- Vehicle physics are unchanged.
- Collision remains authoritative so the buff cannot tunnel through walls or skip CTM.
- At expiry, normal movement is restored and the pickup becomes available again at its original location for a later visit.
- Timer behavior is explicitly testable across transition/exit, pause, reload/session, and boundary conditions; no indefinite buff.

## Guardrails and boundaries
- Rope bridge side barriers follow the bridge span and sag profile and do not block either landing.
- City road visual endpoints, collision endpoints, and navigation endpoints agree.
- No invisible perimeter blocker is introduced merely to hide road mistakes.
- No landmark discovery notifications or missions are reintroduced.
- Existing vehicle paint separation, CTM persistence, and Homey interactions remain intact.
- Limo scale correction and landscape-edge/fencing improvements from the current project scope remain included where still pending.
- City Island and Homey Island retain full intended scenery; future islands keep the same rendering/working-asset quality but remain intentionally empty beyond terrain/basic coverage until designed.

## Verification strategy
Add focused browser tests for each behavior, then run the existing project guards/smokes. Visual acceptance remains required for the bridge, Homey interior, dynamic camera in tight quarters, Electric Lemonade darkness/light, and wardrobe appearance changes on an Android-sized viewport. Never claim the PR is fully passing until the relevant current-head checks have actually completed.
