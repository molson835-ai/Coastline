# Coastline asset swap and controls handoff — 2026-10-26

## Current state
- **PR:** [#121 — Replace vehicle/character assets and correct movement controls](https://github.com/molson835-ai/Coastline/pull/121)
- **Branch:** `feat/full-asset-swap-and-movement-controls`
- **Status:** Draft; implementation is in progress and CI is being reviewed. Do not merge or deploy yet.
- **Main branch remains untouched.**

## User-approved scope
1. Full swap from old in-game vehicle models to the RGSDev low-poly vehicle pack.
2. Full swap from old in-game character models to the Cozy skinned GLB.
3. Fix left/right steering **only while driving**, preserving the existing on-foot input correction.
4. Remove the run touch button and make the previous run speed (7 world units/second) the default forward and backward on-foot speed.
5. Keep the work in one PR.

## Asset audit findings
- `assets/Free Low Poly Vehicles Pack by Rgsdev.zip`: 1,443,472 bytes, 49 ZIP entries; includes 21 individual FBX vehicle models plus `All vehicles.fbx`. Individual types include ambulance, bus, firetruck, hatchback, limousine, monster truck, muscle cars, pickup, police vehicles, roadster, sedan, sports car, SUV, taxi, truck, truck with trailer, and van.
- Included `License.txt` explicitly says CC0, public domain, commercial use permitted, credit not required.
- `assets/grab3d-cozy-character.glb`: 947,952 bytes; one mesh, 21 nodes, one skin, 31 materials, and clips `idle`, `walk`, `run`, `wave`, `jump`. Grab3D documents Character Mixer exports as CC0.
- Audit script: `scripts/audit-asset-swap.mjs`, invoked by the itch package workflow. It validates the ZIP inventory, CC0 license, key FBX files, and character animation clips.

## Implementation details
- `coastline-asset-swap.js` loads the FBX ZIP using fflate + Three.js FBXLoader and loads the Cozy GLB using GLTFLoader/SkeletonUtils. It replaces old vehicle art immediately with a neutral placeholder while loading; on failure it leaves neutral placeholders rather than old vehicle models. Unsupported bicycle/motorcycle/aircraft visuals are removed and those spawns disabled.
- `game-v3.html` swaps all road cars, the player avatar, and pedestrians. Player uses `run` while moving at the former running speed; pedestrians use available idle/walk/run/jump clips.
- `npc-world-slice.js` swaps the public-works character and van, hiding/removing legacy visuals if loading fails.
- `coastline-stability-v8.js` now normalizes A/D only while on foot; driving uses native A/D mapping. The game’s native vehicle heading physics remains unchanged.
- `scripts/build-itch.mjs` includes the new module, ZIP, Cozy GLB, and asset credits; the old Range Rover asset and fleet module are not shipped.
- `coastline-sw.js` cache version advanced to v57 and precaches the replacement module/assets.
- `ASSET_CREDITS.md` documents the CC0 sources and marks the Range Rover as legacy/rollback only.

## Regression coverage
- Existing vehicle control regression expectations verify native A-left / D-right physics.
- Added on-foot speed checks for both forward and backward movement and checks that the Sprint touch button is absent.
- Added a browser test that waits for both replacement loaders and asserts all road cars use RGSDev models, unsupported old rideables are disabled, and Cozy idle/walk/run clips are available.

## Verification still required
- Review the latest GitHub Actions run for the asset audit, itch package smoke test, gameplay watchdog, graphics guard, and Babylon preview validation.
- Fix any runtime/import/model parsing errors surfaced by CI.
- Confirm no legacy character or vehicle visuals remain visible and that the story van is replaced.
- Run a physical Android session for visual orientation, driving direction, asset loading, and performance. Headless CI does not prove Android performance.

## Safety notes
- Do not merge while PR #121 is draft or any relevant checks are failing/pending.
- Do not claim Android visual/performance verification until physically performed.
- If the asset loader fails, preserve neutral placeholders/disabled unsupported vehicles; never restore the legacy models silently.
