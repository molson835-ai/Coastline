# Short Bridge Transition Buffer

## Goal
Make the current island-to-city CTM test physically readable and safe by separating each world's playable map from the transition endpoint with a short protected bridge/out-of-bounds buffer.

## Current behavior
The island starts in the active vehicle and CTM can transition into City, but the City destination can place the vehicle immediately against City geometry. The bridge currently begins at the island/City map-edge coordinates and the CTM destination is the outer bridge endpoint.

## Desired behavior
- Keep the current naked island and short bridge for this validation pass.
- Keep the bridge physically connected to the playable edge of each world.
- Treat the bridge outside the playable map as a protected transition corridor.
- On Island -> City, transition after crossing the island bridge and spawn on the City-side bridge buffer, facing into City.
- On City -> Island, transition after crossing the City bridge and spawn on the Island-side bridge buffer, facing into the island.
- The destination spawn must be clear of normal world geometry and not be inside a building or normal map collision.
- The player remains in the same active vehicle with the same visual hierarchy.
- Existing CTM resident-world behavior remains intact: only the active world is resident/visible after a successful transition.
- The bridge transition must remain physical; do not replace it with teleport-only interaction.

## Current-pass scope
Use the existing 100-unit bridge. Add a modest protected landing buffer at the destination rather than building the eventual scenic long loading road now.

## Future direction
The eventual production transition can extend this corridor into a scenic ocean/cliff loading road. The center can use atmospheric fog/cloud cover so the player feels like they are driving through a cloud while CTM streams the destination. That future polish must preserve the same CTM contract and bidirectional corridor model.

## Non-goals
- No detailed island design yet.
- No missions, landmarks, NPC packs, or additional World 2 assets.
- No reduction of City visual quality to solve this transition issue.
- No merging PR #87 until automated verification and Android playtest are successful.
