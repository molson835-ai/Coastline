# CTM / World 2 browser-debug findings — 2026-10-22

## Verified root causes from PR #87 watchdog traces

1. **CTM browser bridge serialization stall** — `window.__coastlineTransitionTest.transition()` returned the raw Three.js world handle. Playwright serialized the handle's `parent -> Scene -> City root` graph, producing ~63s to ~101s evaluate calls and causing the CTM browser tests/workflow to time out/cancel. The transition itself completed; the returned object was the serialization bottleneck.
2. **World 2 collision-scope bug** — CTM correctly toggled `window.__coastlineWorld2Active`, but `game-v3.html`'s `buildingBlocked()` did not consult that flag. Vehicle movement at the World 2 spawn was therefore still blocked by cached City collision arrays even though City was hidden. This contradicted the intended isolated collision scope.

## Minimal fixes applied on PR #87

- `game-v3.html` now bypasses cached City `buildingBlocked()` collision checks while `__coastlineWorld2Active` is true. This is appropriate for the current blank World 2 shell; future World 2 collision geometry should replace this bypass with world-local collision data.
- The browser-only CTM transition bridge now awaits the real transition but returns only the serializable CTM status object, preventing Three.js scene-graph serialization.

## Verification status

- Before fixes: 36+ existing gameplay regression tests passed, including cash persistence and NPC world-slice coverage; the two CTM browser tests were the remaining blockers.
- Fix commit: `bf7a0e700a842a1172d14d57aaa7d695ea46ec94`.
- Full post-fix CI is still required before merge. Do not treat the CTM as merge-ready until the targeted CTM tests and the full browser gate pass.


## Latest exact-head verification — 2026-10-22 (US Eastern; workflow logs 2026-10-23 UTC)

- **Workflow:** [CTM targeted verification run 39884933989](https://github.com/molson835-ai/Coastline/actions/runs/39884933989)
- **Tested SHA:** `d34b65ea20ae76e5094c76e4b949a2e5d47c12a4`
- **Result:** **5 passed, 1 failed**; full gameplay gate was skipped after the focused failure.
- **Artifact:** [ctm-targeted-verification / artifact 12472516510](https://github.com/molson835-ai/Coastline/actions/runs/39884933989/artifacts/12472516510)
- **Only failure:** `tests/transition-manager-browser.spec.cjs:30` — test “live game runtime exposes the CTM bridge and returns to the preserved City state” expected position `{ x: 500, z: 500 }`, while the new configured `world2Spawn()` is `{ x: 500, z: 400 }`.
- **Interpretation:** A stale hard-coded test assertion conflicts with the intentionally updated spawn beyond the bridge. Update the test to read `window.__coastlineTransitionTest.world2Spawn()` (or the shared spawn definition); do not blindly revert the runtime spawn to `z=500`.
- **What passed:** active vehicle visible/movable after World 2 activation; automatic City ↔ World 2 bridge-end trigger test; world runtime City → World 2 → City test using the newer spawn; failed World 2 load cleanup/retry; bridge prompt proximity/facing behavior.
- **Important non-result:** These are focused browser tests, not a complete passing gameplay run or a human Android playtest. The original user's physical-bridge issue remains **unaccepted/unproven** until the full gate and fresh exact-head playtest pass.
- **Cleanup caveat:** The workflow's final cleanup step removed `.github/workflows/ctm-targeted-verification.yml` in the ephemeral Actions checkout, but the attempted push to `feat/ctm-world2-live-integration` failed with a non-fast-forward `fetch first` error. Inspect the remote branch before assuming the temporary workflow file was removed.

### Next steps, in order

1. Fix the stale expected-spawn assertion in `tests/transition-manager-browser.spec.cjs`.
2. Confirm/clean up the temporary verification workflow on the remote branch if it still exists.
3. Re-run all targeted CTM browser tests, then the full gameplay browser gate and relevant system/engine/package checks on the **same exact SHA**.
4. Re-check the City-side return spawn, mesh descendant visibility after spatial-budget reparenting, and World 2 local collision ownership.
5. Do not merge PR #87 or present the old Vercel deployment as a fresh beta. Publish/test the exact corrected head first.

## CTM repair follow-up — 2026-10-24

### Confirmed defects addressed in the isolated repair branch

- **Destination spawn was not applied during the first City load.** `cityWorld.load()` previously made the cached City root visible but did not apply the fixed `destinationSpawn`. It now applies the source snapshot and fixed destination as part of load, before CTM activates the City.
- **Saved world state could overwrite fixed bridge spawns.** The island's `restoreState()` previously ignored `destinationSpawn`, so a saved island snapshot could replace the configured bridge arrival at z=290 with the older island start at z=420. Island restoration now reapplies the fixed destination after restoring saved state. City restoration already accepted a destination spawn; its first-load path is now consistent.
- **Bridge auto-transition depended on a fragile frame-to-frame crossing sample.** The periodic prompt updater could replace the prior z sample before a crossing was observed. Automatic transitions now use a directional end-zone check around the physical bridge endpoint, with the car facing along the outward bridge direction. The City-side approach is explicitly oriented toward the island. The arrival heading faces back into the destination world, preventing an immediate reverse transition.
- **City collision probes were globally disabled whenever the island was active.** The bypass is now restricted to the island footprint and its bridge approach (x 380–620, z 280–620). City building, tree, lamp, sign, and traffic-signal collision probes remain active at City coordinates while the City root is resident but hidden.
- **Added a regression assertion** that a fixed City arrival does not immediately bounce back to the island.

### Vercel safety guard

The repository's Git integration automatically created previews on branch pushes. A branch-specific `vercel.json` guard now disables automatic deployments for `fix/ctm-bridge-*` and `feat/ctm-world2-live-integration`. Keep this guard in place while the CTM browser tests are being repaired. Remove it only when the user authorizes a Vercel preview after the required test gates pass. The four already-created intermediate previews are not verification results and must not be presented as a tested build.

### Verification status — do not overstate

- Latest pre-repair browser run: **35 passed, 7 failed** (workflow run 40047532130; tested merge commit 3aca545b8dc061b267db37b963e18a90813ff341).
- The source and regression-test changes in this follow-up have **not yet been executed by the browser suite**. Treat them as unverified until CI runs against the exact resulting head SHA.
- Required next gates: run the seven CTM/collision failures, then the complete browser suite, engine tests, system tests, vehicle tests, and itch package check. Confirm exact commit SHA for every result.
- Do not merge PR #87 into the default branch, do not publish a Vercel preview, and do not ask for Android playtesting until the full test gate passes. After tests pass, get user acceptance of a fresh preview and verify the physical round trip: populated City → physical bridge → island → return bridge → populated City, with no blank world, collision bypass, or spawn inside a building.
