# Coastline service-worker cache recovery — 2026-10-26

## Incident
After the 2026-10-26 consolidated world/transition merge, the normal Android browser showed missing city roads, buildings, and scenery. The same game appeared correct in an incognito tab. That strongly implicates stale browser/service-worker cache state, although it does not by itself prove every missing object came from cache.

## Change prepared
- Bump the static cache generation from `coastline-static-v57` to `coastline-static-v58`; the existing activation handler removes older cache generations.
- Fetch JavaScript/module, CSS, and JSON runtime resources network-first with `cache: 'reload'`, updating the active cache after a successful response and falling back to the cache only if the network request fails.
- Keep other static assets cache-first for offline resilience and to avoid unnecessary repeated downloads.
- Add a regression test for cache versioning, runtime network refresh, fallback behavior, and continued cache-first treatment of non-runtime assets.

## Validation required before merge
1. Run the full engine and browser CI suites.
2. Test a regular Android browser profile after the new service worker activates, not only an incognito profile.
3. Confirm City Island has its roads/buildings and Homey Island has its intended full scenery.
4. Cross the bridge City → Homey → City and verify content is neither blank nor duplicated.
5. Verify offline fallback for previously cached runtime modules.

## Safety / release status
This consolidated follow-up includes PR #123 vehicle material/collision corrections together with the service-worker cache refresh. It must not be treated as merged or deployed until CI and normal-profile device verification pass.


## Follow-up diagnostic — runtime road culling (2026-10-26)
- User tested the fresh Vercel preview at `dpl_H7Xox6f2Nmiddr7AKDJjqurdHUry`: car appeared black, but city scenery still looked unchanged/missing. Diagnostic report: 25s runtime, Android 10 / Chrome 155, position x=-116.39 z=-545.65, 60 FPS, no reported JS errors, buildings=48, vehicles=73, pedestrians=16, trees=74. Culling reported 13 detailed + 34 proxy buildings.
- The preview was confirmed to serve `coastline-static-v58` and the vehicle asset script no longer forces orange paint. Therefore cache refresh alone did not resolve the city appearance.
- Root-cause candidate found in `coastline-runtime-fix.js`: `spatialBudget()` hides meshes based on distance from each mesh's matrix-world origin. Long grid-road meshes and many static road details are centered at the world origin even when their geometry extends to the player, and several lacked the `coastlineRoadLayer` exemption.
- Follow-up fix on this PR branch tags grid roads, grid markings, sidewalks/curbs/drains, regional road markings/median, rails/ties, and creek as `coastlineRoadLayer` and `coastlineAlwaysVisible`, so center-point budgeting cannot hide those long static networks.
- Added `tests/road-render-budget.spec.mjs` to `test:engine`. Engine CI passed 63/63 tests including both new road visibility regression checks; system tests passed. At last status check, browser-smoke-test and package-html5 were still running.
- New isolated Vercel preview built from commit `e32d0e23acd42892889bba9e66f0c3fe48d1ce7a`: https://coastline-babylon-beta-94uto2vfw-molson835-3446.vercel.app
- Still requires user visual verification on Android: confirm grid roads/cross streets and regional roads remain visible around spawn and when driving away from world origin; verify buildings and vehicle appearance. No merge or production deployment authorized/completed.
