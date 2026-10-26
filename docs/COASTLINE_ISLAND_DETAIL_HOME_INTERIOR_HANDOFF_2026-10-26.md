# Coastline Island Detail + Home Interior Handoff — 2026-10-26

## Current branch
- Branch: `feat/island-detail-home-interior`
- Base: `main`, after PR #126 was merged (merge commit `6ace9da6ce012b2ee193c5d527d0c045d5a81ead`).
- This is a separate follow-up PR. Do not merge or promote it without explicit user authorization.

## User-approved scope for this PR
1. Garage: make the interior larger, add a recognizable sectional roll-up garage door that remains retracted above the vehicle entrance so CTM vehicle transitions stay physically traversable.
2. House transition: add an open door from the garage into a separately streamed Homey house interior. Only on-foot players may cross the threshold; entering the threshold triggers an immediate CTM transition, and crossing back returns to the garage. The parked/selected vehicle must survive the world switch without duplicate active vehicles or disposed vehicle geometry.
3. Key board: retain the existing on-foot-only chooser, visible only when the player is within reach of the board.
4. Limousine: normalize width and height to the passenger-car envelope while using a longer body target (5.15 world units vs 4.25 for a standard sedan). The new pure sizing helper has regression coverage.
5. Island detail: the user clarified that **all islands should match the City's visual detail quality**, overriding the earlier placeholder rule for future islands. Downtown, Residential/Homey, Waterfront/Marina, and Port should all use developed-quality content, while preserving each theme. Add consistent street details (sidewalks, road dashes, lamps, benches) and visible natural shoreline/landscape boundary rocks. Keep per-island population budgets bounded and only simulate the active island.

## Implementation notes
- `coastline-island-regions.js`: all four manifest regions are now `developed`; waterfront and port receive their theme-specific resort/marina and harbor assets plus the shared street-detail layer, palm vegetation, and instanced shoreline rock boundaries. Shoreline placement accounts for the ShapeGeometry X rotation so the rocks follow the rendered contour. Existing point-in-shoreline movement boundary remains the gameplay blocker.
- `coastline-vehicle-sizing.js`: pure helper for target envelopes, uniform scale, and limo length correction. `coastline-asset-swap.js` uses it so the limousine retains passenger-car width/height but is not compressed to the standard sedan length.
- `coastline-homey-garage.js`: interior expanded to 18 x 31 world units; sectional slats are parked overhead; rear wall has a clear, on-foot house doorway; key board coordinates moved with the expanded room; board prompt remains distance-gated.
- `coastline-homey-house-interior.js`: separate CTM-ready interior with floor, walls, door frame, open door, living room, kitchen, dining area, windows, lighting, and plants.
- `coastline-world-transitions.js`: adds `home-interior`, `homey-garage-to-house`, and `home-to-homey-garage`; uses a shared forward threshold-crossing predicate and re-parents the selected/parked vehicle before disposing source roots. Additional islands explicitly require developed content density.
- `coastline-sw.js`: cache bumped to v61 and includes the house interior and vehicle sizing modules.
- `scripts/build-itch.mjs`: packages both new runtime modules and uses the standalone package cache generation v3.
- Regression coverage added for all-island detail contracts, house threshold direction/range, limousine proportions, garage door presence, on-foot house entry/return, and island boundary/street-detail diagnostics.

## Important invariants
- No weapon systems; retain family-friendly driving/exploration.
- No landmark-discovery notifications or missions are reintroduced.
- Garage entry/exit remains vehicle-only through the vehicle threshold. Garage-to-house and house-to-garage are on-foot-only.
- Key-board option is hidden unless on foot, inside Homey Garage, and close enough to use.
- Vehicle selection must not recolor glass, wheels, lights, trim, or other cars.
- Keep CTM state coherent, one active player vehicle, and car/appearance persistence across worlds.
- Preserve City and Homey villa content; new island detailing must not close bridge landings.
- Mobile performance is a release criterion; use instancing for repeated shoreline rocks and lamps, keep simulation budgets bounded, and do not claim Android performance is verified from desktop CI.

## Verification status
- Code and regression tests have been committed to this feature branch.
- Initial exact-head CI ran after PR #127 was opened. Engine and system tests passed, and the graphics guard plus Babylon preview validation passed. The itch package initially failed because its cache-version assertion still expected v2 after the package was advanced to v3; the assertion was corrected. The gameplay browser suite was still running at the time of this note, and the latest commits are awaiting a fresh exact-head result. No overall pass is claimed yet.
- The latest completed gameplay run failed one existing assertion because the registered-world list now correctly includes the new `home-interior` world. Updated `tests/world-transition-runtime.spec.cjs` to expect the additional world. Engine/system tests passed; graphics guard, Babylon preview validation, and itch package smoke tests passed on the preceding exact head. The corrected head needs a fresh full gameplay run before this PR can be considered ready.
- Continue monitoring the latest PR head. Run engine/system tests, the full Playwright browser suite (including the new garage/house/island regressions), Babylon preview validation, and the standalone itch HTML package smoke test. Inspect exact-head failures and fix them on this branch.
- Specifically verify: the overhead garage door does not block the car threshold; the house doorway transitions only on foot and instantly; the selected car survives entering/exiting the house; the key board prompt appears only within reach; all three streamed island roots show boundary rocks, lamps, benches, and developed content; limousine bounds remain proportional.
- A real Android playtest is still required for camera/occlusion, frame pacing, vehicle handling, and transitions.

## Related merged work
- PR #126, Homey Island garage CTM and vehicle key-board selector, merged to main at `6ace9da6ce012b2ee193c5d527d0c045d5a81ead`.
- Follow-up PR includes the newly requested features; it does not modify or reopen PR #126.


## Follow-up PR scope — Homey pizzazz, Coast Bucks, paint-role safety (2026-10-26)

- Proposed branch: `feat/homey-pizzazz-coast-bucks-vehicle-paint`, based on merged main commit `20f2e04ea72b07fd6534442c5aa3109d2892a844`.
- Vehicle paint root cause found in garage swap code: role assignment was at mesh level, then the code recolored every material slot on each mesh tagged as body. If a single FBX mesh contains multiple material slots for paint, glass, trim, wheels, etc., this can recolor the entire vehicle. New code only recolors clearly named body/paint/exterior material slots and explicitly protects glass/wheels/lights/trim/metal/interior. If the source model does not expose a safe paint slot, the code records a diagnostic instead of indiscriminately recoloring all slots. Verify every supported RGSDev model in the garage; inspect source FBX material names/groups and separate geometry/material groups if any model has no identifiable body slot.
- This approach matches the Three.js car-material pattern of independently assigning body, glass, trim and wheel materials, and the Khronos glTF CarConcept sample which separates paint, glass, interior, hardware, lamps and wheel materials. References: https://threejs.org/docs/pages/MeshPhysicalMaterial.html ; https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/README.body.md ; https://threejs.org/manual/pages/load-gltf.html .
- Homey residential island gains instanced backshore American beachgrass in spaced patches, coastal bayberry-style shrubs, driftwood, and individual driveway lanterns. Coastal landscape references recommend beachgrass and mixed native dune plants in loose clumps with bare sand between them: https://www.mass.gov/info-details/sample-landscape-plan-for-a-coastal-dune and https://www.nj.gov/military/construction-facilities-management/environmental-management/documents/3307-booklet-FINAL.pdf .
- HUD money label changes to `CB` (Coast Bucks); transaction/shop copy spells out “Coast Bucks” for earnings and charges.
- Garage improvements: exposed brick texture, real architectural house-door and overhead double-bay garage-door details (no instructional banners), vehicle-only front exit for walking collision, workshop colliders, a resettable tire that can be knocked over, and a loose wrench that drops when the toolbox area is bumped. Driveway lanterns can fall when struck by a moving car and reset after leaving the area or transitioning inside.
- CI and visual verification must be run against the exact PR head before calling this complete. Check all material roles for each RGSDev vehicle in the Homey garage; check collision props don't trap the player/car, the garage cannot be exited on foot through the front or sides, and City/Homey/house transitions still preserve the selected vehicle. Android visual and gameplay acceptance remains required; no merge or production promotion without explicit authorization.


## RGSDev source-pack material research (2026-10-26)

The asset creator's official page explicitly states that the pack has separated wheels and that vehicle colors are separated by materials so developers can create new colors: https://rgsdev.itch.io/free-low-poly-vehicles-pack . The pack is CC0 according to the author page. A mirror of the same pack also describes the assets as FBX models with material settings: https://www.turbosquid.com/FullPreview/1926290 . Therefore the intended route is to inspect each imported FBX's material slots/groups and recolor only the actual paint material(s), not the whole mesh indiscriminately. The new role-aware paint code deliberately refuses to guess if the material slot cannot be safely identified; use the in-garage material diagnostic and inspect actual model material names before adding a per-model mapping.


## Garage floating props and house-entry movement regression (2026-10-26)

User reported that objects still appeared to float in the garage, house entry left the player unable to move, and instructional banners remained visible. Investigation on PR #128 found:
- The garage builder explicitly created both banners with `addSign()`; removed the helper and both calls. The open house door now has visible door-panel details, and the raised sectional garage door has side support rails/hangers.
- The house transition spawned the player at (483, 500), overlapping the living-room coffee-table footprint near the entry spawn. Both the registered transition spawn and fallback spawn now place the player at (483, 508.5), facing into the house (`Math.PI`), in the clear entry/hall path, while keeping Y aligned to the house floor at z=500.
- Several props described as wall-mounted were actually placed around x = centerX - 6.5 while the wall is at centerX - 9.3. Moved hose reel, hose tail, extinguisher, service clock, and workshop plaque to the wall; corrected the hose reel and clock face orientation. Moved key hooks/fobs onto the key-board face. Rebuilt the workbench as a supported unit with legs and a lower shelf, attached the tool pegboard/slats and upper cabinets to the right wall, moved the key board flush to that wall, added ceiling cross-beams to support the lights when the ceiling is hidden for the camera, and moved perimeter lights flush to the walls. Re-seated parts bins on the lower shelf.
- Added source-level regression checks that reject the banners and assert architectural door/support geometry and wall mounting. Updated the Playwright house-entry test to assert the new safe spawn and verify the player can move immediately after entering.

Exact current implementation head at time of this note: `222259688b1c1c50cc3949071812674ce9cf1b38` (PR #128, still open/unmerged). CI was still running when checked; verify exact-head browser/gameplay and package checks before declaring the fixes passed. The support geometry and source assertions do not replace an actual visual inspection on Android. No merge without explicit authorization.

- Latest geometry follow-up: workbench/cabinet/pegboard/ceiling-light supports are included, and the house spawn Y is aligned to the interior floor. Exact-head CI must be confirmed against the current PR head after these commits; Android visual acceptance is still required.

- Additional floating-prop audit: the workbench now has legs and a lower shelf; cabinets/pegboard are attached to the right wall; key board and perimeter lights are flush-mounted; ceiling cross-beams support the ceiling strips when the ceiling is hidden; the parts shelves have been moved to the rear wall with visible brackets, and the cans/bins sit on the shelf tops. Latest implementation/test commits are on PR #128; verify current exact-head CI before saying passed.


## Follow-up: gameplay test exposed the actual house movement blocker (2026-10-26)
The exact-head gameplay watchdog completed with 55 passing tests and one failure: the new assertion confirmed the player could not move immediately after entering Homey House. Root cause was in `buildingBlocked()` rather than the transition spawn: it had a dedicated `homey-garage` collision branch but no `home-interior` branch. The house interior therefore fell through to the island-shape test with region ID `home-interior`, which treated every position as outside the island and blocked all movement. Added a dedicated `home-interior` collision scope with house bounds and `coastlineActiveWorldColliders` checks. The existing browser regression is retained; rerun exact-head gameplay watchdog and verify the player can move and return through the door. PR #128 remains open/unmerged pending CI and Android visual confirmation.
