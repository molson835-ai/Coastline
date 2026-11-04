# Coastline Drive — Godot foundation

This folder is a separate Godot 4 native-engine prototype. The existing HTML/browser beta remains the reference build and is not removed or replaced.

## Why Godot?

- Godot is MIT-licensed, open source, and has no engine royalties or revenue ceiling.
- It supports desktop and Android exports; web export is available with platform-specific limitations.
- This project can be versioned in the existing GitHub repository.
- The initial renderer is Godot's Mobile renderer as a practical baseline for broad device support. Visual settings must be profiled on actual target hardware.

Official engine: https://godotengine.org/
License and compliance: https://docs.godotengine.org/en/stable/about/complying_with_licenses.html

## Open the prototype

1. Install the free Godot 4 editor on a Windows, macOS, or Linux computer.
2. Import the godot/project.godot file in the editor.
3. Run the main scene.
4. Use WASD or arrow keys to drive. Standard controller axis mappings can be added and tuned as the input layer is finalized.

This is a technical graybox, not the finished visual target. It exists to validate native project structure, basic driving, camera follow, road layout and deterministic vegetation before a larger port.

## Migration rules

- Keep the HTML beta available until the Godot version passes repeatable playtests.
- Migrate features in slices: vehicle controller, collision and road rules, world streaming, camera and input, then NPCs, missions, audio, weather and art.
- Do not copy proprietary game code or assets. Use original or properly licensed resources.
- Record licenses for third-party models, textures, sounds and fonts.
- Benchmark frame time, memory, draw calls and streaming hitches on target devices. Use LOD, instancing, occlusion, simplified collision and distance-based simulation before increasing visual complexity.
