# Coastline AI Control Plane

## Purpose

Coastline now has a separate external-AI control-plane foundation. The browser game remains responsible for real-time gameplay; the control plane is responsible for telemetry diagnosis and development planning.

## Safety boundary

The first implementation is **proposal-only**. Model output is treated as untrusted text. It is never evaluated as JavaScript, never injected into the game, and never allowed to write GitHub directly from the public game endpoint.

The intended promotion path is:

`telemetry -> diagnosis -> engineering plan -> isolated branch -> build -> regression tests -> benchmark -> preview -> promotion`

## Current components

- `api/coastline-ai.js` — Vercel serverless control-plane endpoint.
- `coastline-ai-bridge.js` — optional browser telemetry bridge.
- `coastline-ai-runtime.js` — existing local deterministic AI runtime and worker remain authoritative for real-time behavior.
- `.github/workflows/ai-continuous-dev.yml` — existing paid-model Codex workflow remains manual-only and is not enabled by this change.

## Model provider

The endpoint is provider-neutral at the architecture level. When `AI_GATEWAY_API_KEY` is configured, it uses Vercel AI Gateway with `reflection/beam-free` by default. That model is currently listed by Vercel as free. If the key is absent, the endpoint automatically falls back to deterministic threshold-based diagnosis so the service remains functional without an AI credential.

## Required environment variables

- `AI_GATEWAY_API_KEY` — optional until model-backed reasoning is enabled.
- `COASTLINE_AI_MODEL` — optional; defaults to `reflection/beam-free`.
- `COASTLINE_AI_CONTROL_TOKEN` — optional shared bearer token for non-browser control-plane callers. Do not put this token in the browser.

## Next autonomous-development phase

The safe next phase is a separate private tool endpoint or GitHub App integration that can:

1. read approved repository files;
2. create an isolated branch;
3. write only approved paths;
4. run GitHub Actions validation;
5. inspect test and benchmark results;
6. create a pull request;
7. reject/close failed candidates;
8. never modify `main` directly.

Those capabilities should remain disabled until repository-token permissions and an explicit promotion policy are configured.
