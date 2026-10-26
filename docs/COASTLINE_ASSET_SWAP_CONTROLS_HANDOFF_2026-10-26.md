# Coastline consolidated world/asset/transition handoff — 2026-10-26

## Current state
- **Main:** `86ce1c16cf1b891e76667c649fed6a6aa2bb48a8` (PR #121 merged).
- **Consolidated PR:** #122 — `feat/consolidated-world-asset-transitions`.
- **Current head:** tracked in PR #122; PR remains open and unmerged.
- **Merge/deploy:** requires explicit user authorization.
- **Design:** Approach A — shared world/asset infrastructure with world-specific content density.

## Approved scope
1. City and Homey receive intended authored scenery.
2. Future/unused islands remain terrain/basic coverage while sharing the same complete actor/render pipeline.
3. City ↔ Homey transitions preserve world identity, player/vehicle state, and valid return positions.
4. Home front door is on-foot only; garage is vehicle-only and uses the replacement fleet.
5. Homey gets playful house styling, large decorative rocks, and a waist-deep walkable pool.
6. Starting vehicle is orange with separate body/glass/wheel/light/trim material roles.
7. Existing population/performance protections remain; optimization must not strip intended visuals.
8. Full mansion interior content remains out of scope.

## Implemented in PR #122 so far
- `transition-manager.js` now formalizes world content density and render-readiness metadata, exposes world-definition inspection, and passes destination content contracts through activation/transition lifecycle events.
- Added `tests/consolidated-world-contract.spec.mjs` and included it in `npm run test:engine`.
- `coastline-asset-swap.js` hides replacement vehicle roots while loading, prevents legacy vehicle flashes, exposes explicit readiness, applies orange starting paint, and records body/glass/wheel/light material groups. A follow-up correction now prevents overlapping FBX role labels from allowing glass/wheel/light paint passes to overwrite the orange shell.
- `tests/hero-vehicle-visuals.spec.cjs` now checks replacement mesh/material identity and orange body paint.
- `tests/ctm-browser-regressions.spec.cjs` now checks that City → Homey retains a complete replacement vehicle hierarchy and material groups.
- Restored the full authored `coastline-island-regions.js` from `main` before applying a targeted content-density gate; existing Homey villa, garden, pool, landscaping, and collider details are preserved.
- Added explicit `contentDensity` to the four-island manifest: Downtown and Residential are `developed`; Waterfront and Port are `sparse`. Sparse regions retain terrain, shoreline/ocean, basic road coverage, and bridge geometry while skipping developed-world scenery and vegetation. Sparse-region bridge guardrails are now also registered in the collision metadata so those worlds do not expose an empty collider set.
- Preserved the approved Homey-specific playful facade panels and added large perimeter rocks while keeping the bridge landing gaps open.
- Follow-up fix: replacement vehicle paint now verifies the orange material on the actual body role and installs a visible orange shell material only when the FBX body materials cannot represent the requested paint.
- Follow-up fix: sparse Waterfront/Port roots now register shoreline collision-boundary segments with open bridge landing gaps, so sparse scenery does not mean an empty collision contract.

## CI evidence
- Earlier engine run exposed one new assertion mismatch: the manager correctly included `renderReadiness: 'required'`; the test was corrected in commit `5741c6017ef145bc36ce67c5aa20c7910278ae9f`.
- A gameplay watchdog run on the prior head failed on three actionable assertions: the bridge-source regex was coupled to compressed formatting, replacement FBX material groups were empty when model-part names were missing, and Waterfront expected developed-world mesh counts. The island source has since been restored, vehicle material-role inference now has bounds-based fallbacks, and the sparse-world smoke assertion was lowered to verify a usable root without requiring developed-scene density.
- The gameplay watchdog on `e186626c002d5c7b2a5d7ddf1137b3768e0ff4e9` isolated two remaining failures: orange paint was overwritten by overlapping FBX material-role matches, and sparse Waterfront/Port roots had no registered colliders. Both are now addressed in follow-up commits on PR #122; fresh CI was triggered on the latest head `71d8eee4567ba221f649c7a92eba0ebb208f9f7b` and must finish before calling the PR green. Do not merge until engine, gameplay, package, Babylon, and graphics checks are verified.
- A previous gameplay watchdog run was cancelled during rapid PR updates; that cancellation is not a test failure.
- Latest completed watchdog on head `e186626c002d5c7b2a5d7ddf1137b3768e0ff4e9` passed 50 tests but failed the orange body paint assertion and the Port active-collider assertion. Both fixes above are committed after that run; the new head must be tested before these issues can be considered resolved.

## Remaining implementation gates
- Verify two-way City ↔ Homey actor/state continuity on the latest head.
- Verify reusable door/garage policy and replacement-fleet chooser behavior.
- Verify exact perimeter/bridge boundaries, including that new perimeter rocks do not block bridge approaches.
- Run final full relevant CI suite on the latest head.
- Perform Android-oriented visual/transition validation; desktop CI is not sufficient evidence for Android performance.
- Keep PR #122 unmerged until all required gates pass and the user explicitly authorizes merge.
