# Implementation Plan: Homey Interior, Bridge Alignment, Driveway Lamps, City Boundaries

**Date:** 2026-10-27
**Branch:** `feat/homey-home-layout-natural-floor`
**Base:** `main`
**Design:** `docs/superpowers/designs/2026-10-27-homey-home-layout-natural-floor.md`

## Guardrails

- Do not load, package, cache, or reference the three-part apartment GLB. Use only the procedural home interior.
- Preserve existing CTM transitions, vehicle persistence, paint-role safety, Coast Bucks HUD terminology, and the removal of missions/landmark notifications.
- Do not merge without explicit user approval.
- Do not reduce overall visual quality to address mobile performance.
- Keep changes specific to the bridge; do not globally alter vehicle Y/handling.
- Remove only duplicate large Homey driveway posts, not unrelated City/island street lights.

## Implementation sequence

### Task 1 — Baseline audit and targeted regression inventory
1. Inspect the full procedural home interior, garage/house transition tests, bridge builder and transition placement in `coastline-world-transitions.js`, island terrain/shoreline construction in `coastline-island-regions.js`, and the City scene-generation source for existing map-edge barriers and driveway-lamp creation.
2. Inspect the current test commands and exact-head CI workflows before editing.
3. Record current bridge geometry and vehicle-grounding path (including whether vehicle Y comes from road sampling, world ground function, or transition placement); identify the exact source of the visual mismatch before choosing a fix.
4. Add no speculative global changes. Establish test names/commands that can demonstrate the behavior.

**Done when:** all affected runtime/test locations are identified and the bridge correction has a documented, local root cause.

### Task 2 — Rebuild Homey interior circulation and finish
1. Update the procedural floor material to a warm, natural hardwood appearance with subtle lightweight plank cues (shared material/geometry; no large image texture).
2. Remove or disable the dining rug, bedroom rug, and hall runner, retaining exactly one cohesive living-area carpet.
3. Move the wardrobe to the rear wall and build a clearly enclosed closet: rear and side walls, readable opening/door treatment, clothing rail/storage; keep the wardrobe interaction anchored to the opening.
4. Review all major furniture footprints and interactions against a clear entry-to-living-to-private-room walking path. Retain the couch; move or remove objects that obstruct circulation, including the coffee table/decor where necessary.
5. Keep kitchen, dining, bathroom, laundry, office, bedroom, TV, refrigerator, bed, and wardrobe interactions reachable. Keep visual meshes and movement colliders separate where that is the existing convention.
6. Add/adjust source tests to assert hardwood/flooring intent, exactly one carpet and no legacy runner/rug names, rear-wall closet/enclosure, couch retained, and an unobstructed route contract. Extend browser navigation test to move through the entry and main circulation path and verify home interactions remain available.
7. Run relevant unit/source tests before moving on.

### Task 3 — Correct City ↔ Homey bridge and landing height
1. Inspect `COASTLINE_ROPE_BRIDGE_CONFIG`, bridge plank instancing/sag profile, City bridge origin/start coordinates, Homey Island ground elevation/shoreline contour, and the vehicle ground-height update used while driving.
2. Ensure deck plank height and landing/approach height form a traversable profile. Use a bridge-specific sampled surface/height contract if the existing road-ground function does not account for the sagging deck; avoid lowering the vehicle globally.
3. Keep the narrow, dangerous single-lane rope bridge design and exposed ropes. Preserve water below the deck and land elevation; do not change unrelated bridges unless shared code makes it necessary and all bridges are verified.
4. Add pure regression assertions for bridge deck center/end heights and landing continuity using the real bridge configuration/profile. Add/extend browser tests that cross City → Homey and assert the transition lands in the expected world/position with one active vehicle.
5. Run targeted tests and inspect a preview if available. Record that a visual drive-through is still needed if CI cannot render/check the vehicle-to-deck relationship.

### Task 4 — Keep only functional small Homey driveway lamps
1. Locate both the small lamp set and larger duplicate driveway posts; remove only the larger duplicate driveway posts.
2. Retain small lamps at ground level with coherent scale and clear silhouette. Use shared/instanced geometry where possible, but if each lamp can be tipped independently, choose a representation that supports individual transform state without duplicating light sources.
3. Add/retain a restrained emissive element and nearby practical light effect if supported; prevent six duplicate point lights from creating avoidable mobile cost (use a bounded lighting approach).
4. Ensure collision is near the physical lamp footprint and a vehicle hit can knock the lamp over. Reset after the player/car leaves the nearby area or when transitioning indoors, matching existing behavior.
5. Add source/browser regression coverage for small-lamp-only selection, no large duplicate IDs, ground placement, hit/tip behavior, and reset. Run targeted tests and inspect shadows/light spill in preview.

### Task 5 — Add visible City map-edge boundaries without closing routes
1. Locate the actual City map extents and current player/vehicle movement blockers. Reuse the existing edge rules rather than inventing a competing boundary system.
2. Dress inaccessible edges with a cohesive, region-appropriate mix of mountain/raised terrain, dense tall brush/grass, rock lines, fences, or retaining walls. Use instancing/shared materials and avoid high-cost unique meshes.
3. Align visible blockers to the true movement boundary; no gaps the car or player can slip through and no collision walls floating well inside the visible edge.
4. Explicitly map and test each intended City ↔ island bridge/transition corridor. Keep those approaches open. If a specific approach uses intentionally passable brush or breakable wood, implement the visual and collision behavior together rather than letting decorative objects contradict the intended route.
5. Add source tests for boundary coverage and route corridors, plus browser tests that verify player/car cannot cross blocked edges but can reach intended transition points. Include manual preview review of every edge and each bridge landing.

### Task 6 — Handoff, exact-head verification, and PR
1. Update `docs/COASTLINE_ISLAND_DETAIL_HOME_INTERIOR_HANDOFF_2026-10-26.md` or the current canonical handoff location with the combined scope, files changed, rationale, verification status, preview URL, and remaining Android/manual checks.
2. Run focused tests after each task, then full engine/system tests, full Playwright/browser suite, graphics-quality guard, Babylon preview validation, and itch packaged Chromium smoke test as supported by the current workflow. Inspect every failure on the exact PR head and fix regressions before calling it ready.
3. Verify the three-part GLB chunks remain unreferenced by runtime, itch packaging, and service-worker cache.
4. Open one consolidated PR containing all four approved areas. Include a test matrix separating automated passes from visual/Android checks not yet performed.
5. Do not merge until the user explicitly approves.

## Final acceptance checklist

- [ ] Hardwood floor and exactly one living-room carpet.
- [ ] Rear-wall enclosed closet, wardrobe interaction preserved.
- [ ] Clear entry-to-home path; couch retained; home zones remain usable.
- [ ] Garage ↔ house CTM and vehicle persistence regressions pass.
- [ ] Bridge deck/approach/landing heights align; vehicle does not visibly float/sink.
- [ ] Only small Homey driveway lamps remain; functional light/collision/tip/reset behavior verified.
- [ ] City edge boundaries are visible and collision-consistent.
- [ ] Every intended City ↔ island route remains open.
- [ ] Mobile cost bounded; no unnecessary lighting or scenery proliferation.
- [ ] No GLB runtime integration.
- [ ] Handoff updated; exact-head CI status accurately recorded.
- [ ] Consolidated PR opened; no merge without approval.
