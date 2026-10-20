# Coastline — Architecture

## Architectural principle
**One authoritative source.** Critical behavior must not be controlled by competing layers.

Authoritative domains:
- player vehicle visual
- steering command
- render-quality controller
- world visibility controller
- garage interaction
- sandbox mode

## Runtime stack
- Browser game prototype using Three.js `0.170.0`.
- Vercel is used for beta deployments.
- GitHub is the source repository and CI host.
- Itch.io is part of the intended distribution workflow.
- Current renderer uses ACESFilmicToneMapping, exposure around 1.22, procedural dusk sky/reflection environment, EffectComposer, RenderPass, UnrealBloomPass, and OutputPass.

## Major modules
Known architectural areas include:
- `game-v3.html` — primary game/runtime composition.
- `vehicle-visual-enhancer.js` — vehicle visual enhancement.
- `coastline-vehicle-asset-loader.js` — authored vehicle GLB loading/replacement.
- `cinematic-world-upgrade.js` — cinematic environment/lighting layer.
- `world-model.js` — world model.
- `douglassville-layout.js` — Douglassville-inspired layout.
- living-world modules — NPC/traffic/world activity.
- `world-engine.js` — world architecture.
- `coastline-world-streaming.js` — distance/cell visibility control.
- `coastline-fidelity-budget.js` — traffic/fidelity budget decisions.
- adaptive render configuration — quality tiers and priority.

## Vehicle architecture
The starter vehicle should be a single authoritative physics vehicle with the authored white sedan as its visual. Procedural/debug geometry is fallback-only if the authored asset genuinely fails.

The authored fleet test was changed to behavior-based discovery rather than fixed array indexes: the player vehicle receives the sedan and a non-player car receives the hatchback while physics roots remain intact.

## World visibility
Current direction is spatial/cell-based visibility rather than iterating every static object every frame. Dynamic records re-bucket when crossing cells; static records remain bucketed; critical objects remain considered. Candidate cells can be rejected using the minimum possible cell-to-player distance before exact object distance tests.

## Next renderer architecture
The intended hierarchy is:
1. HERO — player vehicle, player, immediate interactive objects.
2. NEAR — full-quality nearby environment.
3. MID — batched/instanced/LOD representation.
4. FAR — aggressive culling/streaming and low-cost representation.
5. HLOD — cell-level proxy/merged representation for distant static content.
6. INTERACTIVE — collision/interaction priority regardless of visual distance where required.
7. COLLISION ONLY — invisible physical proxy separated from expensive render meshes.

The goal is to reduce renderer work, not remove visible detail from the near field.

## Research principles adopted
High-end world architecture repeatedly favors hierarchical representation, streaming, instancing/batching, visibility management, LOD/HLOD, and resource sharing. Coastline should adapt those principles to Three.js/browser/mobile constraints rather than copying proprietary game code.
