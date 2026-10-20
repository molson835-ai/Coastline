# Coastline — Visual Direction

## Target
High-end, realistic, sleek presentation inspired by the architectural principles and visual ambition of major open-world and driving games, while using original Coastline assets and browser-appropriate technology.

## Vehicle standard
- Authored GLB vehicles are authoritative.
- Starter vehicle is the white four-door sedan.
- PBR automotive materials should distinguish painted body, glass, rubber, plastic, raw metal, and lights.
- Reflections and lighting should support believable automotive materials.
- Avoid debug/procedural visuals in normal startup.

## World standard
The player should see detailed immediate roads, garage frontage, buildings, street furniture, vegetation, and vehicles without an obvious quality cliff around the player. Mid/far representation may be cheaper when the visual transition is controlled.

## Environment goals
- More convincing vegetation including weeds, bushes, dirt/ground variation.
- Detailed characters rather than blocky placeholder silhouettes.
- Realistic building materials and architectural trim.
- Traffic and parked vehicles that feel authored rather than repetitive.
- Strong but readable sunset lighting; distance should not become unnecessarily dark.
- Better reflections and atmospheric separation.

## Visual regression rules
Do not accept:
- unexplained pixelation
- sudden loss of texture/material quality
- green/debug starter flash
- duplicate vehicle visuals
- distant darkness that prevents navigation
- near-field detail being removed merely to raise FPS

## Performance philosophy
The visual contract is protected by changing representation and visibility before changing fidelity: share resources, batch, instance, stream, cull, use HLOD, and prioritize what the player can actually see/interact with.
