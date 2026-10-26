# Homey Island Garage — implementation handoff (2026-10-26)

## User-approved scope
- Homey Island's open garage bay transitions instantly into a separate interior through the existing Coastline Transition Manager (CTM). No visible bridge or travel animation.
- Entry and exit are activated only when the player's vehicle physically crosses the open threshold in the intended direction. On-foot movement must never trigger the transition.
- Entry preserves the selected vehicle, appearance, and vehicle index, and places it inside facing the open door. Exit returns the vehicle just outside the entrance, facing outward.
- The interior should feel like a state-of-the-art collector/workshop garage: sealed showroom floor, architectural LED lighting, premium cabinets/workbench, service-bay guides/lift pads, and a physical key board.
- The player must exit the vehicle and approach/use the key board on foot. The chooser offers supported vehicle models and paint colors, with cancel leaving the current vehicle untouched.
- Confirming a selection replaces the garage vehicle's visual with the selected model, applies paint only to the model's body-role meshes, and leaves exactly one active player vehicle at the drive-out position. Glass, wheels, lights, trim, and other vehicles must retain their source materials.
- City and Homey scenery, CTM behavior, replacement-vehicle damage safety, and Android-oriented performance remain regression requirements.
- Do not merge or production-deploy this PR without explicit user authorization.

## Branch and implementation
- Branch: `feat/homey-garage-vehicle-selector`
- Added `coastline-homey-garage.js`: premium interior geometry, accessible chooser UI, paint palette, directional threshold-crossing predicate, and key-board access predicate.
- Extended `coastline-world-transitions.js`: registered `homey-garage` with CTM; added `island-to-homey-garage` and `homey-garage-to-island` transitions; added vehicle threshold detection, on-foot key-board prompt, model/paint swap, and test diagnostics.
- Updated `game-v3.html` collision checks to use the garage's interior wall boundaries.
- Follow-up collision audit found the existing villa garage header was incorrectly marked as a solid ground-level collider. Its collision flag is now disabled so the open vehicle threshold remains traversable; the browser regression explicitly checks the threshold at `(483, 488)` is not blocked.
- Updated `coastline-sw.js` to cache the new module and bump cache generation from v58 to v59.
- Updated `scripts/build-itch.mjs` so the new module is included in the standalone package.
- Added `tests/homey-garage.spec.mjs` and extended `tests/ctm-browser-regressions.spec.cjs`.
- Added the unit test to `npm run test:engine`.

## Critical implementation details to verify
1. Garage interior is positioned at world coordinates around x=483, z=500, aligned to the existing Homey villa garage opening at z=488. Drive-out spawn is x=483, z=500; exterior return is x=483, z=484.
2. The threshold predicate requires a tracked previous vehicle position and a crossing from one side to the other, within the garage's x corridor and with the correct heading. Merely being near the threshold does not transition.
3. CTM carries the same vehicle object/index through entry and exit. The hidden avatar is moved with the active world root as well so disposal of the source root cannot dispose the character model.
4. The chooser is available only on foot, inside the garage, within reach of the board. Cancel closes the UI without applying a swap.
5. The swap clones an existing RGSDev model visual and clones its materials before recoloring body-role meshes. It intentionally clears procedural damage-part aliases on the replacement visual so a severe collision cannot detach the full body.
6. The itch package and service worker must both include `coastline-homey-garage.js`; a missing dependency must fail packaging rather than silently break the runtime.

## Validation status at handoff
- Unit tests and browser tests have been authored but have **not yet been run against the current branch head**.
- No claim is made that the browser suite, itch package, Babylon preview, or physical Android test has passed.
- Next gates: create/update the PR, wait for exact-head GitHub Actions, inspect all failed checks, fix failures on this same branch, run the package and browser gates, verify the preview on desktop and Android, and only then report merge readiness.
- If any failed tests are stale contracts rather than runtime bugs, inspect the actual runtime behavior before changing assertions. Do not weaken the existing city/Homey scenery or vehicle-material invariants to make tests green.

## Latest known base
- PR #125, “Consolidate vehicle visuals and stale-cache recovery,” was merged to main per the preceding project handoff at commit `29e7edaec976bf2cd12a6cb74a9463811dd4c40c`.
- The post-merge Vercel status check on that SHA reported success. The GitHub workflow-run lookup returned no PR-triggered runs for the merge SHA, so this does not substitute for the next PR's full CI.
