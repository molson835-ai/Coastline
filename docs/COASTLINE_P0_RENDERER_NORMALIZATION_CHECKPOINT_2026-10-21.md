# Coastline P0 Renderer Normalization Checkpoint — 2026-10-21

## Status
- **Approved direction:** restore adaptive renderer behavior; do not lower visible quality globally.
- **PR:** #81 — `P0: Restore adaptive renderer runtime quality` (draft/open, not merged).
- **Branch:** `coastline-p0-renderer-runtime-normalization-v1`
- **Latest branch SHA:** `06ee20501d74511e40c3cd01acaab7eadb9b09e6`
- **Base SHA:** `187fa4a953a6a2328444aed7db549b27f3aef508`
- **Do not merge** until exact-SHA CI and gameplay watchdog evidence is reviewed.

## Root cause / failure ledger entry
`.github/workflows/coastline-max-graphics.yml` had been a source-mutating workflow. Its replacement map forced renderer settings in `game-v3.html`, including:
- adaptive pixel ratio → forced `1.5–2.0`
- low-power bloom off → bloom forced on
- adaptive terrain resolution → `384` segments
- adaptive recovery threshold → forced high threshold (`avg>999`)

The cinematic watchdog failure observed pixel ratio `1.5`, directly matching the forced configuration. The renderer mutation is therefore a high-confidence cross-component cause for at least the cinematic failure and a credible contributor to browser initialization/timeouts. It must not be used as proof that steering, walking, NPC, or mobile failures are renderer-caused until those tests are rerun on the normalized SHA.

## Important correction discovered during normalization
The intended adaptive recovery implementation is:
`if(avg>23){qualityRecoveryAt=0; ...}`
The original normalization attempt incorrectly expected `qualityRecoveryAt=now`. CI evidence corrected this hypothesis. Preserve the actual source behavior rather than inventing a new recovery semantic.

## Verified normalization evidence
A GitHub Actions normalization job successfully verified the adaptive source in its working tree and reported:
- restored pixel ratio baseline
- restored low-power bloom behavior
- restored terrain segment selection
- adaptive recovery string already present

The first push attempt failed only because the GitHub App token lacked `workflows` permission when the job tried to modify `.github/workflows/coastline-max-graphics.yml`. The log also established that the normalized `game-v3.html` was already on the branch afterward (`a6abbe1de483c786cdb6fe9b45c11355a145f6a6`), so the workflow itself was then changed through the GitHub connector to a validation-only guard.

## Current source-of-truth guard
The graphics workflow now only validates that the adaptive strings exist and the forced max-graphics strings do not. It does not rewrite `game-v3.html`.

Required adaptive source:
- `let currentPixelRatio=Math.min(devicePixelRatio||1,lowPowerDevice?.9:1.15);`
- `if(lowPowerDevice)bloomPass.enabled=false;`
- `if(avg>23){qualityRecoveryAt=0;`
- `terrainSegments=lowPowerDevice?176:256`

Forbidden forced mutations:
- `let currentPixelRatio=Math.min(Math.max(devicePixelRatio||1,1.5),2.0);`
- `if(lowPowerDevice)bloomPass.enabled=true;`
- `if(avg>999){qualityRecoveryAt=0;`
- `terrainSegments=384`

## Historical run evidence
- Run `39643410594`: initial one-time normalizer; in progress at first observation, later diagnosed as a normalization-script mismatch.
- Run `39643930001`: normalization attempt failed because the script expected the wrong adaptive recovery string (`if(avg>23){qualityRecoveryAt=now;`).
- Run `39644050455`: normalization source verification succeeded, but push was rejected because the GitHub App lacked workflow-file write permission. This produced the useful evidence that normalized source was valid and that the permission boundary was the remaining failure.
- Run `39644130018`: source was already normalized; verification passed; commit step found no source changes. This confirms the normalized `game-v3.html` had reached the branch.

## Why this matters for the next debugging pass
Do not change movement/steering code based on the old PR #79 failure set yet. The next meaningful experiment is the full gameplay watchdog against the normalized exact head SHA. Compare the new failure set with PR #79's 12 failures.

If walking, steering, mobile controls, jump, NPC slice, and performance failures substantially improve, renderer overload was a major causal factor. If individual failures remain, classify each as production defect, test expectation, fixture/setup, timing/race, CI/environment, intentional scope, stale contract, or deployment/package issue before changing code.

## Visual-quality guardrail
This patch is **not** a visual downgrade. The goal is to remove forced/invisible renderer work and restore adaptive quality so a capable device can render well while constrained devices can recover. Do not solve performance by globally reducing textures, geometry, lighting, shadows, or resolution unless a measured bottleneck proves that specific quality budget must change.

## Next actions
1. Verify PR #81 required jobs on the exact latest SHA.
2. Verify the graphics guard is validation-only and passes.
3. Run the full gameplay watchdog/browser suite on that same SHA.
4. Compare failures to PR #79's exact failure ledger.
5. Diagnose remaining failures individually; do not weaken tests.
6. Only after P0 stability is verified should CTM/World 2 implementation resume.

## Chat-limit preservation note
This checkpoint is intentionally durable. If the chat ends, recover from this file plus `docs/COASTLINE_AGENT_RECOVERY_GUIDE.md`, `docs/COASTLINE_PATCH_BUDGET_HANDOFF_2026-10-21.md`, CTM spec/plan, and PR #81. The chat is not the source of truth.
