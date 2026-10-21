# Coastline CI Recovery Plan — October 20, 2026

## Evidence from workflow run 39515606209

- Engine tests: passed.
- System tests: passed.
- Vehicle and fidelity tests: passed.
- Browser shard 3/3: passed.
- Browser shard 1/3: failed walking displacement, car acceleration, and rideable availability/interaction.
- Browser shard 2/3: failed authored-sedan status shape, steering threshold, mobile forward movement, and the public-works NPC story transition.

The run is an older commit and is diagnostic evidence, not acceptance evidence for the current branch head. Do not mark the branch green from this run.

## Fix strategy

1. Preserve rendering settings and authored assets; do not lower quality to improve test stability.
2. Make movement tests choose collision-free locations rather than hard-code (0, 0), then measure actual displacement while controls remain held.
3. Align the authored vehicle loader's public status object with the existing test contract (source: authored-glb at the top level); retain nested instance details.
4. For driving and mobile controls, ensure the test lane is clear of static props, pedestrians, parked/AI vehicles, and map bounds. Keep meaningful speed/displacement assertions.
5. Diagnose the rideable and NPC failures independently. For the NPC, inspect the transition trigger inputs (player position, target signal position, phase, and update timestamp); do not change the expected story outcome or skip the interaction.
6. Re-run the full three-shard browser suite and all engine/system/vehicle/fidelity/package gates on the new head. Review failure traces if any shard remains red.
7. Acceptance requires all jobs green on the same commit SHA and a review of gameplay, mission, controls, NPC, authored asset, and render-quality results.

## Current changes

- Added top-level source=authored-glb to the loader's successful authored-vehicle status.
- Changed the walking regression to locate clear ground and poll for real displacement rather than assuming (0, 0) is unobstructed.
- Remaining failures are intentionally still open until reproduced and verified on the current branch head.
