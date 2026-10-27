# Coastline Homey Adventure + Dynamic Proximity Camera Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the approved next Coastline PR as a consolidated gameplay pass: larger Homey interior, dynamic proximity/occlusion camera, rope-bridge safety, City edge cleanup, wardrobe completeness, Electric Lemonade cave adventure, contextual Use button, corrected vehicle steering, and the remaining approved visual/detail items.

**Architecture:** Extend existing procedural Homey, island-region, CTM, interaction, currency, player/vehicle persistence, and input systems. Add only small focused modules where a subsystem has no clean existing owner. Keep the apartment GLB reference-only and preserve current mobile performance/visual quality.

**Tech Stack:** Existing Coastline browser game stack, Babylon.js runtime, HTML/JS modules, Playwright/MJS tests, existing GitHub/Vercel/Cloudflare workflow.

## Global Constraints
- Do not reintroduce missions or landmark discovery messages.
- Do not load, package, or cache the three-part apartment GLB.
- Preserve CTM vehicle/character/appearance persistence and prevent old-model flashes.
- Preserve vehicle paint/material separation.
- Use Coast Bucks/CB consistently; lemonade costs exactly 10 CB.
- No invisible City perimeter blockers used as a substitute for correct road termination.
- No hidden global dungeon light; purchased glow must provide the intended illumination.
- Rocket boots affect on-foot movement only and expire after 5 minutes.
- Keep future islands empty beyond terrain/basic coverage until designed, while City/Homey retain intended scenery.
- Optimize without intentionally reducing visual quality.
- Never declare a test or PR passing without current-head evidence.

## Review Focus
- Tight-space camera readability and wall occlusion, especially small rooms/closets/cave.
- CTM transition and persistence integrity.
- Actual rope-bridge side collision without landing blockage.
- Electric Lemonade darkness, bounded glow, currency transaction, buff expiry/reset.
- Wardrobe selections visibly changing actual character/accessory assets.
- Correct left/right steering across keyboard, touch, and controller mappings.
- Contextual Use visibility/eligibility.
- Homey interior scale/layout and usability.
- No regression of existing PR #129 behavior.

### Task 1: Establish branch and baseline
**Files:** repository branch state, handoff/design/plan docs.

1. Create branch `feat/homey-adventure-proximity-camera` from merged main SHA `f38c54c60f677c154901f9b43949887e3b53626d`.
2. Verify PR #129 merge is the branch base.
3. Run/inspect the cheapest existing static/package/runtime tests available before changes and record failures separately from new failures.
4. Add the approved plan/design docs to the feature branch if they are not already present.
5. Commit baseline documentation separately.

### Task 2: Expand Homey interior
**Likely files:** `coastline-homey-house-interior.js`, related homey tests.

1. Map current room dimensions, collision, interaction anchors, furniture, doorways, and spawn/exit positions.
2. Increase the interior footprint and room circulation without making the house feel empty.
3. Preserve the single living-room carpet rule, clear main paths, enclosed closet, usable bedroom doorway, kitchen island, couch, coffee table, and architectural door/garage details from #129.
4. Move/scale props and colliders together so no furniture traps the player.
5. Keep the procedural runtime implementation; no apartment GLB integration.
6. Add tests for expanded bounds, walkability, interaction positions, and transition exits.
7. Commit.

### Task 3: Dynamic proximity camera
**Likely files:** existing camera/player runtime module plus a focused camera helper if needed; new `tests/coastline-proximity-camera.spec.mjs` or equivalent.

1. Locate current third-person camera creation/update and collision/occlusion helpers.
2. Implement a bounded proximity controller with normal distance, close minimum, smoothing, and hysteresis.
3. Detect camera-path obstruction and configured tight-space geometry rather than relying on arbitrary distance alone.
4. Move the camera closer before walls behind/alongside the player dominate the frame.
5. Keep player and near-field geometry readable; preserve normal camera behavior in open areas.
6. Reset proximity state on CTM/world transition and avoid carrying close mode into open destinations.
7. Cover hallway, closet, Homey interior, cave, open-area restore, wall obstruction, and transition cases with browser tests.
8. Commit.

### Task 4: Rope bridge safety
**Likely files:** `coastline-rope-bridge` implementation/region files and existing bridge tests.

1. Reuse the bridge deck/sag profile used for vehicle grounding.
2. Create actual side guardrail collision barriers aligned to the local bridge span.
3. Keep both landings and the central single-lane path open.
4. Test centerline, both side edges, forward/reverse traversal, both landings, and CTM crossings.
5. Commit.

### Task 5: City road termination and landscape edges
**Likely files:** `coastline-island-regions.js` and road/scenery helpers.

1. Identify the procedural road perimeter logic and road/collision/navigation extents.
2. Stop roads before the map perimeter and eliminate the conspicuous continuous ring.
3. Preserve reachable bridge approaches and discovery-like terrain/vegetation without landmark popups.
4. Keep visual, collision, and navigation endpoints consistent.
5. Preserve/add low-cost fencing, rocks, scrub, or landscape edges where appropriate.
6. Add regression tests for extents, no perimeter loop, and open bridge corridors.
7. Commit.

### Task 6: Wardrobe character/accessory audit
**Likely files:** wardrobe/character asset loader, menu/interaction code, `ASSET_CREDITS.md`, wardrobe tests.

1. Audit the actual character/accessory GLB pack and asset credits; enumerate only assets that exist.
2. Expose all supported variants/accessories through the existing wardrobe cluster/menu.
3. Ensure selection changes the actual player model/material/accessory.
4. Prevent incompatible accessory overlap/disappearance.
5. Preserve selection through CTM transitions and returning to wardrobe.
6. Add a selection matrix test for every supported option and persistence cases.
7. Commit.

### Task 7: Electric Lemonade cave/dungeon
**Likely files:** CTM manifest/region definitions, interaction/currency/player movement modules, new dungeon tests.

1. Resolve the actual neighboring island/region ID and existing bridge route from the CTM manifest; do not hard-code a guessed world.
2. Add mountain/cave entrance and CTM route to a separate dungeon interior.
3. Build a small outside lemonade stand with pedestrian and exact `ELECTRIC LEMONADE` sign.
4. Implement exact 10 CB purchase with atomic insufficient-funds behavior.
5. Make dungeon lighting effectively black except for the purchased player glow/body emissive and a bounded practical light.
6. Implement rocket-boot pickup with on-foot-only speed, exact 5-minute timer, collision preservation, and original-location respawn after expiry.
7. Define and implement behavior for exit, failed/interrupted transition, pause, reload/session, and timer boundaries so the buff cannot persist indefinitely.
8. Add tests for stand/sign, cost/balance, insufficient funds, darkness, glow/light, cave CTM, buff speed, vehicle immunity, expiry, reset, and transition failure/exit.
9. Commit.

### Task 8: Contextual Use/Action button
**Likely files:** interaction/UI runtime and relevant Homey/CTM tests.

1. Identify existing proximity/action eligibility calculation.
2. Make Use/Action visible only for a currently usable nearby interaction in the current world/mode.
3. Hide promptly when leaving radius, changing worlds, changing mode, or losing eligibility.
4. Respect vehicle-only Homey garage entry and on-foot house/wardrobe/dungeon rules.
5. Test just inside/outside range, competing prompts, transition, and mode changes.
6. Commit.

### Task 9: Correct reversed vehicle steering
**Likely files:** shared vehicle steering/input mapping and input tests.

1. Trace the underlying steering sign/mapping instead of compensating in the UI.
2. Correct left/right for keyboard, touch/mobile, and controller/gamepad paths.
3. Verify forward and reverse behavior and every vehicle type sharing the handler.
4. Ensure walking/camera controls are not inverted as a side effect.
5. Add regression tests for left and right turn direction.
6. Commit.

### Task 10: Remaining approved vehicle/world detail pass
**Likely files:** vehicle sizing/scene detail modules and tests.

1. Normalize limo scale relative to the other vehicle fleet.
2. Confirm landscape-edge/fencing treatment on City and island boundaries.
3. Confirm City Island and Homey Island have intended full scenery/detail and future islands retain quality but remain intentionally empty beyond basic terrain/coverage.
4. Verify active vehicle/character persistence through all updated CTM routes.
5. Commit.

### Task 11: Consolidated verification and handoff
**Files:** tests, handoff documentation.

1. Run focused tests for every changed subsystem.
2. Run existing graphics quality, engine/system, HTML package/Chromium, Babylon preview, and gameplay watchdog checks that are available in the repo/workflows.
3. Re-run any failed test after diagnosis; do not mask failures or alter timeouts without understanding the cause.
4. Perform visual Android-sized acceptance for Homey interior, tight-space camera, bridge, wardrobe, Electric Lemonade, and vehicle steering.
5. Update the persistent handoff with branch, PR, commit SHAs, exact test results, preview URLs, known limitations, and next actions.
6. Request code review before claiming completion.
7. Commit handoff only after verification results are recorded.

## Commit discipline
Keep commits logically grouped by task. Do not merge the PR without explicit user authorization. If implementation reveals a cross-task dependency, preserve the dependency in commit order and update this plan/handoff rather than silently changing scope.
