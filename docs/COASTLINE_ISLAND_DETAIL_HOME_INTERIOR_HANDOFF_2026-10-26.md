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
- Continue monitoring the current PR head. Run engine/system tests, the full Playwright browser suite, Babylon preview validation, and the standalone itch HTML package smoke test. Inspect exact-head failures and fix them on this branch.
- Specifically verify: the overhead garage door does not block the car threshold; the house doorway transitions only on foot and instantly; the selected car survives entering/exiting the house; the key board prompt appears only within reach; all three streamed island roots show boundary rocks, lamps, benches, and developed content; limousine bounds remain proportional.
- A real Android playtest is still required for camera/occlusion, frame pacing, vehicle handling, and transitions.

## Related merged work
- PR #126, Homey Island garage CTM and vehicle key-board selector, merged to main at `6ace9da6ce012b2ee193c5d527d0c045d5a81ead`.
- Follow-up PR includes the newly requested features; it does not modify or reopen PR #126.
