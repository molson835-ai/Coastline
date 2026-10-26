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
This change is on a follow-up branch and must not be treated as merged or deployed until CI and normal-profile device verification pass. PR #123 (vehicle materials/collision) remains separate and unmerged.
