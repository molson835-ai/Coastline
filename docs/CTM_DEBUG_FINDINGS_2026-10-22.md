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
