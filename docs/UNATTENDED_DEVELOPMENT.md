# Unattended Coastline development

Reviewed: 2026-10-13

## What already runs without your device being online

The `.github/workflows/gameplay-watchdog.yml` workflow runs on pushes to `main`, pull requests, manual dispatch, and a six-hour schedule. It launches a local browser test run in GitHub Actions, stores short-lived reports/traces, and opens or comments on a single watchdog issue when a scheduled or main-branch run fails.

Because Coastline is a public GitHub repository, standard GitHub-hosted Actions runners are free under GitHub's published policy. Avoid larger runners and paid services. GitHub may automatically disable scheduled workflows in a public repository after 60 days without repository activity, so check Actions occasionally.

This is **unattended validation and failure reporting**, not an AI developer: GitHub Actions cannot invent and implement game features by itself.

## What is not enabled

There is currently no verified free, always-on cloud coding agent with permission to autonomously edit this repository. ChatGPT Free does not include Codex Cloud environments according to current OpenAI plan documentation. GitHub Copilot's agent/automation availability depends on plan and eligibility. Do not assume a coding agent is enabled or incur a charge to test one.

Do not add an API key or a generative-model call to Actions. That would create a secret-management requirement and could introduce usage charges. Do not create a self-hosted runner that depends on a personal computer being on.

## Recommended safe loop

1. Keep the scheduled watchdog as the always-on safety net.
2. Keep tasks as small, acceptance-tested GitHub issues, with one feature branch and one PR per task.
3. Use `AGENTS.md` as the canonical policy for any coding agent that becomes available.
4. Require automated checks to pass on the exact PR head before merge.
5. Leave visual style, driving feel, and physical-phone checks to a human; automated checks cannot certify these.
6. Merge only small, low-risk changes after checks pass. Keep risky gameplay changes, migrations, deployment changes, and subjective art/handling decisions for human review.
7. If a free cloud coding-agent feature becomes available on the user's account, connect it through the official GitHub integration and give it a single scoped issue—not blanket permission to merge or deploy.

## Mobile-friendly checks

- Open [Actions](https://github.com/molson835-ai/Coastline/actions) to see the latest watchdog run.
- Open [open issues](https://github.com/molson835-ai/Coastline/issues) to find a watchdog failure or the next scoped task.
- Open [the live game](https://molson835-ai.github.io/Coastline/game-v3.html) for manual checks.
- If a watchdog issue appears, inspect the run URL and artifact first. Fix the underlying failure rather than repeatedly re-running a broken build.

## Current limitation

With the stated constraints (GitHub account only, no new subscriptions, no API charges), the practical setup is free unattended CI plus agent-ready repository instructions. It does **not** guarantee that new features will be coded while the chat is closed. A cloud coding agent with free eligible access would be needed for that second part; verify availability in the account before enabling it.
