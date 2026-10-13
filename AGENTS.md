# Coastline agent instructions

## Mission
Build Coastline into a large, living coastal open-world driving game with satisfying arcade-believable driving, exploration, missions/progression, and an original cinematic graphic-novel visual identity. Preserve the current playable build while improving it in small, testable increments.

## Hard constraints
- Free-only: no new subscriptions, paid APIs, metered external services, paid assets, or surprise recurring costs.
- Never expose, request, commit, or print secrets, tokens, cookies, or personal data.
- Do not copy proprietary game code, art, maps, characters, logos, audio, or assets. Verify licenses and attribution before adding third-party content.
- Do not auto-merge, force-push, rewrite shared history, change repository permissions, or deploy a risky gameplay change without an explicit human decision.
- Keep `game-v2.html` as a fallback/reference. The published build must remain recoverable.
- Do not claim visual, handling, or physical-phone testing unless it was actually performed. Clearly distinguish automated/headless evidence from human playtesting.
- Avoid broad rewrites of the monolithic `game-v3.html`. Prefer isolated modules and small changes with regression tests.

## Working loop
1. Read the issue, roadmap, relevant source, and existing tests before editing.
2. Select one small outcome that can be completed in one PR. State assumptions and acceptance criteria in the PR.
3. Create a dedicated branch. Never commit directly to `main`.
4. Add or update regression tests for every behavior change. Preserve the current test suite.
5. Run the repository's documented tests. Report exact commands and results; do not claim a pass if a command was skipped or failed.
6. Open a focused PR with summary, risk, test evidence, rollback notes, and any human playtest still required.
7. Stop and request human input for ambiguous game-design choices, unverified licenses, new costs/permissions, destructive actions, secrets, failing checks that cannot be diagnosed safely, or changes requiring subjective gameplay feedback.

## Priorities
1. Keep the live game booting and controls working on desktop and mobile.
2. Fix reproducible bugs and establish shared deterministic world data.
3. Improve vehicle handling, traffic/pedestrian behavior, and mission reliability.
4. Introduce bounded world-region/chunk streaming only with tests and profiling.
5. Improve distinctive visual quality after capturing performance baselines.
6. Add meaningful progression/save data only with explicit tests for persistence and reward idempotency.

## Validation
- Use the existing Playwright browser tests and GitHub Actions watchdog.
- Check startup, console/page errors, vehicle entry/exit, keyboard/touch input, terrain/road transitions, collisions, and mission reward/replay behavior when relevant.
- Never use headless FPS as proof of real-device performance.
- Keep performance targets labeled as targets until measured on representative hardware.
