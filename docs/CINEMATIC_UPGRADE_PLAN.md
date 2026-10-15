# Coastline — Cinematic Upgrade Program

The goal is not to copy another game's assets. The goal is to reproduce the architectural reasons modern open-world games feel convincing: layered simulation, believable proportions, material response, animation state blending, environmental density, streaming, and aggressive LOD.

## Phase 1 — Visual foundation
- Metric vehicle profiles and modular hard-surface construction.
- Human proportions and explicit animation states.
- Layered road, terrain, vegetation, architecture, and infrastructure detail.
- Distance-aware cinematic quality budgets.
- Service-worker caching for the visual modules.

## Phase 2 — Visible vehicle transformation
- Replace block vehicle geometry with profile-driven bodies.
- Add wheel/tire sidewalls, brake visibility, glass, mirrors, lamps, grille, seams, handles, and underbody silhouette.
- Add steering-wheel/front-wheel relationship and suspension pitch/roll cues.
- Use hero/near/mid/far LODs so detail is concentrated around the player.

## Phase 3 — Character transformation
- Replace rigid/block proportions with articulated human proportions.
- Blend idle/walk/run/jump/crouch rather than snapping states.
- Make crouch visibly compress hips/knees/spine.
- Add vehicle enter/exit pose states.
- Move distant pedestrians to low-cost pose proxies.

## Phase 4 — Cinematic environment
- Add repeated modular road furniture: mailboxes, hydrants, utility poles, drains, guardrails, signals, bus stops.
- Add material-specific weathering instead of random noise.
- Add continuous terrain transitions: lawn → brush → woodland → rock/water edges.
- Increase regional identity through land use and infrastructure rather than oversized landmarks.

## Phase 5 — Lighting and atmosphere
- Establish physical-ish key/fill/rim lighting hierarchy.
- Add time-of-day exposure changes and restrained fog/haze.
- Add wet-road response and localized light reflections where performance permits.
- Keep bloom/shadows adaptive and disable expensive effects first on slow devices.

## Phase 6 — World streaming and simulation
- Integrate simulation LOD and staggered scheduler into live actor updates.
- Stream world chunks around the player.
- Use spatial hashing for traffic, pedestrians, wildlife, and collision queries.
- Reserve full simulation for nearby actors; use active/proxy/far representations outside the gameplay bubble.

## Phase 7 — Cinematic polish
- Camera smoothing and vehicle body motion.
- Impact feedback, tire behavior, suspension response, and subtle camera response.
- Mission/HUD presentation remains event-driven rather than frame-loop driven.
- Audio hooks should be state/event based so sound can become richer without increasing per-frame work.

## Performance rule
Every visual upgrade must have a cheaper representation. Coastline should spend detail where the player can see it and spend simulation where gameplay can feel it. The target is cinematic perception, not brute-force polygon count.

## Deployment gate
A phase is considered launch-ready only after browser tests and engine tests are green and the live GitHub Pages build is verified. Open pull requests are not treated as deployed builds.
