# Coastline — CI Recovery Checkpoint — 2026-10-21

This supplemental checkpoint preserves material Coastline state discovered or repaired during the 2026-10-21 continuation so it does not live only in chat.

## Repository state

- Repository: `molson835-ai/Coastline`
- Branch: `coastline-transition-manager-v1`
- PR: #77, `CTM v1: transition manager foundation`
- Base: `coastline-fidelity-core`
- Latest branch head: `70d83e68a894bc8b4d974f6388a921998f8273c1`
- PR remains draft/open. No merge or production promotion authorized.
- Vercel deployment/status for this SHA is successful; this is deployment evidence only, not gameplay/CI evidence.

## Recovered durable architecture and constraints

- Root beta is `game-v3.html` using Three.js 0.170. `/babylon/` is a separate experiment and must not be introduced into the root beta.
- CTM owns transition orchestration; versioned player-state handoff is explicit.
- CTM lifecycle: `IDLE → REQUESTED → PRELOADING → WARMING → READY → TRANSFERRING → ACTIVATING → RETIRING_OLD_WORLD → UNLOADING → COMPLETE`, with `FAILED`/`RECOVERING` paths.
- World 1 stays protected until the destination loads, warms, validates, restores state and activates successfully.
- World 2 is planned as the island/home reached by bridge/tunnel; World 3 is the mansion interior. Apartment rooftop/elevator and doorman/front-door transitions are future reusable gate patterns.
- CTM is not yet wired into `game-v3.html`; no playable World 2/3 gate or real destination-world factory exists yet.
- Preserve visual quality. Do not fix lag by reducing pixel ratio, shadows, bloom, near-field detail or authored fidelity. Optimize measured redundant work, active-world scope, streaming/culling, collision/AI and asset lifecycle.
- Browser CI is not physical Android/PS4 verification.
- Avoid unnecessary Vercel deployments because the project previously hit the free daily deployment limit.

## User-approved gameplay direction recovered

- Temporarily remove missions and landmark-discovery messaging from the free-roam presentation while the foundation is stabilized; underlying regression tests may remain until deliberately retired.
- Garage should be visually distinct from row homes, near the corner/curb, with vehicle-only proximity entry.
- Start parked outside the garage; increase starting cash.
- Steering remains corrected left/right with progressive turning; do not blindly reverse the sign again.
- Keep realistic visuals and the white authored sedan active.
- Long-term architecture loads independent world segments one at a time so the game can scale without every world sharing one active scene.

## Browser-test recovery ledger

1. NPC persistence test previously cleared localStorage through `addInitScript`, which also ran on reload and erased the state it was supposed to verify. It was changed to clear once before initial interaction and then reload without clearing.
2. Pedestrian collision was sensitive to moving traffic/road setup. It was moved to bounded quiet off-road ground; only test actors are relocated. Production collision is unchanged.
3. Vehicle steering regression used an unsafe/edge spawn and could observe zero displacement. It now uses a bounded central-road helper and waits for actual speed before measuring A/D heading deltas.
4. Broad synchronous browser-side world scans caused render-loop stalls and 90-second test timeouts. Spawn helpers now use bounded samples.
5. The walk-controls test was moved from dynamic road selection to deterministic open ground. The latest refinement checks four short cardinal corridors from `(-650,-500)` and selects one verified free of static objects, pedestrians and vehicles before exercising W/A.

## Latest repairs on CTM branch

- `f440db4a87e2e461d21660c83afab651e0be9692` — `test: make walk smoke corridor deterministic and bounded`
  - Test-only; production movement/collision/visuals unchanged.
- `8bef4d43675c7c12c446b2441d6747d4757fe127` — `test: make pedestrian collision progress assertion robust`
  - Test-only; replaces a brittle hard-coded NPC-Z polling threshold with actual player displacement, while retaining final collision-distance assertions.
- `70d83e68a894bc8b4d974f6388a921998f8273c1` — `test: use stable courier delivery probe`
  - Test-only. Production courier target is `(100,-50)` and accepts any point within 9 units. Test now uses `(100,-41)` inside the same delivery zone to avoid placing the camera exactly on the dense target-center prop intersection that stalled the browser smoke.

## Last completed CI evidence before these repairs

Run `39586051293` was against the PR merge ref containing `8a649b6`, not current head `70d83e68`.

- Engine/system/vehicle-fidelity/package jobs passed.
- CTM browser smoke tests passed.
- Browser shard 3 had 13/14 tests pass; the only failure was `tests/replayable-mission.spec.cjs` timing out after `setWalkPosition(100,-50,0)`.
- Shards 1 and 2 were also red on that older merge ref. Those results must not be treated as current-head evidence.

## Current verification state

- SHA `70d83e68a894bc8b4d974f6388a921998f8273c1` has successful Vercel deployment/status.
- Available GitHub check-runs currently show the Vercel check for this SHA. The new gameplay-watchdog Actions run has not yet been surfaced by the available workflow-run listing at checkpoint time.
- **Do not claim green CI yet.** Acceptance requires engine/system/vehicle-fidelity/package plus browser shards 1/2/3 passing on the same exact SHA.

## Next task

1. Verify the new `70d83e68` Actions run and inspect all three browser shards.
2. If any shard fails, use its exact current-head log/artifact before changing anything. Do not alter production visuals or movement to satisfy a test.
3. Once the exact SHA is green, refresh `docs/COASTLINE_HANDOFF.md` and the CTM plan with exact commit/run evidence.
4. Only then proceed to guarded CTM runtime smoke integration, followed by a real destination-world factory with explicit asset ownership/disposal and World-1 fallback.

## Recovery protocol

Before chat/context limits, record exact branch/head, changed files, test/CI evidence, known failures, approved decisions, deployment limitations, and anything unsaved. Chat text is not a durable project record.
