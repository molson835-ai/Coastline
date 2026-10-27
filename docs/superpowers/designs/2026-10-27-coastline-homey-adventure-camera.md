# Coastline Homey Adventure + Dynamic Proximity Camera Design

Approved design for the next consolidated PR.

- Expand the procedural Homey house interior while preserving existing architectural details and walkable interactions.
- Add a dynamic third-person proximity camera: when camera collision or a tight-space condition makes the normal view unusable, smoothly pull the camera closer and manage occlusion; smoothly restore normal distance in open space.
- Make rope-bridge guardrails real collision barriers following the existing bridge deck/sag profile.
- Terminate City roads naturally before the perimeter and keep visual/collision/navigation endpoints consistent, with landscape/fencing treatment rather than invisible blockers.
- Audit the actual character/accessory pack and expose every supported option through the wardrobe; selections must visibly alter the player and persist through CTM.
- Add the Electric Lemonade cave/dungeon on the existing CTM-confirmed neighboring island: exact sign, 10 CB purchase, actual darkness, bounded player glow/light, five-minute on-foot rocket-boot buff, expiry/reset, and transition-safe behavior.
- Make the contextual Use/Action control appear only for valid nearby interactions and hide promptly when eligibility ends.
- Correct the underlying vehicle steering mapping so left turns left and right turns right across keyboard, touch, and controller inputs.
- Include pending limo scale normalization and landscape-edge/fencing details while preserving City/Homey full scenery and future-island quality rules.
- Preserve CTM persistence, vehicle paint separation, no missions/landmark popups, mobile performance, and the rule that the three-part apartment GLB remains reference-only.

Verification must include focused browser tests plus existing project guards/smokes and Android-sized visual acceptance. Completion is not claimed until current-head evidence exists.
