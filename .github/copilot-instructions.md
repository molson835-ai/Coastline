Follow the repository-wide rules in `AGENTS.md`.

For every task:
- Make one small, reviewable change on a feature branch; do not commit directly to `main`.
- Keep Coastline free-only: no paid APIs, subscriptions, services, or assets without explicit approval.
- Read the relevant tests and preserve the published game and `game-v2.html` fallback.
- Add regression tests for behavior changes and report exact test commands/results.
- Do not claim real-device, visual, or handling validation based only on Playwright/headless runs.
- Open a focused PR with risk, rollback notes, and remaining human playtest steps.
- Never auto-merge or deploy risky gameplay changes. Ask for human input when design intent, licensing, cost, permissions, secrets, or subjective playtesting is needed.
