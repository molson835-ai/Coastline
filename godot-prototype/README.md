# Coastline Godot Prototype

This is a separate, experimental native-game branch. It does **not** replace or modify the playable browser game in `main`.

## Phone-only setup

1. On Android, install the official Godot Engine Android editor: https://godotengine.org/download/android/
2. Install the GABE companion app if you later need Gradle-based Android exports. Official announcement and details: https://godotengine.org/article/gabe-stable-release/
3. Download this branch as a ZIP from GitHub, extract it to a folder such as `Documents/CoastlineGodot`, then open/import `godot-prototype/project.godot` in Godot.
4. Start with the Compatibility renderer. This prototype uses built-in primitive meshes and GDScript; it does not require purchased assets.
5. Open `main.tscn` and press Play.

## Prototype controls

- GAS ▲: accelerate
- BRAKE: brake, then reverse
- ◀ / ▶: steer
- W/A/S/D or arrow keys: keyboard controls when a keyboard is connected
- R: reset car

## Current milestone

- Procedural street grid and sidewalks
- Simple block buildings with windows
- Basic trees
- Arcade car movement and camera
- Touch UI

This is a first benchmark, not yet a polished game. Collision, touch layout, phone performance, and Godot editor compatibility must be tested on-device before extending it.

## Migration rule

Keep the existing browser game on the `main` branch and its existing GitHub Pages deployment. Work on this branch until the Godot prototype is tested. Port gameplay systems incrementally; Three.js code cannot run directly in Godot.
