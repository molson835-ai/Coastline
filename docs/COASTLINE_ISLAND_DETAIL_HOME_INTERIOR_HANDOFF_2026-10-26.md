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

## Follow-up: optimized full-apartment GLB candidate + CTM retrofit plan (2026-10-26)

User approved exploring a full GLB apartment interior instead of continuing to build every house furnishing procedurally, and wants to keep the existing exterior and garage if that is the simpler/safer retrofit.

- **Source asset:** Visthétique, “Modern Apartment”, Sketchfab: https://sketchfab.com/3d-models/modern-apartment-1fbb649cd6624f2bb7b7d6e30c6533a5
- **License:** CC BY 4.0; attribution is mandatory. Asset credit entry added to `ASSET_CREDITS.md`.
- **Prepared optimized candidate (working artifact, not yet in repo):** `/mnt/data/modern_apartment_coastline_mobile.glb`, 47,528,304 bytes (about 45.3 MiB), down from 209,556,540 bytes (77.3% smaller). Conservative quadric decimation reduced approximately 2,991,575 triangles to 1,557,401 and 3,847,436 vertices to 2,065,333; 85 textures were reduced to a maximum 512 px and JPEG quality 80; positions/normals and indices were quantized where supported. The optimized GLB passed structural checks and loaded through the local Trimesh parser with 241 geometry objects and 101 materials. This is **not** yet a browser/Babylon/Three.js render test, and the required KHR_mesh_quantization extension must be verified in the project's actual Three.js loader before release.
- **Important binary integration gate:** the optimized GLB is currently a working artifact in the ChatGPT file workspace, not committed or served by the repository. Do not wire the runtime to a missing file or claim the replacement is active. Add the exact optimized asset at `assets/modern_apartment_coastline_mobile.glb` (or an agreed stable public asset URL) before enabling it in the game package; then add it to `scripts/build-itch.mjs` and the service-worker asset cache.
- **Preferred retrofit:** preserve the current Homey exterior, driveway lamps, and garage world/garage-to-house door. Replace only the procedural `home-interior` root with an asynchronously loaded GLB; retain the existing CTM world IDs `homey-garage` and `home-interior`, and the transitions `homey-garage-to-house` / `home-to-homey-garage`. Ensure load failure rolls back cleanly to the source world and the old interior remains a temporary fallback until the GLB passes tests.
- **Alignment plan:** use the GLB's entrance-door group as the anchor and align it to the existing garage doorway; don't guess a hard-coded model origin. Measure the model bounds after rotation/scale and keep the house within the Homey collision scope. Generate conservative wall/furniture colliders separately from decorative meshes so the player cannot leave through walls or become trapped.
- **Closet/wardrobe:** find the imported `BedroomWardrobes` group after model load and derive the wardrobe interaction point from its world-space bounds/position. Replace the current hard-coded `{x:490.4,z:494.55}` proximity point with this model-derived anchor. Preserve the current wardrobe chooser, clothing persistence, and on-foot-only interaction; update the visual trigger and test to match the actual closet.
- **CTM invariants:** preserve the selected/parked vehicle and appearance across garage → home → garage; do not spawn a vehicle inside the house; do not dispose shared vehicle geometry; ensure only one active player vehicle. House movement must remain enabled, entry/return thresholds must be open and traversable, and source-root cleanup must remain reliable after load failures.
- **Next implementation steps:** first add the binary asset to the repository/package or a stable public asset host; then implement async GLB loading and fallback, model-derived doorway/closet anchors, conservative colliders, update service-worker/package manifests, and add Playwright regressions for loading, house movement, closet prompt/use, garage→house→garage round trip, vehicle identity/paint persistence, load failure rollback, and no duplicate roots. Run exact-head CI and test the preview on Android before merge. PR #128 remains open/unmerged; no merge or production promotion without explicit authorization.


## Update — 2026-10-27: optimized home interior parts transferred to PR #128
- The three existing binary chunks from `main` were copied by Git blob reference (no re-upload/re-encoding) onto `feat/homey-pizzazz-coast-bucks-vehicle-paint` in commit `953a8315c83099bcd5870bb9d2e06403f1cfe7e0`.
- Branch paths and byte sizes: `assets/vehicles/coastline_home_interior_part_1.bin` (20,000,000), `part_2.bin` (20,000,000), and `part_3.bin` (7,528,304); total 47,528,304 bytes, matching the optimized GLB artifact's reported size.
- These are raw chunks, not a standalone `.glb`; the game does **not** load them yet. Before runtime integration, reconstruct and validate the GLB byte-for-byte (ideally outside the browser/build if repository tooling permits) or implement a safe concatenation loader, verify the GLB header/Three.js loader support, and update packaging/service-worker rules. Do not treat file presence as proof of a working house interior.
- PR #128 remains open/unmerged. The copy commit advances only the PR branch; no merge was performed. Recheck CI for the new head and do Android preview verification after integration.


## Runtime integration — optimized furnished house GLB (2026-10-27)

- Added `coastline-homey-glb-loader.js` and wired `createHouseRoot()` in `coastline-world-transitions.js` to load the optimized apartment GLB when Homey House Interior is created.
- Loader fetches the three committed binary chunks from `assets/vehicles/`, checks exact chunk byte counts, verifies GLB v2 header/declared length, verifies SHA-256 `bfa1fd41d535d1cb5f8ad93e3a0902280e0595083d653c3483c187b8d4e1351b`, then parses with Three.js GLTFLoader. Failure leaves the built-in procedural interior available and logs a diagnostic.
- House loader is included in the itch HTML package. Large chunks are excluded from service-worker precache and fetched on demand to avoid forcing a ~45 MiB download during startup.
- Added regression assertions for runtime integration, packaging, asset integrity checks, and on-demand fetch behavior.
- CI on commit `b628a2d8f2123b7cd66e5067563d6505a917fc6d` was still running at handoff update: itch package and Babylon browser smoke in progress; gameplay watchdog pending; graphics quality guard passed. Check exact-head Actions before considering this verified.
- Not yet confirmed: that the live Cloudflare preview serves all three binary parts with the expected byte lengths, that the GLB parses in browser, visual fit/scale/orientation inside the house, mobile frame time/memory, and movement/collision/transition regression after model load. Do not describe this as fully working until browser and Android acceptance verify the model is visible and positioned correctly.


### Follow-up hardening — 2026-10-27

- GLTFLoader is dynamically imported only when entering the house; a CDN/parser problem therefore cannot prevent the main game from starting.
- GLB chunks are fetched sequentially into one preallocated buffer to lower peak memory; checksum and GLB-v2 header/length checks must pass before parsing.
- When the furnished model replaces procedural furniture, stale hidden furniture collision footprints are removed while visible shell/entry wall colliders remain.
- Added a browser regression that actually transitions into Homey House, waits for the reconstructed GLB to load or fail, asserts that the GLB contributes over 100 meshes and reports successful loading, and confirms the player can still move afterward. The test allows up to 180 seconds for the 45 MiB asset and browser parse.
- Code-under-test commit: `0ebbfcbe4a51b28878205545bc9e8911bf595798`. At handoff time, graphics guard passed; Babylon preview validation and itch HTML package were running; gameplay watchdog was queued/pending. Do not treat browser acceptance as passed until the exact-head workflow results finish. PR #128 remains open and unmerged.


## Follow-up: user visual acceptance failed — furnished interior scale/replacement (2026-10-27)

User reported that entering Homey House showed a tiny trailer-shaped apartment nested inside the original house. Treat the prior visual acceptance as failed; asset integrity or mesh-count tests do not prove the interior fits.

- Replaced the fixed 0.96 model scale with bounds-based fitting to the existing interior envelope (17.4 × 5.05 × 25.2 world units) after rotation, then recenters the model and aligns its lowest bound to the house floor.
- Changed the takeover step to hide every procedural house-* visual, including the old floor, walls, ceiling, windows and furniture, so the imported interior no longer appears inside the original procedural room. Retain the perimeter collision envelope for movement safety.
- Added regression assertions for envelope fitting and hiding the superseded procedural visuals. Also repaired malformed literal escaped newlines in tests/homey-garage.spec.mjs that made the engine-test file fail to parse.
- Runtime loader fix commit: 407d8556640d7be09ae1d363059daadc4c5b6f36; test fix commit: 033eeda92e187cb8ef8b07a0e40e31165389bd46.
- Still required before acceptance: exact-head browser test must confirm the reconstructed GLB loads; visual inspection must confirm room-scale appearance, floor/door alignment, usable navigation, and no overlap. Visual distortion from per-axis fitting must be inspected. Android memory/frame pacing and model furniture collision are still not verified. PR #128 remains open/unmerged.


## Clarification: replace the room, preserve model proportions (2026-10-27)

User clarified the intended architecture: do not scale the apartment to fit the existing procedural room. Replace the interior room with the furnished model at a realistic, proportion-preserving scale; keep the existing exterior house unchanged and never render the interior in the exterior world.

- Updated `coastline-homey-glb-loader.js` to rotate the source model, compute its own horizontal bounds, and apply a single uniform scale so its longest horizontal dimension is about 23 world units. This preserves model/furniture proportions rather than independently stretching width, height, and depth to the previous room dimensions.
- The house-interior root is created only when transitioning to `home-interior`, and removed when that world unloads. The exterior house belongs to the separate island/city world and is not modified by the interior loader.
- The imported model takes over the interior visuals; procedural room visuals are hidden, with the existing collision boundary retained. Further verification must ensure no exterior bleed-through, door/floor alignment, and navigable space. The source asset's scale/orientation may still need a uniform-scale adjustment based on visual inspection; automated tests cannot confirm appearance.
- Runtime update commit: 8069c18d77fb38b0ba25dad008ce530ad7074099; regression-test update: 34ce4c290a1904c060bdfbcb08437db31ae63c39. PR #128 remains open and unmerged.


## Next PR — City bridge elevation, driveway lamps, and visible map-edge barriers (user-requested 2026-10-27)

Carry these three issues into the next consolidated PR. They are additional scope notes, not confirmation that fixes are already implemented.

1. **Vehicle floats at City → Homey Island bridge/land approach.**
   - Reproduce the transition from the City bridge onto Homey Island, watching the vehicle from the bridge entrance through the landing and onward toward the house.
   - Find the source of the vertical offset: bridge/road surface height, island terrain elevation, vehicle wheel/ground contact, or transition interpolation/spawn Y. Make the car track the actual drivable surface continuously; it must not hover above the bridge or terrain before snapping down near the house.
   - Preserve suspension/vehicle visuals and bridge traversal; do not paper over it by lowering the car globally or breaking ground clearance on other roads.
   - Add a regression/check for vehicle Y relative to the sampled drivable surface across bridge approach, landing, and road segments, plus a manual visual drive-through.

2. **Homey Island driveway lamps: remove duplicate large posts and make small GLB lamps functional.**
   - Current driveway still shows the existing larger lamp posts as well as smaller lamp posts from the imported GLB. Keep the small GLB lamps only; remove/disable the overlapping larger driveway lamp posts without removing unrelated street lighting elsewhere.
   - Make the retained small lamps behave functionally like the larger lamps were intended to: appropriate lighting/illumination, collision and vehicle-impact response (fall/knock over), and reset/self-repair after the player leaves the area or transitions inside, following the existing lamp interaction design.
   - Check for duplicate light sources, z-fighting/overlap, correct ground placement, mobile performance, and no player/car traps. Add tests for one intended lamp set and the functional interaction/reset behavior.

3. **Visible, solid-feeling perimeter blocking at inaccessible City map edges.**
   - Add visible boundary scenery along City map edges where the player cannot continue, matching the quality/intent of Homey Island's existing perimeter blocking. Do not leave an apparently open road or empty horizon where an invisible blocker stops the player.
   - Use context-appropriate combinations of mountain ranges, dense tall brush/grass, coastal rocks, fencing, retaining walls, or other natural/man-made barriers. Make it visually obvious that the route ends or access is restricted, while preserving the intended playable skyline and coastal views.
   - At bridges or map-edge crossings that should appear partially obstructed, use a believable partial concealment such as brush, tall grass, or destructible/breakable wooden barriers that can be walked or driven through where intended. Do not accidentally block required City ↔ Island routes or create invisible walls in apparently passable areas.
   - Ensure visible barrier placement agrees with movement/vehicle collision boundaries, cover all inaccessible edges consistently, and test both on-foot and vehicle approaches from each map edge. Keep rendering/performance bounded with instancing or shared assets for repeated scenery.

## Acceptance checklist for these next-PR notes
- City → Homey bridge and landing drive-through has no visible vehicle floating or sudden vertical snap.
- Only the small GLB driveway lamps remain in the driveway, and they are grounded, functional, interactive, and reset correctly.
- City map-edge blockers are visually readable before the player reaches them, agree with collision, and do not interfere with intended bridges/transitions.
- Run exact-head CI and browser regressions; manually inspect the actual preview and Android gameplay before declaring visual/physics acceptance. Keep PRs unmerged until explicitly authorized.

## Decision update — discard imported house interior; use it as design reference (2026-10-27)

User explicitly reversed the imported GLB replacement decision. **Do not load the GLB in-game.** Restore and retain the established procedural `coastline-homey-house-interior.js` as the actual Homey house interior. The imported Modern Apartment GLB is inspiration/reference only; do not scale it into the world or replace/hide the procedural room.

- Removed the runtime loader import/call from `coastline-world-transitions.js`; `createHouseRoot()` now builds the regular procedural interior directly.
- Removed the GLB loader and chunk handling from the standalone itch package and service-worker runtime. The service-worker cache was bumped to v63.
- Replaced the browser test that required the 45 MiB GLB to load with a transition/movement regression for the regular procedural interior; added a source regression that checks the procedural builder is used and the experimental loader is absent from runtime/package/cache.
- The three binary chunks are existing repository assets from earlier work; they are no longer used by the game. Avoid reintroducing their runtime download or package inclusion.
- Next task is to inspect the GLB's layout as a design reference and selectively improve the procedural home: room zoning and circulation, open-plan kitchen/living/dining flow, realistic kitchen cabinetry/counters/island, coherent bedroom/bathroom/closet placement, lighting, materials, wall/door/window proportions, and tasteful decor. Keep collision geometry separate and conservative so furniture does not trap the player. Reuse the project's procedural meshes/materials; prioritize the strongest layout ideas that fit the existing entrance, world bounds, CTM transitions, and mobile performance. Do not copy the GLB wholesale or claim its layout has been inspected in detail until the asset has actually been examined.
- Preserve the exterior, garage, door transitions, player movement, closet/wardrobe interaction, and vehicle persistence. PR #128 remains open/unmerged; verify exact-head CI after these changes.

## GLB layout review and procedural design inspiration (2026-10-27)

Reviewed the optimized GLB's scene/mesh inventory. It contains clearly separable detail groups for the entry/shoe storage, fitted kitchen (refrigerator, oven, sink/faucet, cabinetry/blinds), dining table/chairs, bedroom wardrobes and bed decor, bathroom fixtures, washer/dryer, office desk/monitor, plants, rugs, window frames/curtains, and decorative lighting. These contents support using it as a reference for a more complete zoned home, not loading its geometry into Coastline.

The procedural interior now adds a compact kitchen island with stools and pendant fixtures, upper cabinetry and repeated cabinet fronts, a distinct bathroom with vanity/mirror/shower/toilet, a stacked washer/dryer utility area, and a small office nook. Existing living room, dining room, bedroom, closet/wardrobe interaction, entry threshold, and movement colliders remain in place. The layout still needs browser/visual acceptance: check that the new bathroom partitions and fixtures don't obstruct the hallway or create visual overlaps, that the entry-to-living route remains clear, and that the wardrobe interaction and return-to-garage transition still work. Treat these additions as initial procedural inspiration, not a claim of full visual parity with the GLB.


## Consolidated follow-up — Homey layout, bridge grounding, driveway lamps, City edges (2026-10-27)

- Branch: `feat/homey-home-layout-natural-floor`, based on `main`.
- **Do not integrate the three-part apartment GLB.** The procedural home interior remains the runtime implementation; GLB chunks must stay out of runtime, itch packaging, and service-worker cache.
- Approved combined scope:
  1. Natural hardwood floor with lightweight plank cues; exactly one living-area carpet; enclosed rear-wall closet; clear entry-to-home circulation; retain couch and all existing useful room interactions.
  2. Correct the active vehicle's Y grounding on the sagging City and Homey bridge decks using the same deck profile as the visible planks; do not globally lower vehicles or alter normal road handling.
  3. Remove only the six large duplicate Homey driveway lamp posts. Retain the ten small path-light forms and give each its own transform, emissive bulb/practical light, collision, vehicle knock-over behavior, and reset after leaving the area or transitioning indoors.
  4. Add low-cost instanced rock and tall-scrub scenery at City map edges. A radius-aware explicit collision limit at ±710 aligns with scenery centered at ±714; the north bridge corridor (x within ±13, z -860 to -700) is exempt, with the original ±720 map bounds retained as fallback.
- Implementation so far:
  - `coastline-homey-house-interior.js`: natural hardwood material and one line-mesh plank detail; removed dining/bedroom rugs and hall runner; repositioned coffee table and kitchen island; moved the bed/dresser/nightstand to open the route; placed the enclosed closet directly against the bedroom back wall; repaired malformed bedroom wall dimensions and split the front wall around a wide, usable doorway.
  - `coastline-island-regions.js`: removed the duplicate large driveway posts; replaced instanced small lights with ten individually resettable path lamps and restrained non-shadowing point lights.
  - `coastline-world-transitions.js`: exported the shared sagging-deck height profile; exposed a bridge-specific vehicle-ground sampler; added City boundary rock/scrub scenery with a north bridge opening; added test diagnostics for bridge height, City boundary, and driveway lamps.
  - `game-v3.html`: active vehicle grounding now consults the bridge deck sampler before falling back to the normal world ground function.
  - Tests: updated `tests/homey-garage.spec.mjs` and `tests/coastline-rope-bridge.spec.mjs`; added browser coverage in `tests/ctm-browser-regressions.spec.cjs` for boundary presence, bridge surface/vehicle height, retained small lamps, and transition reset.
  - Design and implementation plan live under `docs/superpowers/designs/` and `docs/superpowers/plans/` with date 2026-10-27.
- **Verification status:** code at pre-handoff head `81a2e075af313785aa02846fcb362fc612f85c80` passed engine tests, deterministic system tests, graphics-quality guard, Babylon browser validation, packaged HTML5 Chromium smoke test, and the full gameplay Playwright suite. This handoff correction is documentation-only; recheck the PR's current commit checks before merge. Browser assertions verify the shared bridge profile and vehicle-grounding math, but do not replace a visual drive-through. Android visual inspection and a real drive-through remain required before final acceptance.
- Do not merge without explicit user authorization.


## Reconnection checkpoint — 2026-10-27

- PR: [#129 — Improve Homey interior, bridge grounding, driveway lamps, and City boundaries](https://github.com/molson835-ai/Coastline/pull/129).
- Branch: `feat/homey-home-layout-natural-floor`.
- Recovery note: during chat reconnection, an attempted source refresh briefly replaced seven changed files with their `main` versions. Those files were restored from the previously verified implementation commit `81a2e075af313785aa02846fcb362fc612f85c80` and recommitted on the PR branch. The PR diff should retain the approved implementation; do not treat the intermediate refresh commit as intended behavior.
- Latest verification before this note: graphics quality guard passed; Babylon preview validation passed; itch.io HTML package job passed; gameplay browser smoke suite was still running. Recheck the latest head checks after this handoff update.
- Verified implementation preview for the restored runtime source: https://92fc6a9c-coastline-beta.molson835.workers.dev
- Still required: inspect final exact-head browser results, verify the newest branch preview deployment, and perform a real bridge drive-through plus Android visual inspection. Desktop CI is not proof of those manual checks.
- The apartment GLB chunks remain reference-only and must not be loaded, packaged, or cached. Do not merge without explicit user approval.


## Deferred follow-up PR scope — after PR #129 merges (2026-10-27)

**Important:** These items are requirements for a *separate upcoming PR*. They are documented here for continuity only; they are not part of the implementation scope of PR #129. Do not begin the follow-up runtime changes until PR #129 has merged, and do not merge either PR without explicit user authorization.

### 1. Make every rope bridge safely traversable

- Turn the existing visible rope guard rails into real driving barriers, so the active vehicle cannot steer off either side of a bridge deck. Audit the City ↔ Homey bridge and the other intended island-to-island bridge spans, not just one bridge.
- Barrier/collision geometry must follow each bridge's actual span and sag profile instead of using a flat wall that floats above the deck or blocks the bridge entrances.
- Keep the narrow, exposed single-lane rope-bridge look. Do not turn the bridge into a broad conventional roadway. Player-on-foot behavior should remain intentional and consistent with the visible rails.
- Test centerline driving, both side edges, forward/reverse movement, and both bridge landings. Assert that a vehicle cannot escape laterally yet can still complete each intended CTM crossing without getting stuck.

### 2. Make the City road network stop before the map perimeter

- Audit procedural City road generation and stop roads before the outer map boundary. Avoid roads that continue to the map edge or create a conspicuous continuous road ring around the City.
- Make the rope bridges feel like discoveries: preserve reachable, functional approaches, but let terrain, buildings, vegetation, or the existing landscape shape conceal or de-emphasize their approaches naturally. Do not close the bridge corridor, create invisible blockers, or reintroduce landmark-discovery popups.
- Keep roads purposeful and connected to neighborhoods/destinations rather than drawing a continuous perimeter loop. Keep road collision, vehicle navigation, and visible road endpoints consistent.
- Add regression checks for road extents, no unintended perimeter loop, and open intended bridge corridors; inspect City edges and bridge approaches in the playable preview.

### 3. Finish the closet/wardrobe character and accessory selector

- Audit the character/accessory GLB pack and asset credits to enumerate all usable character choices and accessories actually present. Do not invent missing options or import the separate three-part apartment GLB as a runtime asset.
- Expose all supported character variants and accessories as selectable options in the existing closet/wardrobe UI (the wardrobe option cluster/menu). Selecting an option must visibly change the player's character model, appearance, or equipped accessory—not just the selected label.
- Ensure options compose safely (compatible accessories can be combined; incompatible pieces do not overlap or disappear unpredictably), the player's selected appearance persists through CTM/world transitions, and returning to the wardrobe restores the current selection.
- Add a complete selection matrix covering every discovered asset option, plus browser tests that verify the visible model/accessory changes and persistence. Record any asset that cannot safely be used and why.

### 4. Add the Electric Lemonade cave/dungeon adventure

**Location and transition**
- Use the existing neighboring island that actually bridges to Homey/residential Island. Confirm its region ID and bridge route from the current CTM manifest before placing content; do not create a disconnected island or an unintended extra route.
- Build a small, low-cost mountain with a clearly visible dark cave opening. Entering the cave triggers CTM into a distinct interior dungeon world. Exiting the dungeon returns the player through CTM to the cave mouth/outer island at a coherent position and orientation.
- The dungeon interior should be pitch black with no accidental ambient fill, skybox light, or visible distant scenery. The purchased body glow is the intended way to illuminate the cave; keep the cave navigable through that glow without making the room itself bright.

**Electric Lemonade stand and paid glow**
- Place a small lemonade stand outside the cave with a manning pedestrian NPC and a readable sign that says exactly **ELECTRIC LEMONADE**.
- Offer a cup for **10 Coast Bucks (CB)**. A successful purchase deducts 10 CB once and applies a strong character-body glow/emissive and practical light sufficient to reveal the nearby dungeon. Check the current balance and handle insufficient funds without charging or activating the effect.
- The effect should be scoped to the dungeon excursion and wear off when the player exits the dungeon via CTM. Make sure the character is no longer glowing after the return transition, including interrupted/failed transition paths. Do not leave an unbounded point-light source behind.
- Keep the stand/cashier interaction contextual and show a clear purchase price and effect. Use the existing currency persistence and terminology.

**Rocket boots discovery and timed power**
- Place a partially concealed, discoverable pair of rocket boots inside the dungeon. Finding/activating them grants a temporary movement ability that lets the on-foot character run at approximately car-like speed for **5 minutes**.
- Only affect the on-foot character's movement; do not silently grant a vehicle, alter normal vehicle physics, or bypass world/CTM boundaries. Preserve collision so high speed cannot pass through walls, leave the dungeon, or skip required triggers.
- When the five-minute effect expires, restore ordinary movement, remove associated boot effects, and make the boots available at their dungeon pickup location again. A new pickup should be possible on a later visit; avoid a permanent one-time pickup flag.
- Define reliable timer behavior and testability (including transition/exit, pause, reload/session handling, and boundary cases) before implementation. Do not let the boost stay active indefinitely if a timer is interrupted.
- Add dungeon pickup/buff/expiry/reset tests, CB purchase and balance tests, darkness/glow lighting assertions, and cave entry/exit CTM tests. Include a visual playtest in the preview to ensure the glow—not hidden room lighting—actually illuminates the dungeon.

### 5. Make the Use/Action button contextual

- Show the Use/Action button only when the player is close enough to a currently usable interaction (for example, a closet, door, vehicle-entry option, purchase stand, or pickup) and the action is actually eligible in the current world/mode.
- Hide it promptly when no eligible interaction is in range, when the player moves away, when the world changes, or when an interaction becomes unavailable. Keep the on-foot/vehicle-specific rules for the Homey garage and house transitions.
- Test distances just inside/outside each interaction radius, transitions, and cases where multiple prompts compete. No permanently visible, inert Use button.

### 6. Correct reversed driving steering

- The driving controls currently steer in the opposite direction: pressing/holding Left turns right and Right turns left. Correct the underlying steering sign/mapping rather than masking only one UI control.
- Audit keyboard, touch/mobile controls, and any controller/gamepad mapping so left consistently steers left and right consistently steers right across forward and reverse driving, camera orientation, and all vehicle types that share the steering handler.
- Add a behavioral regression that drives forward with a left input and observes a leftward turn, then repeats with right input. Verify keyboard and touch mappings and ensure walking/camera controls are not accidentally inverted.

### Follow-up PR acceptance checklist

- [ ] Current PR #129 is merged before this follow-up implementation begins.
- [ ] Rope guard-rail collision prevents lateral vehicle falls on every intended bridge and all CTM crossings remain usable.
- [ ] City roads stop before the map edges; no conspicuous perimeter loop; bridge approaches remain functional but naturally discoverable.
- [ ] Every usable character/accessory in the character GLB pack is represented in the wardrobe and demonstrably changes the visible player; selections persist through transitions.
- [ ] Electric Lemonade stand, NPC, exact sign, 10 CB purchase, sufficient-funds handling, dungeon-only glow, and exit cleanup work.
- [ ] Cave and pitch-black dungeon are connected through CTM; rocket boots provide the five-minute car-speed run and reset after expiry.
- [ ] Use/Action appears only for nearby eligible interactions.
- [ ] Left/right steering is corrected and verified for keyboard and touch controls.
- [ ] New engine/system/browser tests pass on the exact PR head; preview and Android manual checks are recorded separately from automated checks.
- [ ] Handoff and asset credits are updated; apartment GLB remains unintegrated unless explicitly approved later.


## 2026-10-28 — Consolidated Homey and island correction

### Confirmed implementation causes
- The bundled Cozy character GLB has named material slots for skin, body, hair, eyes, hat, top, bottom, shoes, backpack and hands. The earlier wardrobe guard required an array of materials plus geometry groups; this skipped some valid mesh/material arrangements. It also needed to apply saved options again after async avatar attachment.
- Dining/TV/hall furniture blocked the path into the closet, and decorative closet doors had collision enabled.
- The collision polygon covered the complete island shoreline while decorative rock scenery sampled only parts of it. That created movement barriers with no visible counterpart.
- The long Waterfront boardwalk overlapped the cave approach and produced the rectangular ground slab. Existing cave chunks were too low and sparse to read as a mountain.
- Vehicle selection and safe exit checks considered cars in hidden/inactive worlds. The streamed islands also needed local parked cars for on-foot players.

### Corrective implementation in this branch
- Live character wardrobe color channels, hair overlays, body/presentation profiles, accessories and persisted application after model load. The current single exported GLB still does not include the entire modular mixer source library; full original mesh swaps require separate exported variants.
- Wider non-colliding closet opening; dining nook and TV/hall storage moved out of the main route.
- Instanced visible rock segments follow the collision shoreline while leaving bridge mouths open, and Homey receives a marked parking apron.
- Outdoor streamed islands get local parked cars; enterable-car lookup, foot collision and exit-space checks are scoped to the active world root. Parked copies own their geometry/materials and are cleaned when the world unloads unless one becomes the player's selected car.
- The boardwalk is moved to the marina side; the cave has higher faceted peaks and ridge shapes plus flank/rear collision volumes.
- Garage-to-house spawn heading points inward; house-to-garage points outward. The service-worker cache generation is bumped to v65 to refresh mobile clients.

### Acceptance is not complete until the PR checks and phone pass finish
Run engine/system/vehicle/Playwright and itch package checks against the exact PR head. Then manually test the published build on Android: closet access and visible clothing/hair/accessory changes; car entry and exit on Residential/Waterfront/Port; left/right driving in forward and reverse; transition direction; island boundaries; cave approach and entry/exit. Passing source checks cannot replace the Android playtest.

## Future PR work (explicitly out of scope for this corrective PR)

1. **Engine audio on first vehicle entry.** The engine sound remains silent until the user exits and re-enters a vehicle. Trace audio-context activation/unlock, per-vehicle engine loop lifecycle, and entering/exiting paths. Start sound on the first successful entry, and resume correctly after Android app/tab suspend and resume. Cover the first entry with an automated lifecycle regression.

2. **City-Island tree silhouettes.** City Island must use palm trees only for any tree-shaped vegetation. Other low plants and shrubs may remain. Audit the actual spawned mesh/asset catalog rather than trusting the tree labels alone.

3. **Replace current animals with a consistent rigged GLB pack; make animals rideable.** Review candidates, import only the selected licensed assets and README/license files into assets, replace the existing animal visuals, and integrate mount/dismount, rider seat sockets, locomotion and camera/collision. When mounted, in a convertible, on a motorcycle or otherwise exposed, show the appropriate exposed player character body/pose rather than hiding the entire avatar.
   - [Gobkit Free Animal Pack](https://gobkit.itch.io/gobkit-free-animal-pack) documents 10 CC0 rigged/animated GLBs; [Animal Pack Vol. 2](https://gobkit.itch.io/gobkit-free-animal-pack-vol-2) and [Vol. 5](https://gobkit.itch.io/gobkit-free-animal-pack-vol-5) offer additional species and provide GLB/animation details on their pack pages.
   - [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) lists 12 animals, 12+ animations per animal and glTF format under CC0.
   - Before downloading into the game, check the exact archive's included license/readme, species list, rig/animation format, triangle count and texture cost. Mounted animals require more than swapping a mesh: add mount/dismount, attachment points, pose/animation integration, camera, collision, persistence and low-end Android checks.

4. **Homey garage automatic threshold transitions.** Replace the current explicit garage-entry button with automatic CTM handoff at the threshold. Driving in forward or reverse, walking in, and walking out forward or backward must all work. Use threshold-crossing direction, keep player/vehicle state coherent, and add hysteresis/debounce to prevent repeated transitions.

5. **Circus cannon long-distance CTM.** Place a circus-style launch cannon behind a large bush on the far side of the cave island. Show a contextual Use action only at close range. Play a short animation of the character climbing into the barrel, fire the cannon, show the player flying through the air, and land on a new previously inaccessible island. The destination should get the intended Coastline scenery quality, a safe landing and return route, state/camera handling, transition failure recovery and Android performance checks.

### External asset research checked 2026-10-28
- Gobkit Animal Pack: https://gobkit.itch.io/gobkit-free-animal-pack
- Gobkit Animal Pack Vol. 2: https://gobkit.itch.io/gobkit-free-animal-pack-vol-2
- Gobkit Animal Pack Vol. 5: https://gobkit.itch.io/gobkit-free-animal-pack-vol-5
- Quaternius Ultimate Animated Animal Pack: https://quaternius.com/packs/ultimateanimatedanimals.html
- Grab3D Character Mixer source/export limitations: https://grab3d.com/tools/character-mixer/


- City boundary audit found movement collision stops around ±710 while rock/scrub decoration sampled every 22 units at ±714. A continuous instanced rock course now fills those visual gaps all around City; the north bridge gap is narrowed to the 5.2-unit deck plus clearance. This complements the polygon-matched island shoreline wall.


Bedroom circulation note: the bed's solid footprint and nightstand were overlapping the straight doorway-to-closet walking line in the original layout. The follow-up rotates the bed into the east side of the room, moves the dresser and bedside table away from that corridor, and increases the clear bedroom doorway width. A Playwright path probe now asks the live collision function about four points along that corridor; every point must be traversable.


Cave follow-up note (2026-10-28): source inspection found a second rectangular artifact beyond the displaced marina boardwalk. The approach was a flat PlaneGeometry(15, 11) stone-colored slab placed directly over the ground. It is replaced with a curved, irregular ShapeGeometry path whose edges taper and wander naturally into the cave mouth. An engine regression now forbids the old rectangular plane and requires the irregular shape.


Car-access follow-up (2026-10-28): the active-world car finder and exit collision were already scoped, but the contextual Use-button gate still returned only custom island interactions outside City, so it could hide Use beside a valid local parked car. The general interaction chain also searched City garages, benches, buildings and pedestrians at shared coordinates in inactive worlds. The runtime now exposes Use when an active-world car is within range and limits those other interactions to entities in the active root; the outdoor car regression verifies the prompt is visible before interacting.
