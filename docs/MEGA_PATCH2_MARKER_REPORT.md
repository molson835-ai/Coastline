# Mega Patch 2 Marker Report

Updated: 2026-10-20

## Gate 1-2 runtime fixes

- **Sandbox mode is explicit and backward-compatible:** the public beta remains sandboxed by default; `?sandbox=0` enables courier missions and landmark rewards for regression tests.
- **Mission flow is gated consistently:** mission updates, mission HUD, replayability rewards, and landmark discovery respect the sandbox flag.
- **City Hall interaction:** on-foot interaction near City Hall starts courier work when sandbox mode is disabled.
- **Vehicle/garage contract:** garages require an occupied vehicle, and vehicle interaction checks for a nearby garage before exiting.
- **Steering and spawn:** A/left and D/right mappings are corrected; the starter car is placed at Auto Works.
- **Authored vehicle loading:** sedan/hatchback visual loads are deferred; failed optional GLB loads preserve the procedural visual and expose load status.
- **Startup syntax regression:** the duplicate City Hall binding that prevented the inline module from parsing has been renamed. The CI workflow now runs `node --check` on the extracted inline module before browser tests.

## CI timeout and workflow changes

- Browser tests are split into **three shards** with independent reports.
- Playwright tests have a 75-second per-test timeout and a 15-minute global suite timeout; each browser job has a 20-minute cap.
- Performance telemetry tests poll for valid render measurements instead of relying on a fixed delay.
- The branch's self-mutating repair/apply workflows and redundant full-suite triggers are now manual-only/read-only; the PR watchdog remains the routine validation path.

## Asset availability

- assets/vehicles/white-four-door-sedan.glb: not yet committed to the branch
- assets/vehicles/blue-five-door-compact-hatchback.glb: present in the branch

The blue hatchback GLB is present, but the normalized white sedan GLB is still missing from `assets/vehicles/`. The runtime must retain the procedural sedan visual until that file is added. The asset contract test verifies that this fallback is explicit rather than treating a missing optional binary as a game-startup failure.

## Verification status

- Deterministic engine tests: passed on the latest observed run before the final workflow-only commit.
- System tests: passed on the latest observed run before the final workflow-only commit.
- Vehicle dynamics, fidelity core, and itch package build: passed on the latest observed run before the final workflow-only commit.
- Browser suite: rerun is required after the duplicate-binding fix; the previous focused runs failed because `window.__coastlineTest` never initialized while the inline module had a duplicate `const cityHall` declaration.
