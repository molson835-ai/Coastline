# Coastline — Known Issues

This file contains issues that have been important enough to preserve in project memory. Confirm current status in the actual repository/beta before treating an item as still reproducible.

| Issue | Status at memory snapshot | Notes |
|---|---|---|
| Render performance / lag | Active | Baseline was 17 FPS; renderer dominated at 53.2 ms. Architecture optimization is the priority. |
| High draw-call/geometry count | Active | 3,233 draw calls and 15,329 geometries in representative telemetry. |
| Green starter-vehicle flash | Targeted by Mega Patch 2 | Authored sedan must be authoritative; procedural fallback only on genuine load failure. |
| Steering reversal | Targeted by Mega Patch 2 | One authoritative steering command path required. |
| Steering too tight / progression regression | Targeted | Progressive/time-held steering must remain. |
| Sunset/distance readability | Targeted | Improve atmospheric separation/fill/near lighting without flattening the scene. |
| Stop signs/lights collision | Targeted | Collision proxies required. |
| Notification persistence | Targeted | Show, fade, hide after roughly 2–4 seconds; reappear on meaningful progress. |
| Crouch animation | Targeted | Needs authored/connected crouch behavior and blend. |
| Character visual detail | Roadmap | Current character quality has been below the desired realistic standard. |
| Ground/vegetation detail | Roadmap | Weeds, bushes, dirt patches and natural variation desired. |
| Audio-related performance concern | Needs fresh profiling | Previous playtest associated audio activation with increased lag/crash; do not assume causality without measurement. |

## Historical failure patterns
- Black-screen/crash regressions have occurred after runtime changes.
- Steering has repeatedly regressed to the wrong direction when competing control layers existed.
- Broad browser diagnostics once timed out and then attempted a repository mutation; diagnostics is now bounded/non-mutating.
- Stale tests once assumed fixed vehicle array positions even after the architecture became authoritative-player based.
