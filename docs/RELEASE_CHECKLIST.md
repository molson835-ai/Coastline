# Coastline Release Checklist

Use this checklist for each release candidate. Record the commit SHA, browser, device, viewport, test run, and human tester feedback. A build is not declared ready until required automated checks pass and its specific human playtest checklist is prepared. Do not claim a human visual test was completed unless someone actually performed it.

## Automated gates

- [ ] Gameplay Playwright suite passes on the exact release-candidate commit.
- [ ] Mobile-control tests pass at a phone-sized viewport.
- [ ] No uncaught JavaScript errors during startup and core interactions.
- [ ] Road/junction elevation and terrain regression tests pass.
- [ ] Vehicle and pedestrian collision/state tests pass.
- [ ] Mission/activity start, completion, reward, and retry tests pass.
- [ ] Performance telemetry contract reports finite frame metrics, first-frame time, renderer counters, and entity counts; unsupported memory values are nullable.
- [ ] Deployment points to the intended commit and the live URL loads the expected build.

## Desktop human playtest

- [ ] Keyboard driving: accelerate, brake/reverse, steering, handbrake/drift if available.
- [ ] Keyboard on-foot movement, camera, vehicle entry/exit, and interaction.
- [ ] Road boundaries, intersections, hills, terrain, buildings, and vehicle collisions behave plausibly.
- [ ] Traffic lanes, turns, stops/yields, and collision avoidance (as implemented).
- [ ] Pedestrians move purposefully and evasive/impact/recovery reactions are visibly distinct.
- [ ] Activity can be discovered, started, completed, rewarded, and replayed without duplicate rewards.
- [ ] Pause/resume, HUD, diagnostic report, and browser console.
- [ ] Visual review for clipping, z-fighting, floating props, pop-in, and distracting effects.

## Mobile human playtest

- [ ] Test on an actual phone, not only desktop device emulation; record model/browser and screen size.
- [ ] Touch buttons are visible, correctly positioned, responsive, and do not scroll/zoom the page.
- [ ] Driving and on-foot controls work; entering/exiting vehicles remains possible.
- [ ] Check safe-area/edge spacing, HUD legibility, and whether buttons obscure the view.
- [ ] Drive across several intersections and from road to grass and back; look for clipping, floating, shaking, and collision gaps.
- [ ] Check traffic/pedestrian density and reactions from normal play distance.
- [ ] Record FPS/frame-time telemetry at startup and after at least five minutes of play.
- [ ] Check heating, stutter, memory/reload symptoms, and recovery after backgrounding/resuming.
- [ ] Complete and replay the current activity; confirm reward and upgrade/progression state persist as intended.
- [ ] Submit a bug report with diagnostic data for reproducible issues.

## Release decision

- [ ] All automated gates pass on the release candidate SHA.
- [ ] Human playtest checklist is prepared for this exact change set.
- [ ] Required human checks are completed or explicitly listed as outstanding; no untested visual claims.
- [ ] Known issues and rollback point are documented.
- [ ] License/attribution and third-party asset checks are complete for reused content.
- [ ] No unapproved paid service, API, or recurring cost was introduced.


## Initial mobile performance budget
These are targets to measure, not claims that the current game meets them. Calibrate on a physical Android device and desktop reference machine.

- Desktop: aim for 60 FPS and p95 frame time <= 20 ms during normal driving.
- Mid-range mobile: maintain at least 30 FPS, aiming for 45–60 FPS; p95 frame time <= 33.3 ms for the 30 FPS floor.
- First rendered frame: aim for <= 8 seconds on a representative mobile device; measure cold and warm loads separately.
- Report FPS, average/p95 frame time, load-to-first-frame time, draw calls, triangles, geometry/texture counts, entity counts, and JS heap where supported.
- Unsupported memory measurements must be marked unavailable, never zero. Watch for steadily growing memory during a 10-minute session.
- Track entity baselines before expanding the map; do not impose one universal entity ceiling across all devices.

## Human playtest checklist
### World and collisions
- [ ] Drive across multiple intersections; check shaking, gaps, floating road pieces, or abrupt elevation changes.
- [ ] Drive from road to grass and back; check terrain clipping, falling below ground, or hovering.
- [ ] Check building/prop collisions and whether the avatar stays grounded.
- [ ] Drive toward the city edge and note abrupt world boundaries or disconnected roads.

### Driving and controls
- [ ] Test acceleration, braking/reverse, low- and high-speed steering, and controlled drifting where available.
- [ ] Enter and exit several vehicles; confirm safe placement and re-entry.
- [ ] Test keyboard and real-phone touch controls, including simultaneous steering and throttle.
- [ ] Check camera, pause/resume, screen orientation, and control overlap.

### World activity and mission
- [ ] Observe traffic and pedestrians for two minutes; note stuck actors, odd pathing, and collision reactions.
- [ ] Start the courier job, follow its objective, complete it, and verify the +$500 reward.
- [ ] Start and complete the job again; verify replayability and correct cumulative cash.
- [ ] Play continuously for 5–10 minutes and watch for slowdown, errors, or memory growth.
- [ ] If something fails, use BUG REPORT and attach the copied diagnostics.

## Build-specific playtest handoff template
- Build URL:
- Commit / PR:
- What changed:
- Device/browser:
- Focused tasks:
- Known limitations:
- Automated checks and exact run URL:
- Human feedback:
