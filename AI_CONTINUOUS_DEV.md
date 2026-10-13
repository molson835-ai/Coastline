# Coastline AI Continuous Development

Coastline now includes an optional development-time AI engineer powered by OpenAI Codex through GitHub Actions.

## What it does

- Runs manually or on a twice-daily schedule.
- Can also react to GitHub issues, treating them as playtest feedback.
- Reads the current code, recent work, issues, and pull requests.
- Chooses a high-value next improvement.
- Edits the repository, performs static validation, and creates a feature branch and pull request.
- Never requires AI at runtime, so the published game remains playable without an API key.

## Enable it

Add an Actions repository secret named `OPENAI_API_KEY` in:

`Settings → Secrets and variables → Actions → New repository secret`

Then run **Coastline AI Continuous Development** from the Actions tab, or let the scheduled run execute.

The AI developer is deliberately configured to create pull requests rather than silently merging changes. This gives the owner a review/playtest checkpoint while still allowing continual autonomous development.

## Feedback loop

Open a GitHub issue with a concrete playtest observation or idea. Issues can be used as the AI developer's backlog. For automatic issue-driven runs, apply the `ai-dev` label; new issues are also accepted by the workflow so feedback can be processed immediately.

## Safety

The workflow uses GitHub Actions secrets for the API key and the official OpenAI Codex GitHub Action with a workspace-scoped permission profile. The shipped browser game never receives the API key.
