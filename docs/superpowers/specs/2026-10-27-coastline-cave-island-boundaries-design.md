# Coastline Cave, Bridge, and Island Boundaries Design

Date: 2026-10-27
Status: Draft for user approval
Target branch: `feat/coastline-cave-island-boundaries`
Base: merged PR #131 (commit `18517d0a0c2ab3dafe209d839da6eb7359d88c26`)

## Intent

Deliver the agreed pending Coastline corrections as one reviewable pull request, provided the result remains within practical repository and review limits. Keep the published fallback recoverable, avoid broad rewrites of the monolithic game page, and preserve the existing CTM and gameplay contracts.

## Approaches considered

1. **One consolidated PR with isolated modules and test groups (chosen).** Keeps the requested features together while allowing each subsystem to be reviewed and tested independently. This is the user's preference, provided the diff remains manageable.
2. Split physics/boundaries from the cave and lemonade experience. Easier to isolate failures but would divide the requested changes across PRs and delay the complete result.
3. A broad rewrite of world generation and collision. Rejected because it would create unnecessary regression risk, obscure which change caused failures, and work against the project's incremental engineering constraints.

## Goals

### Vehicle and garage behavior
- Correct floating/sinking vehicles on Homey Island by tracing and aligning local terrain elevation, island root transforms, vehicle spawn/placement, and runtime grounding; do not apply a global vehicle-height offset.
- Prevent the player from walking through vehicles while selecting/swapping cars in the garage, without blocking intended entry/exit or vehicle selection.
- Make the Homey garage's contextual vehicle-entry action work consistently with City behavior: it appears only when the player is in a vehicle and within the valid proximity/threshold; no on-foot garage entry.
- Preserve selected vehicle identity, appearance, and coherent position through CTM transitions; prevent old models flashing during loads.

### Bridge and CTM
- Allow cars and pedestrians to cross the bridge continuously, without a user-facing button/prompt to trigger CTM during ordinary bridge traversal.
- Keep vehicles within the bridge deck lane. Visible rails must not stop a car merely because it touches a rail; use separate, appropriately tuned vehicle guidance/collision behavior.
- Add an invisible pedestrian barrier high enough to prevent jumping over the bridge edge while allowing normal bridge movement.
- Make City ↔ Homey and other configured bridge transitions automatic, reliable, and owned by CTM, without duplicate actors or stale scene objects.
- Keep bridge deck visual geometry and vehicle grounding on the same deck-height profile.

### Natural island boundaries and water
- Replace abrupt square/round landmass silhouettes with authored irregular shorelines and varied, natural-looking terrain profiles.
- Use coherent, non-playable world edges: natural hills/mountains/rocks and suitable fencing or landscape barriers where appropriate. Keep intended roads, paths, and bridges open.
- Show the ocean around island landmasses with graduated blue depth bands and a visible shallow-to-deep transition.
- Shallow-water secret routes are **walkable on foot only**. Vehicles must not enter those routes or use them as a bypass around the intended road/bridge network.
- Preserve clear distinction between traversable shallow water and non-playable deep water.

### Cave mountain and Electric Lemonade
- Replace the current cave-island resort/large building with a small mountainous natural formation, detailed outdoor cave terrain, and clear walking/driving paths to the bridges and around the island.
- Remove the obstructive structure beneath/in front of the cave opening; the cave entrance and approach must remain accessible on foot.
- Preserve space for future secrets without adding undisclosed missions or landmark-discovery popups.
- Replace the old pedestrian model on the cave island with the current approved GLB character model. Do not package or load the apartment reference GLB's three-part chunks.
- Build a visibly wooden lemonade stand with clear plank/detail work, a counter, vendor positioned behind it, pitcher and glasses containing bright lime/nuclear-green glowing lemonade, and a small price sign on a stick beside the stand.
- At close proximity and while facing the vendor/stand, show a clear transaction UI to purchase and consume Electric Lemonade. Do not trigger it from far away or when facing away.
- Preserve the established Electric Lemonade contract: price exactly 10 CB; insufficient funds have no side effects; purchase activates the bounded player glow for the cave/dungeon excursion; rocket boots last exactly five minutes with expiry/reset; CTM transitions must not duplicate or lose effect state; leaving the dungeon clears its temporary glow as currently designed.

## Constraints and non-goals

- One PR is preferred, but split only if an actual size or review constraint makes one PR unsafe. Report that constraint before splitting.
- Free-only tooling/assets; no paid subscriptions or APIs.
- Do not merge the PR or deploy/publish without explicit user authorization.
- Do not claim physical Android acceptance from automated tests.
- Keep `game-v2.html` as fallback/reference and published build recoverable.
- Avoid broad rewrites of `game-v3.html`; prefer focused modules and minimal integration points.
- No new missions, landmark-discovery messages, or weapons.
- Keep the existing world identities, player progression, and 1,000 CB starting cash.
- Keep visual fidelity; optimize unnecessary simulation/collision/render work rather than globally downgrading graphics.

## Implementation design

- Treat visual meshes and movement/collision boundaries as separate concerns.
- Reuse CTM as the sole transition lifecycle authority; bridge crossing should call its established automatic handoff path rather than introducing a second prompt-based transition path.
- Use deterministic island-region/shallow-water walkability checks and explicit bridge corridors. Keep vehicle and pedestrian eligibility separate so on-foot-only paths cannot be used by cars.
- Ground vehicles against the actual active region/bridge surface, including the correct local/world transform, rather than adding a global vertical correction.
- Keep changes focused in the island-region, world-transition, garage, vehicle-sizing/grounding, and Electric Lemonade modules. Add small integration hooks to `game-v3.html` only where needed.
- Replace the Waterfront resort with terrain and cave-access geometry; maintain clear bridge approaches and avoid blocking collision meshes.
- Keep purchase accounting in the existing Electric Lemonade state module and keep transaction UI/interaction eligibility explicit and testable.

## Acceptance criteria

1. Homey Island vehicles rest on the visible ground without floating or sinking at spawn and while driving across its varied terrain.
2. Garage vehicle selection cannot be walked through; contextual garage entry is available only in a valid vehicle/proximity state.
3. Cars and pedestrians traverse the bridge without a manual CTM prompt; transitions occur once and preserve player/vehicle state.
4. Vehicle rail contact does not abruptly stop the vehicle, but lane constraints prevent driving off the deck; pedestrian barrier prevents jumping off while allowing traversal.
5. Natural island boundaries block unintended exits without blocking intended bridges or roads.
6. Water depth is visually graduated; foot-only shallow paths are traversable on foot and reject vehicles; deep water remains non-playable.
7. Cave island is mountainous and naturally detailed, the old resort/large building and cave obstruction are gone, and paths remain clear.
8. Cave-island vendor uses the current GLB character; stand props and glowing lemonade are visibly present.
9. Transaction UI requires close proximity and facing; valid purchases deduct exactly 10 CB, invalid purchases do not mutate balance, and established glow/rocket-boot/CTM behavior remains correct.
10. No regressions to current island contracts, player/cash persistence, steering direction, CTM recovery, or fallback packaging.

## Verification plan

- Add/adjust unit tests first for vehicle grounding/region elevation, garage collision and contextual entry, bridge lane and crossing/automatic transition, shallow-water walkability versus vehicle rejection, natural boundary openings, vendor interaction gating, and Electric Lemonade accounting/effect lifetime.
- Run the focused Node test files for affected modules, then `npm run test:engine`, `npm run test:systems`, `npm run test:vehicle`, `npm run test:gameplay`, and `npm run package:itch`.
- Review changed-file count, total diff, and any generated bundle/package output before deciding whether one PR remains practical.
- Check CI on the exact PR head; report any skipped or environment-blocked tests explicitly.
- Physical Android acceptance remains a separate user/device check for bridge feel, vehicle grounding, visuals, frame pacing, and City ↔ island transitions.

## Builder decisions left open

The implementer may choose exact terrain contours, material colors, vendor positioning, and modest collision dimensions as long as the acceptance criteria are met. Any choice that changes player access, price/effect semantics, world connectivity, or requested one-PR scope requires user confirmation.
