# Homey House Interior — Single-World Experience

## Goal
Turn the Homey house interior into a compact, believable American home world with useful spaces, coherent circulation, rich but mobile-conscious detail, and purposeful interactions.

## Design
The house remains one CTM world (`home-interior`) rather than splitting rooms into additional worlds. A normal enclosed bedroom branches from a short hallway. The garage remains the separate garage world, while the house itself is a complete destination with living, dining, kitchen, bedroom, closet and household interactions.

### Layout
- Garage/entry threshold opens into a short mudroom/hall zone.
- Living room is the visual center of the home.
- Sofa faces the TV directly; coffee table is centered between them.
- Dining area connects naturally to the kitchen.
- Kitchen uses believable counters, appliances and small household details.
- Hallway leads to an enclosed bedroom through a normal American interior doorway.
- Bedroom contains bed, nightstands, dresser, rug, lighting and a typical reach-in closet.
- Closet has visible hanging clothes/shelves and a proximity interaction for wardrobe changes.

### Interaction rules
- Player movement must never snag on furniture corners; movement colliders use simple intentional footprints with clearance rather than decorative geometry.
- Closet interaction is on-foot and proximity based, following the existing key-board interaction pattern.
- Wardrobe supports clothing selection and clothing color selection, with state persisted across reloads/transitions using the existing player appearance state when available.
- TV, lighting and household props may have lightweight interactions where an existing project pattern supports them; do not create expensive simulation for decorative objects.
- Every physical prop must have a believable reason to exist and a stable position.

### Visual rules
- No floating props.
- No objects embedded in walls, floors, ceilings or one another.
- No furniture blocking the primary walking path.
- TV, sofa and coffee table form a conventional viewing arrangement.
- Bedroom and closet read immediately as their intended spaces.
- Details favor high-value silhouettes and repeated materials over many unique draw calls.

### Scope boundary
This is one house world, not a second open-world island. It should feel substantially richer than the current compact room without becoming a new performance-heavy environment.

## Acceptance
1. Entering the house permits uninterrupted normal walking.
2. Living-room furniture reads as a conventional viewing arrangement.
3. Kitchen, dining, hallway, bedroom and closet are visually coherent.
4. Closet proximity interaction opens a wardrobe selector and clothing color can be changed.
5. Clothing choice persists through the supported player-state lifecycle.
6. Garage/house transitions remain reliable.
7. Existing driveway light posts are functional without adding duplicate posts.
8. Desktop CI remains green and Android visual/gameplay acceptance remains explicitly tracked.
