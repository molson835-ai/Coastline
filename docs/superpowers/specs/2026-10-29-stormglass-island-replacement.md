# Stormglass Island — Replacement for the Industrial Island

Status: design proposal only; not implemented.
Target: future Coastline world-design PR, separate from cave/CTM polish.
Design goal: replace the current industrial-looking island with a memorable, playable American coastal destination that rewards driving, walking, exploration, and wildlife encounters without requiring missions or discovery popups.

## The fantasy

Stormglass Island is an old Atlantic seaside town built around a lighthouse bluff, a working-but-small fishing harbor, weathered boardwalk attractions, salt marshes, wind-shaped pines, and dramatic wave-cut rock shelves. It should feel like a real place with a few oddities—not a theme park made entirely of landmarks. The silhouette from the water is recognizable: lighthouse on the high point, ferris wheel on the boardwalk, colorful harbor roofs, and a curved beach.

Visual direction: sun-faded coastal Americana; painted clapboard, cedar shingles, brick storefronts, weathered timber, sea grass, dunes, granite, tide pools, warm shop windows, gulls, and distant ocean haze. Keep the established Coastline visual fidelity; use detailed authored landmarks and convincing materials rather than a generic industrial prop field. The island should still read clearly in bright daylight and sunset.

## Layout — clockwise from the arrival bridge

### 1. The Causeway and Welcome Overlook
- A gently curving two-lane causeway with low stone shoulders, timber guardrails, and a wide pull-off overlooking the bay.
- A small weathered welcome sign, map board, and coin-operated binoculars as set dressing (no required interaction).
- First reveal: the road crests and frames the lighthouse and old ferris wheel together.
- A safe place to stop, turn around, and choose the scenic coastal loop or village route.

### 2. Harborlight Village
- Compact walkable main street of 2–3 story New England-style shops and homes: bait shop, diner, ice-cream stand, secondhand bookshop, general store, surf shop, small arcade, and a post office.
- Short blocks, rear alleys, porch steps, window details, benches, hanging baskets, and varied rooflines; avoid repeating the same building shell.
- A small central green with a ship's bell, picnic tables, a fountain, and a community notice board.
- Play value: walkable storefront browsing, small pedestrian encounters, photo opportunities, and a natural place to park and explore on foot.

### 3. The Working Harbor
- A compact crescent-shaped marina with fishing boats, lobster pots, nets, buoy piles, a fish market, boat ramp, and wooden piers.
- A lighthouse service skiff and one slightly mysterious moored research vessel—distinct silhouettes, not a giant industrial port.
- A breakwater path with wave spray and a bell buoy offshore.
- Hidden detail: a line of old painted tide marks on a harbor wall; following them leads to a tiny plaque about the island's great storm.

### 4. The Old Boardwalk
- A lively but weathered wooden boardwalk, separate from the village street: arcade, carousel pavilion, bumper-car shed, snack shack, mini-golf, and a modest ferris wheel.
- One attraction can be visibly closed for repairs, with a safe peek through the fence at an unfinished ride mechanism.
- Add lamps, ticket windows, striped awnings, benches, railings, and ocean-facing seating so the boardwalk feels inhabited even when no ride systems are active.
- A small hidden arcade back room contains a high-score cabinet and an odd hand-drawn map clue; no mission marker or forced popup.

### 5. Crescent Beach and Dune Reserve
- A broad curved beach with wet/dry sand bands, driftwood, beach grass, scattered rocks, lifeguard stand, showers, and a modest surf-rental hut.
- A raised boardwalk crosses the dunes without cutting the beach into rigid rectangles.
- Footpaths loop through a protected dune reserve; keep the planting varied and native-looking.
- Fun surprise: a natural arch visible from the beach at the far end. The arch is traversable on foot at low shoreline height, with a tucked-away sea-glass cache behind it.

### 6. Lighthouse Bluff
- A winding scenic road climbs to a stone-and-brick lighthouse compound with keeper's cottage, fog-bell frame, service shed, and a cliffside parking turnout.
- A separate pedestrian stair/path descends to the rocky point; the lighthouse itself should be a strong navigation landmark from almost every shoreline.
- Inside the keeper's cottage: warm light, maps, a logbook, old storm photographs, and a telescope. If interior scope is limited, make a convincing visible interior through windows before adding full walk-in rooms.
- Signature secret: a hidden maintenance hatch behind the cottage leads to a short service passage and a panoramic ledge—not another full labyrinth. A brass compass or unusual glass prism is a visual reward, not a mission collectible.

### 7. Saltmarsh Backcountry
- A quiet back road through salt marsh, tidal creeks, reeds, scrub pine, and a few elevated wooden footbridges.
- One tiny bait cabin, a birdwatching blind, and an old weather station with a slowly turning wind vane.
- This is the island's calm counterpoint to the boardwalk. Give it long sightlines, bird calls, and a few winding trail forks.
- Surprise encounter: a small group of wild horses or deer can be seen across the marsh; they move away if approached too quickly, then reappear elsewhere in the habitat. Keep wildlife update logic scoped to the active world.

### 8. Shipwreck Point
- At the remote end of the island, a coastal path and rough access lane lead to a wrecked wooden schooner lodged between rocks.
- The hull is visible from the road, but the best view is from a safe cliffside path and a small rocky cove.
- The wreck tells a story through props: a broken figurehead, scattered cargo crates, old brass fittings, and a sealed bottle with a faded chart inside.
- A narrow path behind the wreck returns to the main coastal loop, preventing a dead-end that feels accidental.

## Road and footpath structure

- One continuous scenic loop connects the causeway, village, harbor, boardwalk, lighthouse, marsh, and shipwreck point.
- A short village spur and lighthouse climb provide meaningful choices without a confusing road maze.
- A separate low-speed service lane serves the harbor; it should not look like an industrial freight route.
- Walking paths should create shortcuts that cars cannot use: boardwalk stairs, dune paths, the lighthouse bluff trail, and marsh footbridges.
- Include at least two pull-offs with wide ocean views and clear turnarounds.
- Roads must connect cleanly to the bridge/CTM arrival and island exit, with no invisible barriers, unmarked gaps, or routes that dump the player into water.
- Use authored outward-facing destination headings for any island portal/CTM spawn.

## Secrets and delightful surprises

1. **The ferris wheel silhouette** — the wheel is visible from the arrival causeway and lighthouse, making it a memorable wayfinding anchor.
2. **The bell that answers** — ringing the harbor bell produces a distant fog-bell response from the bluff (a tiny sound-and-world detail, not a quest).
3. **The bottle-chart** — a faded chart found near the shipwreck sketches a spot under the old boardwalk; the reward is a hidden sea-glass mosaic and a view, not currency inflation.
4. **The lighthouse prism** — sunlight through a prism casts a brief colored beam onto the keeper's wall or floor.
5. **The night-window mystery** — one upstairs village window glows late at sunset; approaching reveals a miniature ship-in-a-bottle collection and a shadow moving behind a curtain.
6. **The marsh weather station** — its vane points toward a tiny painted marker on a nearby rock; following it reveals a carved date from the island's storm.
7. **The sea-arch cache** — tucked behind the natural arch, easy to miss from the road but findable on foot.
8. **The forgotten ride token** — an old arcade token sits beneath a boardwalk bench beside a child-sized chalk drawing of a sea monster.
9. **The tide-pool miniature world** — colorful crabs, shells, anemone-like details, and reflections make the rocky shore rewarding to inspect up close.
10. **A distant sail** — at a few authored viewing angles, a tiny sailboat silhouette crosses the horizon; no heavy simulation required.

No mandatory missions, giant discovery banners, or intrusive popups. Secrets should be discovered through sightlines, environmental clues, sound, and exploration. Any interaction can use existing lightweight interaction conventions.

## Wildlife and activity opportunities

- Shore birds and gulls around the harbor/boardwalk; small crabs near rocks; occasional deer or wild horses in the marsh; fish visible beneath clear shallow water if inexpensive.
- Use existing rideable horse/ostrich mounting architecture where appropriate; do not add a new mount type just to populate the island.
- Optional free-roam activities: scenic driving loop, beach parking/photo stop, lighthouse climb, boardwalk exploration, harbor walk, marsh trail, and finding the shipwreck.
- Future-friendly spaces: a small empty beach lot for a seasonal event, a fenced boardwalk ride pad for later functional attractions, and a stable/paddock edge near the marsh if mount gameplay grows.

## Performance and production rules

- Preserve visual quality while managing cost through repeated modular props, merged static meshes where practical, instancing for reeds/grass/lamps, texture reuse, LODs, and active-world-only wildlife/ambient updates.
- Keep the lighthouse, ferris wheel, village roofline, and causeway reveal as high-priority authored landmarks; distant island edges can use lower-cost terrain and coastal silhouettes.
- Avoid hundreds of unique animated props. Reserve animation for a few high-value details (ferris wheel rotation if inexpensive, weather vane, flags, gulls, boat bobbing).
- Keep collision aligned with visible geometry. Test beach slopes, boardwalk edges, pier gaps, stair landings, and the natural arch with both character and vehicle.
- Build the island as a coherent replacement, not a second disconnected island pasted over the industrial one. Remove industrial-only roads/props and clean up old collision volumes.
- Match City Island's scenery completeness and material quality while maintaining a distinct coastal identity.

## Acceptance checklist for a future implementation PR

- [ ] Island reads as a distinct coastal destination from the bridge before the player reaches shore.
- [ ] Industrial buildings, freight-yard dressing, and unwanted industrial roads are removed from this island.
- [ ] Scenic road loop and walking shortcuts form a connected, navigable network.
- [ ] Causeway, village, harbor, boardwalk, beach/dunes, lighthouse bluff, marsh, and shipwreck point are all present.
- [ ] Landmark silhouettes and environmental storytelling work without missions or discovery popups.
- [ ] At least six secrets/surprises can be found by exploration; none block progression.
- [ ] Vehicle/character collisions align with visible scenery; no unintended water falls or invisible walls.
- [ ] Destination CTM/bridge round trips preserve player state and place the player facing away from the arrival portal.
- [ ] Active-world update gating and mobile performance budgets remain intact.
- [ ] Browser smoke test and Android playtest cover the arrival reveal, full road loop, walking routes, and return transition.
