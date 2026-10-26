# World 2: Homey Island and Rope Bridges

## Scope
This work is stacked directly on the current `main` head (latest merged PR #119, `01926211d6c900d71c4932abd037eeb7351f4020`) and is intended to stay in one PR.

## Implemented in this change
- Residential island uses an irregular cove/peninsula outline rather than a rounded square.
- A visible sand band surrounds raised land, with ocean water beneath the island and the outer bridge approach.
- The residential island has a low-cost modern villa exterior, an open car-sized garage bay, driveway, pool deck, garden beds, path lights, palm fronds/coconuts, and shoreline rocks.
- The island movement blocker uses the same shoreline contract, so the player cannot drive through the empty corners of the visual island.
- Vertical fix: the active island slot is lifted 6 world units, including the runtime ground height and CTM spawn heights. Island sea water is lowered to 3.0 units below the island deck reference, which clears the 2.1-unit rope-bridge sag and plank thickness; city ground height remains unchanged. The outer sand contour now slopes down to the lowered waterline rather than leaving a sheer edge.
- CTM north/south and side bridges share a narrow single-lane rope-bridge builder: separated timber planks, sagging ropes, vertical lashings, support posts, and no solid guardrails. The 5.2-world-unit deck is intended for one Coastline car at a time.
- Added engine tests for shoreline bounds, connected bridge landings, and bridge proportions.

## Scale and performance
- World-space geometry is designed against the game's current car units; the driveway and garage opening are sized to allow one car through.
- Bridge planks, posts and the ocean surface use instanced geometry or aggregated line/tube geometry where practical to avoid one draw call per plank.
- Validate on Android before treating the scene as performance-approved. CI does not replace a real device playtest.

## Villa asset note
The uploaded Sketchfab model `Modern luxury villa house building home` by zigurat architecture studio is CC BY 4.0 and requires this attribution if its geometry/textures are distributed:
`This work is based on "Modern luxury villa house building home" (https://sketchfab.com/3d-models/modern-luxury-villa-house-building-home-c2070d21f4e749b9806adbbd68b637d7) by zigurat architecture studio (https://sketchfab.com/ziguratarchitecturestudio) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)`
The current code builds a procedural, mobile-lightweight villa exterior; the downloaded GLB itself is not yet bundled in the repository. Do not claim the Sketchfab model is live in the game until the binary asset is added and the GLB loader, materials, scale, and collision boundaries are verified.

## Validation required before merge
- `npm run test:engine`
- Browser smoke test: City → rope bridge → populated residential island → return bridge.
- Check car/player continuity, island boundary blocking, garage approach, no console errors, and failed-transition recovery.
- Android playtest for visual quality and frame pacing.
