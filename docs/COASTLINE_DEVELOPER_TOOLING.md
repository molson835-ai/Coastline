# Coastline developer tooling

This project renders with **Three.js/WebGL**, not Babylon.js. Do not add or initialize Babylon.js Inspector in the game runtime; it is for Babylon scenes and will not inspect Coastline's Three.js scene.

## Installed project tools

- **Playwright** (`@playwright/test`): already present; browser smoke tests, screenshots, traces, and video-on-failure.
- **glTF Transform CLI** (`@gltf-transform/cli`): inspect and optimize GLB/glTF assets.
- **Khronos glTF Validator** (`gltf-validator`): validate binary GLB assets for structural/specification errors.

Commands:

```bash
npm install
npm run assets:validate
npx gltf-transform inspect path/to/model.glb
npx gltf-transform optimize path/to/input.glb path/to/output.glb
npm run test:gameplay
```

Optimization must write to a new output file. Never overwrite an authored source model automatically; review visual quality, animation, materials, scale, and mobile performance before replacing an asset.

## WebGL frame inspection

Use **Spector.js** as a browser DevTools extension / capture tool. It inspects WebGL draw calls, programs, textures, and frame state. It is not a game dependency and must not be bundled into Coastline's player build.

1. Install the Spector.js browser extension from its official project page: https://spector.babylonjs.com/ (the capture tool supports WebGL generally; its project is hosted by Babylon.js).
2. Open a Coastline preview in desktop Chrome.
3. Open DevTools, select the Spector.js panel, capture a frame, and inspect draw calls, shader programs, and texture bindings.
4. Save captures with the deployment URL and commit SHA so findings can be reproduced.

## Three.js scene inspection

The earlier Babylon.js Inspector recommendation does not apply to this Three.js project. For scene graph inspection, use the project's runtime diagnostics and browser console, and use Spector.js for GPU/frame-level inspection. Do not add a Babylon engine dependency solely to obtain an Inspector.

## Release evidence rules

- A successful HTTP response is not proof that the world rendered.
- Playwright headless screenshots are automated evidence, not Android phone acceptance.
- Record the exact commit SHA, preview URL, browser/device profile, console errors, network failures, and screenshots.
- A preview is not considered playable until required world geometry, materials, and camera framing have been checked at fixed City reference positions.
- No changes to steering, walking, camera behavior, or vehicle presentation are part of this tooling setup.


## Coastline World Health System

The runtime exposes a read-only diagnostic API after the City world and CTM initialize:

```js
window.__coastlineWorldHealth.scan()
window.__coastlineWorldHealth.report()
```

For a compact on-screen report (including on a phone preview), append `&worldHealth=1` to the existing game URL query string. For example:

`game-v3.html?beta=20261016performance&worldHealth=1`

The report checks the actual City root, visible tagged road/building/terrain geometry, WebGL context, canvas attachment, camera, scene lighting, expected color management/tone mapping, background/environment/fog, material/texture readiness, renderer counters, and captured resource-load errors. The City startup gate requires at least 16 road-layer objects, 20 building groups, and one terrain layer. Missing core geometry is a hard failure; asset, texture, or graphics-pipeline issues are warnings where appropriate.

The scan is read-only and does not repair or alter the world. It is a diagnostic gate, not a substitute for checking screenshots and playing on an Android device.
