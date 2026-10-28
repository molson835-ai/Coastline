# Coastline Cave, Bridge, and Island Boundaries Implementation Plan

> **For agentic workers:** Follow this plan task-by-task with test-first development. Keep all work on `feat/coastline-cave-island-boundaries`; do not merge or deploy.

**Goal:** Deliver one reviewable PR that fixes Homey vehicle grounding and garage interactions, makes bridges and CTM traversal reliable, establishes natural island/water boundaries, and rebuilds the cave-island lemonade experience with tasteful extra visual polish on Homey and cave islands.

**Architecture:** Keep scene rendering, deterministic movement eligibility, vehicle grounding, and CTM transition lifecycle as distinct responsibilities. Extend existing island/transition/garage/adventure modules and make only narrow runtime integration edits in `game-v3.html`; add regression tests before each behavior change.

**Tech Stack:** JavaScript ES modules, Three.js, Node built-in test runner, Playwright, existing npm scripts.

**Spec:** `docs/superpowers/specs/2026-10-27-coastline-cave-island-boundaries-design.md`

## Global Constraints

- Free-only tooling/assets; no paid APIs or subscriptions.
- Do not merge or publish/deploy without explicit user authorization.
- Preserve `game-v2.html` as fallback/reference.
- Avoid broad rewrites of `game-v3.html`; use small integration hooks.
- Shallow-water secret routes are walkable on foot only; reject vehicles.
- Preserve CTM as sole transition lifecycle authority and preserve selected vehicle/appearance/position coherently.
- Keep the 1,000 CB starting cash, 10 CB lemonade price, bounded glow, and five-minute rocket boots.
- No new missions, landmark discovery messages, weapons, or apartment-reference GLB chunks.
- Improve visual quality without globally downgrading visuals; keep simulation/population budgets bounded.
- One PR is the target, subject to actual diff/review size checks.

## Review Focus

- A player or car touches bridge rails: cars should remain on the deck and continue moving rather than hard-stop; pedestrians must not jump over the barrier.
- A vehicle enters Homey terrain or crosses the island root boundary: grounding must use the correct local/world elevation, not a global offset.
- The player approaches a garage on foot versus in a vehicle: only the valid vehicle state can enter; on-foot swapping must not allow walking through vehicle bodies.
- A player approaches a shallow-water path in a vehicle: reject the path while keeping the same path walkable on foot.
- A player crosses a bridge endpoint during/after a CTM transition: handoff occurs once, with no manual prompt, duplicate player/vehicle, or stale model flash.
- A vendor interaction is attempted while distant or facing away: no transaction; close proximity plus facing opens it.
- A player buys lemonade with 9 CB versus 10 CB: 9 CB causes no mutation; 10 CB charges exactly 10 CB and activates the intended effects.
- A cave approach intersects decorative rocks or mountain meshes: visual terrain must not accidentally block the authored walk/drive route.

---

### Task 1: Add deterministic island movement and water-depth contracts

**Files:**
- Modify: `coastline-island-regions.js`
- Test: `tests/coastline-island-regions.spec.mjs`
- Test: add focused cases to a dedicated island traversal test if the existing manifest test becomes overloaded.

**Interfaces:**
- Keep `isCoastlineIslandPointInside(x, z, regionId)` compatible.
- Add a small pure helper for traversal eligibility/depth bands (final name should be stable and documented in tests), distinguishing on-foot shallow paths from vehicle movement.
- Region and water rules must be deterministic and not depend on scene mesh collision.

- [ ] Write failing tests for irregular shoreline membership, bridge-landing exceptions, shallow-water depth classification, on-foot allowed, vehicle rejected, deep-water rejected, and non-finite coordinates rejected.
- [ ] Run the focused Node test and confirm the new assertions fail.
- [ ] Implement the minimum deterministic helpers and authored region data.
- [ ] Re-run the focused tests and existing island manifest tests.
- [ ] Commit the isolated island movement contract.

### Task 2: Fix Homey Island vehicle grounding and garage collision/entry

**Files:**
- Inspect/modify: `coastline-world-transitions.js`
- Inspect/modify: `coastline-homey-garage.js`
- Inspect/modify: `coastline-vehicle-sizing.js` only if grounding requires a small shared helper
- Minimal integration: `game-v3.html`
- Test: `tests/homey-garage.spec.mjs`
- Test: `tests/ctm-browser-regressions.spec.cjs` where runtime behavior is involved

**Interfaces:**
- Keep existing garage threshold helpers compatible unless tests prove a narrow extension is needed.
- Use actual active-world ground/bridge functions for vehicle Y; no global height offset.
- Garage contextual entry remains vehicle-only; chooser/vehicle selection is on-foot-only inside the garage.

- [ ] Add failing tests for Homey spawn and driving ground height, transitions to/from Homey, garage entry prompt eligibility, and vehicle-body collision during on-foot selection.
- [ ] Run focused tests and capture expected failures.
- [ ] Trace world-root elevation and vehicle placement; implement a shared active-surface grounding path.
- [ ] Add collision handling that prevents walking through parked/selectable garage vehicles without blocking intended player exit/entry or chooser use.
- [ ] Fix Homey garage contextual action parity with City and verify invalid on-foot entry does not transition.
- [ ] Run Homey garage and CTM browser regressions.
- [ ] Commit the grounding/garage behavior.

### Task 3: Make bridge movement continuous and transitions automatic

**Files:**
- Modify: `coastline-world-transitions.js`
- Minimal integration: `game-v3.html`
- Test: `tests/coastline-rope-bridge.spec.mjs`
- Test: `tests/ctm-browser-regressions.spec.cjs`

**Interfaces:**
- Keep `coastlineRopeBridgeDeckY(baseY, t)` as the shared visible/vehicle deck profile.
- Keep `window.__coastlineBridgeGroundY` and any test hooks compatible.
- CTM performs transition lifecycle; bridge traversal does not require a user-facing transition button.

- [ ] Add failing tests for rail-contact movement, pedestrian edge containment, bridge deck grounding, and automatic transition at both ends without a prompt.
- [ ] Run focused tests and confirm failure.
- [ ] Separate visual rope/rail meshes from movement barriers; tune vehicle side constraint to keep the vehicle envelope inside the deck without treating visual contact as a hard stop.
- [ ] Add a pedestrian-only high barrier or equivalent movement bound that cannot be jumped over but does not block walking along the bridge.
- [ ] Make bridge crossing invoke the existing CTM automatic handoff exactly once; preserve the vehicle and heading/position through the transition.
- [ ] Run bridge unit and browser regression tests, including round-trip crossings and no duplicate vehicle hierarchy.
- [ ] Commit bridge/CTM behavior.

### Task 4: Natural island boundary scenery and graduated ocean

**Files:**
- Modify: `coastline-island-regions.js`
- Modify: `coastline-world-transitions.js`
- Minimal integration: `game-v3.html` if the active-world movement gate lives there
- Test: `tests/coastline-island-regions.spec.mjs`
- Test: `tests/coastline-rope-bridge.spec.mjs`

**Interfaces:**
- Use deterministic authored region boundaries for collision and use separate meshes for the visible edge.
- Keep intended roads and bridge approaches open.

- [ ] Add failing tests for each authored bridge corridor remaining open, each island rejecting out-of-bounds movement, and shallow/deep water movement rules.
- [ ] Implement irregular island contour variants and non-playable edge scenery using reusable low-draw-call meshes/instances where practical.
- [ ] Add a restrained series of graduated blue depth bands from shore to deeper ocean; do not create extra active simulation.
- [ ] Keep foot-only secret paths separate from vehicle routes and block vehicle bypass.
- [ ] Run focused region and bridge tests; inspect geometry naming/collision contracts for unintended blockers.
- [ ] Commit boundary and water visuals/logic.

### Task 5: Rebuild cave mountain, approach paths, and Electric Lemonade stand

**Files:**
- Modify: `coastline-island-regions.js`
- Modify: `coastline-electric-lemonade-adventure.js` only for new pure interaction eligibility or state behavior
- Minimal integration: `game-v3.html`
- Test: `tests/electric-lemonade-adventure.spec.mjs`
- Test: create/update a cave/vendor browser regression in the existing Playwright test suite.

**Interfaces:**
- Keep `ELECTRIC_LEMONADE_PRICE_CB === 10`, `ROCKET_BOOTS_DURATION_MS === 300000`, and `createElectricLemonadeState` purchase/expiry semantics.
- Vendor interaction requires both distance and facing checks; visual meshes do not decide purchase accounting.
- Use the current approved GLB pedestrian model already supported by the project; do not load apartment reference chunks.

- [ ] Add failing tests for vendor proximity/facing gates, exact price, insufficient balance, glow lifecycle, five-minute boost expiry/reset, and CTM safety.
- [ ] Run the focused Node tests to confirm new assertions fail.
- [ ] Replace the Waterfront resort/large building and cave obstruction with a compact mountain/cave formation; ensure a clear cave opening, outdoor terrain, paths to both bridge approaches, and reserved exploration space.
- [ ] Replace the old cave-island pedestrian with the current GLB character asset using the existing asset-loading path.
- [ ] Rebuild the stand with visible wood planks/joints, counter, vendor behind counter, pitcher/glasses, bright lime-green glowing lemonade, and a small freestanding price sign.
- [ ] Add close-range, facing-aware vendor interaction and a transaction UI for purchase/consume; ensure distant or back-facing states do not show or activate it.
- [ ] Keep all visual cave/mountain pieces out of the authored walking/driving corridor; remove any old low obstruction beneath the entrance.
- [ ] Run the Electric Lemonade Node tests and browser regression.
- [ ] Commit cave/vendor experience.

### Task 6: Extra visual polish for Homey and cave islands

**Files:**
- Modify: `coastline-island-regions.js`
- Add focused visual-contract assertions to `tests/coastline-island-regions.spec.mjs` or the cave/vendor Playwright spec.
- Minimal integration: `game-v3.html` only if needed to correct material/shadow ownership.

**Visual improvements authorized by the user:**
- Homey: add cohesive neighborhood landscaping—varied tree/shrub groupings, garden beds, uneven ground-cover clusters, subtle lawn/soil transitions, path/curb edge details, and small residential props that make spaces look lived-in. Keep roads, doorways, garage approaches, and bridge corridors readable and open.
- Cave island: layer rock sizes/material tones, add natural ledges and rubble around (not inside) the cave mouth, ground cover and coastal plants, a clearer footpath/drive route, and subtle shoreline/rock transitions. Maintain a visible silhouette and readable cave entrance.
- Reuse existing Three.js materials/geometries and instancing when possible; avoid new external assets, expensive per-frame logic, large extra draw-call counts, and visual clutter.

- [ ] Add failing source/scene contract assertions for required named scenery groups and non-blocking approach corridors.
- [ ] Run focused tests to confirm failure.
- [ ] Add static scenery with deterministic placement and bounded object counts; no new simulation loops.
- [ ] Verify decorative colliders are omitted unless required, and that visual density does not block navigation.
- [ ] Run region, garage, cave, and browser tests.
- [ ] Commit visual polish.

### Task 7: Regression sweep, packaging, and PR readiness

**Files:**
- Fix only issues revealed by tests in the modules above.
- Update this plan's completion checkboxes and project handoff/recovery notes with final state and remaining physical acceptance needs.

- [ ] Run `npm run test:engine`.
- [ ] Run `npm run test:systems`.
- [ ] Run `npm run test:vehicle`.
- [ ] Run `npm run test:gameplay`.
- [ ] Run `npm run package:itch`.
- [ ] Inspect PR diff size, changed-file count, accidental generated output, and whether the single-PR scope remains reviewable. If a genuine hard limit is reached, stop and report the evidence before splitting.
- [ ] Verify CI on the exact final head and identify any skipped/environment-blocked checks.
- [ ] Create one draft PR with acceptance criteria, test results, known limitations, and explicit note that physical Android acceptance remains outstanding.
- [ ] Do not merge or publish until the user authorizes it.

## Self-review coverage

- Vehicle grounding and garage interaction: Task 2.
- Bridge side guidance, pedestrian barrier, automatic CTM crossing, continuity: Task 3.
- Natural contours, boundaries, depth bands, foot-only water: Tasks 1 and 4.
- Cave mountain, cleared approach, GLB vendor, transaction and effects: Task 5.
- Added Homey/cave visual corrections: Task 6.
- Regression and single-PR size guard: Task 7.
- Review-focus inputs are assigned to the task that owns the behavior; include both pure Node tests and browser-level checks where runtime integration matters.
