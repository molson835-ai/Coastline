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
- `coastline-asset-swap.js` now hides replacement vehicle roots while loading, prevents legacy vehicle flashes, exposes explicit readiness, applies orange starting paint, and records body/glass/wheel/light material groups.
- `tests/hero-vehicle-visuals.spec.cjs` now checks replacement mesh/material identity and orange body paint.
- `tests/ctm-browser-regressions.spec.cjs` now checks that City → Homey retains a complete replacement vehicle hierarchy and material groups.
- The island-content edit was reverted after review because it compressed/replaced too much of the existing authored Homey scenery. The original `coastline-island-regions.js` scenery is preserved pending a smaller targeted content-density patch.

## CI evidence
- Earlier engine run exposed one new assertion mismatch: the manager correctly included `renderReadiness: 'required'`; the test was corrected in commit `5741c6017ef145bc36ce67c5aa20c7910278ae9f`.
- Latest PR head currently continues through CI after the vehicle/browser regression additions. Do not call the PR green until the latest head's engine, gameplay, package, Babylon, and graphics checks are freshly verified.
- A previous gameplay watchdog run was cancelled during rapid PR updates; that cancellation is not a test failure.

## Remaining implementation gates
- Apply the sparse/developed content-density rule without rewriting existing Homey scenery.
- Verify two-way City ↔ Homey actor/state continuity on the latest head.
- Verify reusable door/garage policy and replacement-fleet chooser behavior.
- Verify exact perimeter/bridge boundaries.
- Run final full relevant CI suite.
- Perform Android-oriented visual/transition validation; desktop CI is not sufficient evidence for Android performance.
- Update this handoff again before the PR is presented for merge authorization.
