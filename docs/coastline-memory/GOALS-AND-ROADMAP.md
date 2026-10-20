# Coastline — Goals and Roadmap

## Vision
Build a family-friendly open-world coastal American driving/exploration game with realistic/sleek vehicles, a detailed living city, suburbs and countryside, exploration, secrets, suspense, replayability, NPC roles and personal story arcs, and a high-end visual target while remaining playable on phones.

## Priority order
### P0 — Foundation and correctness
- Stable startup and no black screens.
- One authoritative player vehicle and steering path.
- Garage interaction is vehicle-only.
- Sandbox mode is clean and quiet.
- Collision behavior is reliable.
- Authored white sedan is authoritative.

### P1 — Renderer recovery without visual regression
- Spatial visibility.
- Render-object census.
- Static batching/instancing.
- HLOD.
- Frustum/occlusion/screen-importance decisions.
- Shared materials/geometries/textures where appropriate.
- Shadow/post-FX optimization only after measurement.

### P2 — Spend recovered budget on fidelity
- More realistic/detailed characters.
- Richer vegetation and ground variation.
- More detailed buildings and street furniture.
- Higher-quality vehicle fleet and traffic.
- Better animals/wildlife.
- Better weather, lighting, reflections, and sunset readability.
- Selective interiors and meaningful interactive spaces.

### P3 — World/gameplay depth
- Missions and objectives can be reactivated after the sandbox foundation is stable.
- NPC agency, reputation, rumors, personal stories, and emergent encounters.
- Exploration secrets and replayable activities.
- More accessible buildings where they provide meaningful gameplay.

### P4 — Platform/distribution
- Strong phone browser experience.
- TV/browser usability.
- DualShock 4 support.
- Itch.io distribution.
- Further packaging only when it adds real value.

## Exploration ideas
These are not automatically committed features. Evaluate them against performance, free-tier cost, and gameplay value before implementation.

## Roadmap rule
When a choice exists between deleting visual content and reducing renderer work, prefer reducing renderer work. When a feature costs recurring money, identify a free alternative first.
