# Coastline Android-first Godot plan

## Product decision
- Keep the current Three.js browser beta and GitHub Pages deployment as the public playable fallback.
- Develop the native game on an isolated branch. Never replace the browser entry point or merge native-only changes into the web build without a deliberate review.
- Use Godot 4 with GDScript and the Compatibility renderer for the first phone-only validation pass. This is the widest-compatibility baseline; it is not the final visual-quality ceiling.
- Once the target phone's GPU capability and frame time are measured, test the Mobile renderer as an optional higher-quality profile. Do not default the editor to Forward+ on a phone: Godot's Android editor documentation warns that Forward+ has severe performance issues there.
- No paid engine, plugins, cloud build service, or asset pack is required.

## First milestone: a polished coastal slice
The first area should be small and authored for quality rather than a giant empty map:
1. A short, readable road leading into a sandy coast, with shoreline rocks and palm silhouettes.
2. Stable touch driving, a clear speed readout, collision boundaries, a responsive follow camera, and a reset action.
3. A consistent daylight setup and legible mid-distance visibility.
4. A performance baseline on the actual Android device before adding more objects.
5. Replace primitive placeholder meshes gradually with optimized, licensed assets and original materials. Record each asset's source and license in the repository.

## Performance guardrails
- Keep the test area small; expand only after the target phone sustains a stable frame rate.
- Reuse materials and meshes; instance repeated props rather than creating unique materials per object.
- Add collision only where it affects gameplay; avoid detailed physics on decorative scenery.
- Use LOD/distance culling for vegetation and buildings as the world grows.
- Profile frame time, memory, draw calls, and loading on-device. Do not infer performance from source review alone.
- Treat water, foliage, shadows, post-processing, and texture resolution as adjustable quality tiers.

## Validation checklist
- Open the project in the Android Godot editor and wait for import to finish.
- Run the main scene; inspect the output/debugger for parse or runtime errors.
- Test all four touch buttons, reverse/braking, steering direction, collision with buildings, and reset.
- Confirm the shoreline ends at land and the car cannot drive through solid objects.
- Capture a screenshot and note device model, renderer, approximate frame rate, and any stutter.
- Only after the slice runs reliably should we add traffic, pedestrians, missions, and larger-world streaming.

## Current status
The coastal slice added in this branch is procedural graybox art, not photorealistic content. The code has not yet been run in the Godot editor or on a physical device. Android import, syntax/runtime checks, and visual tuning remain the next validation gate.
