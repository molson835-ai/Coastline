# Discovery cleanup and static-world build mode — 2026-10-25

## Scope

This branch is stacked on PR #104 and is a reversible development-time change. It does not change the game engine or remove the physical environment.

## Discovery/location cleanup

- The Douglassville layout now exposes an empty landmark/POI roster, so the minimap no longer draws named discovery dots for Morlatton Village, White Horse Inn, the river trailhead, Amity Park, Monocacy Hill, the Route 422 retail strip/service station, or the farmstead.
- Removed the two hidden mystery-location props (the creekside radio and forgotten-road marker).
- Kept roads, districts, building geometry and the actual environment intact. This is a removal of discovery/POI markers and clue props, not a deletion of world scenery.
- Existing road labels such as US 422 and PA 662 remain road/navigation labels, not discovery markers.
- Random ambient replayability cues are separate from fixed location markers and remain unchanged outside static-world mode.

## Static-world developer mode

Open the game with ?devStaticWorld=1, for example:
 /game-v3.html?devStaticWorld=1

The mode is opt-in and off by default. It preserves the scene, NPC/pedestrian/traffic meshes, player controls, driving, world transitions, and rendering, but pauses ambient simulation updates:
- AI-driven traffic movement
- pedestrian activity/movement/recovery updates
- NPC story slice and traffic-signal behavior
- wildlife behavior
- social-rumor propagation
- replayability encounter checks

It does not delete actors or their assets; they remain as static visible world dressing. This is intended for environment construction and visual layout sessions. Remove the query parameter to return to normal behavior.

### Bandwidth clarification

These systems run locally in the browser; there is no evidence that they are making per-frame remote AI/API calls. Pausing them should reduce local CPU/simulation work and make layout sessions more deterministic, but it does not meaningfully reduce network bandwidth by itself. Asset downloads and external requests are a separate concern.

## Validation

The new Playwright regression checks that:
- static-world mode is activated only when requested,
- discovery landmark roster is empty,
- buildings remain present,
- AI traffic positions, pedestrian state/positions, and NPC story phase stay unchanged during the observation window,
- no uncaught page errors occur.

Run engine/system/browser suites. After CI passes, visually verify that the minimap has no landmark dots and that the city, roads, buildings, and player controls still work. No merge or production deployment is implied.
