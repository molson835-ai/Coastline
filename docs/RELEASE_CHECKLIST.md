# Coastline Release Checklist

Use this checklist for each release candidate. Record the commit SHA, browser, device, viewport, test run, and human tester feedback. A build is not declared ready until required automated checks pass and its specific human playtest checklist is prepared. Do not claim a human visual test was completed unless someone actually performed it.

## Automated gates

- [ ] Gameplay Playwright suite passes on the exact release-candidate commit.
- [ ] Mobile-control tests pass at a phone-sized viewport.
- [ ] No uncaught JavaScript errors during startup and core interactions.
- [ ] Road/junction elevation and terrain regression tests pass.
- [ ] Vehicle and pedestrian collision/state tests pass.
- [ ] Mission/activity start, completion, reward, and retry tests pass (once activity progression is implemented).
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
