# Coastline — Deployment

## Repository
GitHub repository: `molson835-ai/Coastline`

## Beta hosting
Vercel is used for browser beta deployments. Do not create a deployment simply to validate code that can be tested locally or in CI.

## Itch.io
Itch.io is intended as a distribution/testing surface. The project should package through the existing `npm run package:itch` flow when appropriate.

## Deployment rules
- Deploy one meaningful coherent batch rather than many tiny commits.
- Use a beta query/version identifier when a deployment needs to be tied to a benchmark or test cycle.
- Record important beta URLs and benchmark observations in current-state/changelog when they materially affect development.
- Do not treat a successful deployment as proof of gameplay correctness; pair it with tests and actual runtime verification.

## Free-tier posture
Vercel/GitHub/other provider limits can change. Do not record an unverified quota as permanent fact. When a limit becomes relevant, verify the provider documentation, link it from `RESEARCH-SOURCES.md`, and record the date/context in this file.

## Fallback
If hosted deployment is temporarily unavailable or capped, continue with local deterministic verification and preserve the exact commit intended for the eventual deployment.
