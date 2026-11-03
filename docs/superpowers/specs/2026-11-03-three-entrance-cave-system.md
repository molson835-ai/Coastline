# Three-Entrance Waterfront Cave System

Date: 2026-11-03
Status: Approved implementation contract
Target branch: fix/cave-entrance-alignment-world-init
Base: main

## Approved exterior asset and orientation

Use only `assets/3_evil_rock_mountains_with_cave_stylized.glb` for the cave/mountain exterior. The GLB contains three separate mountain meshes arranged left-to-right. Preserve all three authored front-facing cave doorways. The approach side is the front of the formation; do not rotate any entrance to a side or rear face, and do not invent or cut replacement entrances.

The three entrance identities are stable and ordered left, center, right. Each doorway must have its own measured world-space threshold and its own CTM registration. Derive the thresholds from the transformed GLB mesh/doorway bounds rather than guessed offsets.

## Cave interiors and CTM behavior

- Left and right entrances lead into distinct substantial natural cave labyrinths, each providing approximately 120 world units of exploration.
- Center entrance leads to the Electric Lemonade cave and retains the existing Electric Lemonade purchase, glow, rocket-boots pickup, five-minute duration, and purchase/eligibility rules.
- Each entrance has a matching return CTM. Returning from one cave must place the player just outside that same entrance, facing outward.
- Use the existing transition manager as the sole transition authority and the existing contextual E/USE interaction path. Do not add a new polling loop or obsolete cave-use button.
- Natural cave construction: irregular stone floors/ceilings, narrow and wide passages, bends, branches, chambers, alcoves, dead ends, and clearly navigable exits. Avoid rectangular box-room appearance.
- Solid stone geometry and collision must agree. Only authored tunnel openings and walkable paths are passable.

## Initialization and lifecycle

- Prepare the approved GLB, all three cave exteriors, cave interiors, collision metadata, and CTM registrations during Waterfront/world initialization.
- Do not create cave geometry after the player approaches an entrance.
- Remove the 250 ms replacement-runtime cave polling/late GLB loader. The replacement runtime must not be responsible for cave geometry creation.
- No 100 ms cave maintenance timer, duplicate cave assets on re-entry, or stale collision from retired cave geometry.
- Remove the obsolete single-cave GLB presentation and old procedural exterior mountain/mouth geometry and colliders. Preserve the Electric Lemonade stand, vendor, approach path, and unrelated Waterfront scenery.

## Scope isolation

No unrelated changes to steering, walking/mobile controls, character/hair, horse/ostrich mounts, garage/home, Waterfront vendor behavior, other island scenery, bridges, or world population.

## Acceptance tests

1. Asset inspection confirms exactly three authored mountain meshes in left/center/right order and all three authored doorways face the front approach side.
2. Runtime scene contains exactly one approved exterior formation and exactly three entrance CTMs; no legacy cave mouth or old cave GLB is visible.
3. Each CTM threshold is aligned to its doorway, is reachable on foot, and does not overlap solid stone collision.
4. Each entrance enters its intended cave; each return CTM exits to the matching exterior doorway and faces the player outward.
5. Left and right labyrinths each provide at least 120 units of traversable route length and include multiple branches, chambers, and dead ends.
6. Center Electric Lemonade flow retains the 10 CB purchase, glow behavior, rocket-boots pickup, five-minute duration, expiry, and existing rules.
7. Re-entering Waterfront does not duplicate cave meshes, colliders, transitions, or CTMs.
8. No cave geometry is created after Waterfront initialization completes; no replacement-runtime cave polling interval remains.
9. Existing transition-manager, island-region, Electric Lemonade, mobile interaction, and full gameplay smoke tests pass.
10. Validate on desktop and Android Chrome. Do not merge or deploy without explicit user authorization.
