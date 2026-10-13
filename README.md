# Coastline

A browser-based coastal driving game, built to grow from a playable prototype into an open-world driving experience.

## Current build: real-time 3D coastal drive

The game now uses **Three.js** for a real-time 3D scene rather than a flat canvas drawing. The environment is generated in code to keep the project lightweight and avoid paid asset packs.

Current features:
- Third-person 3D driving camera and a detailed stylized car
- Procedural winding coastal road, road markings, shoulders, terrain and headlands
- Ocean, shoreline foam, fog, atmospheric lighting and tone mapping
- Procedural trees, rocks, roadside houses and guardrails
- Speed and distance HUD with keyboard and touch controls
- Repeating 8 km route with a cumulative distance counter
- Instanced guardrails to reduce rendering overhead

## Play

When GitHub Pages is enabled, open:

https://molson835-ai.github.io/Coastline/

The game loads Three.js from jsDelivr, so an internet connection is required. If testing locally, use a local web server rather than opening `index.html` directly as a `file://` URL, because browsers can block JavaScript modules loaded from local files.

## Controls

- **W / Up arrow:** accelerate
- **S / Down arrow:** brake
- **A / Left arrow:** steer left
- **D / Right arrow:** steer right
- **Space:** handbrake / slow down
- **R:** reset the drive
- **Mobile:** on-screen steering and pedal buttons

## Cost and licensing approach

- No paid game engine or hosted backend is required for this milestone.
- Three.js is loaded from its public CDN; see the [Three.js project](https://threejs.org/) for library and license details.
- Road, terrain, vehicle and environmental objects are procedural geometry, not copied commercial assets.
- GitHub Pages can host the static website, subject to GitHub's current usage limits.

## Known limitations

This is an early 3D prototype, not a finished AAA game. Vehicle handling is intentionally simple; there is not yet robust collision physics, traffic AI, missions, save data, an asset streaming system, or a full open-world map. Visual quality and performance vary by device, and the 3D CDN must load successfully.

## Roadmap

1. Improve vehicle physics, collisions and camera feel
2. Add traffic, roadside points of interest and driving challenges
3. Add map regions, route choices, collectibles and missions
4. Add car selection/customization and persistent progress
5. Profile performance and progressively improve models, materials, shadows and environmental detail

The main branch contains the currently published build; development should continue in feature branches so the playable version stays recoverable.
