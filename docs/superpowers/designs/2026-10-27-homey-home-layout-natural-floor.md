# Homey Home Interior + Coastal Traversability & Boundaries

**Date:** 2026-10-27
**Branch:** `feat/homey-home-layout-natural-floor`
**Base:** `main`

## Goal

Make the procedural Homey home interior feel like a cohesive, believable American home while correcting the City-to-Homey bridge traversal, finishing the small Homey driveway lamps, and making City map limits visibly understandable. Keep the work mobile-conscious and compatible with CTM.

## Explicit scope

### A. Homey home interior redesign
1. **Do not integrate the three-part apartment GLB yet.** The procedural interior remains the runtime interior. The GLB remains reference/inspiration only.
2. **Natural hardwood floor:** continuous, natural-looking hardwood across the main home, using a lightweight procedural treatment rather than a large external texture dependency.
3. **One cohesive carpet:** a single intentional carpet/rug in the living area; remove/consolidate the unrelated dining rug, bedroom rug, hall runner, and duplicate rug treatments.
4. **Enclosed rear-wall closet:** move the wardrobe to the back wall and make it read as a real enclosed closet with side/back structure and a clear opening/door treatment. Preserve wardrobe interaction and clothing persistence.
5. **Clear home circulation:** provide a normal, obvious path from garage/entry through the home. Remove or relocate objects that occupy the main walkway. Retain the couch.
6. Preserve functional kitchen, dining, bathroom, laundry, office, bedroom, TV, refrigerator, bed, bathroom, and wardrobe interactions.
7. Preserve CTM rules: house entry/return on foot only; garage vehicle-only; selected vehicle/appearance persist; never spawn a duplicate or a vehicle inside the house.

### B. City ↔ Homey Island bridge alignment
1. Correct the City-to-Homey bridge/landing so the car does not appear to float above the bridge, terrain, or landing, and does not sink or clip through them.
2. Trace the actual bridge deck profile and the vehicle ground-height/terrain alignment. Fix the specific source of mismatch; do not globally lower vehicles or compromise normal road handling.
3. Ensure bridge planks, approach, and island landing connect continuously, accounting for the bridge's sag profile and island elevation/water placement.
4. Add regression coverage for bridge deck/landing height contracts and run browser/manual drive-through checks where tooling permits. Explicitly report if automated checks cannot prove live visual/physics alignment.

### C. Homey Island driveway lamps
1. Keep only the **small existing driveway lamps**; remove the larger duplicate driveway posts only. Do not remove unrelated street lighting.
2. Make each retained small lamp functional and readable: visible light/emissive glow, sensible ground placement, and collision/impact behavior.
3. A vehicle hit should knock a lamp over; lamps should reset/self-repair after leaving the immediate area or transitioning indoors, matching the existing intended interaction.
4. Prevent duplicate light sources, misplaced/hovering lamps, and unnecessary draw calls; prefer shared materials/instancing where compatible with per-lamp impact state.

### D. City map-edge boundaries
1. Make inaccessible City map edges visibly read as boundaries rather than invisible or arbitrary blockers, using a fitting mix of terrain/mountain ridges, tall brush/grass, rocks, fencing, retaining walls, or other natural/urban edge dressing.
2. Keep collision consistent with the visible boundary so neither player nor car can continue through scenery that appears solid.
3. Preserve every intended City ↔ island bridge/transition route. Where a bridge approach is intentionally hidden by vegetation or designed as breakable wood/brush, make the visual cue and passability agree with the actual gameplay behavior; do not accidentally close intended routes.
4. Keep repeated boundary dressing performant using shared assets/instancing and avoid overbuilding scenery beyond the playable region.

## Layout direction

Use the reference apartment's strongest spatial ideas without importing its geometry: clear entry-to-living circulation, fitted kitchen organization, distinct private bedroom/closet zone, and practical utility spaces. The closet should sit against the rear wall, face the usable bedroom area, and remain outside the main walking lane. The living room retains the couch and uses one cohesive carpet as its anchor. Reduce or relocate the coffee table/decor if they obstruct circulation.

## Non-goals and constraints

- No three-part GLB integration or runtime/package/service-worker references to those chunks.
- No new world or CTM architecture.
- No missions or landmark discovery notifications.
- No global vehicle height/handling changes to mask a bridge-specific issue.
- No removal of unrelated street lights.
- No intentional visual-quality reduction to solve performance.

## Acceptance criteria

- Continuous natural hardwood reads clearly as wood; exactly one intentional main living-area carpet remains.
- Closet is enclosed against the rear wall and wardrobe interaction/clothing persistence still work.
- Entry-to-home path is visibly clear; couch remains.
- All existing home zones/interactions remain usable and garage ↔ house transitions preserve one selected vehicle without spawning it inside the house.
- City ↔ Homey bridge and both landings have coherent visible height alignment; vehicle can traverse without obvious float/sink/clipping.
- Only small Homey driveway lamps remain; they are grounded, lit, collidable, can be knocked over by a vehicle, and reset after leaving/transitioning indoors.
- City map edges visibly communicate the limit; player and vehicle collision agree with the scenery; intended bridge approaches remain open.
- Add/update source and browser regressions for layout, bridge geometry/height contracts, lamp behavior, and edge-route passability.
- Run exact-head CI and available browser/preview/package checks. Manual Android driving and visual inspection remain required for final acceptance; do not claim them from desktop CI.
- Update the persistent Coastline handoff with scope, implementation decisions, test results, preview link if available, and unresolved manual checks.
