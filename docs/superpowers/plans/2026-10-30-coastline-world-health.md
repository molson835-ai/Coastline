# Coastline World Health System — implementation plan

Base: `64055fbcb37277b4145ea6cd39fcd3e96ef90597` on `qa/pr-144-validation-recovery`.

## Goal
Add a low-overhead diagnostic service for the existing Three.js runtime that can distinguish a loaded game shell from a genuinely populated/renderable City world. It must expose structured evidence for terrain, roads, buildings, visibility, materials/textures, renderer/context, camera, and failed asset requests.

## Scope
- Add a dependency-free browser module with a pure scene scan and an optional opt-in overlay.
- Tag City building root groups; reuse existing road and terrain tags.
- Install the diagnostic service after City world creation and CTM initialization.
- Expose `window.__coastlineWorldHealth.scan()` and `.report()`; support `?worldHealth=1` for an on-screen diagnostic panel.
- Add the module to the service-worker precache and bump the cache version.
- Add Node tests for populated, missing-content, hidden-root, renderer, and asset-failure cases.
- Add the test to the existing CI engine-test command.

## Approaches
1. Console-only diagnostics: lowest UI cost, but inconvenient on mobile and easy to miss.
2. Always-on HUD: visible but adds permanent UI/per-frame overhead to normal play.
3. On-demand scan API plus opt-in overlay: useful in desktop DevTools and phone preview URLs without changing normal gameplay. **Selected**.

## Constraints / non-goals
- Three.js/WebGL only; do not add Babylon.js.
- No gameplay changes, steering/camera adjustments, population-cap changes, cache workarounds, or quality reductions.
- No automatic repair or world mutation; report evidence only.
- Do not merge or deploy.
- A healthy diagnostic report is not a substitute for visual inspection or Android phone acceptance.

## Acceptance
- Unit tests prove correct classification and degraded/failure states.
- The browser API is installed only after the world roots and renderer exist.
- Service worker precaches the new module under a new cache version.
- CI runs the new tests.
- Report clearly distinguishes hard failures from warnings and includes scene counts, render stats, material/texture state, camera/renderer state, and captured asset request failures.
