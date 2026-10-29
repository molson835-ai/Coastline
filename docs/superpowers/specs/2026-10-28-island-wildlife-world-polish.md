# Coastline Island + Wildlife + World Transition Polish

## Intent

Build the next focused gameplay/world-polish increment on top of merged PR #134. The goal is to make City Island feel intentional, make the new wildlife system useful and stable, and make the City/Homey/house/garage transition flow dependable without lowering visual quality.

## Goals

1. Finish City Island's vegetation identity: palms are the primary/only tree type there, while existing non-tree coastal plants may remain.
2. Integrate the new rideable wildlife foundation from PR #134 without duplicating active animals or breaking CTM/player state.
3. Make garage ↔ Homey house transitions and broader world transitions directionally correct, debounced, traversable, and state-safe.
4. Preserve the selected vehicle, paint, appearance, and active-player identity through transitions.
5. Fix first-vehicle-entry engine audio so sound starts on the first successful entry and recovers after browser/app suspension.
6. Preserve high visual quality and improve performance through bounded active-world simulation, instancing, lazy loading, and transition-safe cleanup rather than visual downgrades.
7. Add regression coverage for the above and keep Android playtesting as a release gate rather than treating desktop CI as proof of mobile performance.

## Non-goals

- No missions or landmark-discovery notifications.
- No weapons.
- No replacement of the working Homey exterior/garage architecture with a new system in this PR.
- No reduction of model/material/shadow quality as the primary performance fix.
- No claim that desktop CI proves Android frame pacing or handling.
- No merge or production promotion without explicit authorization.

## Anti-goals / failure conditions

- A transition that strands the player, duplicates the player vehicle, disposes the selected vehicle, or briefly flashes an obsolete vehicle model.
- Wildlife that can be ridden but cannot exit cleanly, remains active in inactive worlds, or overwhelms mobile simulation budgets.
- City Island trees that still read as generic/mismatched vegetation.
- Audio that still requires a vehicle exit/re-entry before becoming audible.
- Performance improvements achieved by simply removing the visual detail the game is intended to retain.

## Architecture decisions

### Island presentation

Keep island generation in `coastline-island-regions.js`. Use the existing region/theme model and active-island population budget. City Island receives a palm-only tree policy; non-tree coastal plants remain eligible. Repeated scenery remains instanced where practical.

### Wildlife

Keep the rideable wildlife contracts introduced by PR #134. Extend the existing loader/spawn path rather than creating a second animal controller. Shared assets remain reference-count/disposal safe, and inactive island wildlife is not simulated.

### Transitions

Keep `coastline-world-transitions.js` as the CTM/world orchestration layer and `coastline-homey-garage.js` as the garage threshold/interaction layer. Use a single threshold-crossing decision path with direction checks, hysteresis/debounce, and state transfer before source-root disposal.

### Audio

Fix the existing engine-loop lifecycle at the point where first vehicle entry becomes authoritative. The audio unlock path must work with mobile gesture restrictions and resume after visibility/page lifecycle changes.

### Performance

Profile before changing budgets. Prefer active-world simulation gating, instancing, lazy loading, and disposal over reducing visual fidelity. Add diagnostics that make object/animal/vehicle counts and transition cleanup observable.

## Acceptance criteria

- City Island contains no generic deciduous tree placements; palm trees are the only tree class there.
- Rideable wildlife from PR #134 remains functional and does not create duplicate active mounts.
- City ↔ Homey and Homey garage ↔ house round trips preserve player and vehicle state.
- Threshold crossings do not repeat while the player remains in the trigger zone.
- Garage vehicle entry remains vehicle-only; house entry remains on-foot-only.
- First successful vehicle entry starts engine audio without requiring a second entry.
- Inactive worlds do not continue full wildlife/vehicle simulation.
- Existing graphics-quality guards continue to pass; no intentional visual-quality downgrade is introduced.
- Exact-head CI passes before PR readiness is claimed; Android preview playtesting remains explicitly reported separately.
