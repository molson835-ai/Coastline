# Coastline rendering trim audit — 2026-10-25

## Scope and guardrails

Goal: reduce work that is redundant or outside the active view without lowering the detail visible to the player. Keep the current Three.js/web engine, preserve the world and its visual style, and avoid deleting gameplay entities merely to improve a counter. This is a source audit plus a targeted hero-car fix; it is not proof of a device-side performance gain.

## Confirmed waste addressed in this branch

### Hero vehicle had two visual models layered together

game-v3.html creates a prototype vehicle with its own body, hood, trunk, cabin, glass, bumpers, wheels, trim and lights. It then calls enhanceCar(starterVehicle.g). Before this branch, vehicle-visual-enhancer.js added a second, detailed procedural car group to the same root without removing the prototype meshes. The enhancer was also explicitly marked as a green debug build.

This branch:
- Replaces the prototype meshes with one detailed white hero shell instead of drawing both.
- Disposes the superseded meshes' unique geometry buffers while leaving shared materials alone.
- Maps the hero shell's body, cabin, hood, trunk, roof, wheels and bumpers into the existing damage/repair system.
- Removes the global THREE.Group.prototype.add interception hook. The player vehicle is enhanced explicitly, so unrelated groups cannot accidentally be upgraded because a mesh happens to have car-like dimensions.
- Adds a Playwright regression test for a single hero shell, removal of the old meshes, valid damage-part references and continued drivable state.

This should reduce duplicate hero-car draw submissions and release the redundant prototype geometry, but the size of the gain must be measured on device.

## Field-of-view and loading: important distinction

Three.js mesh frustum culling is enabled by default unless an object sets frustumCulled = false. The current source audit found the global sky dome intentionally disables frustum culling; that is appropriate because it must cover the entire view. Many other scene meshes rely on normal frustum culling.

The render culler in render-culling.js is a different layer: it applies player-distance tiers to registered building, tree, vehicle, pedestrian, wildlife and bird-flock roots. It is not a complete camera-facing culler for every object type.

Also, not drawing an object is different from not loading it:
- Camera frustum culling avoids submitting out-of-view meshes for the relevant render pass.
- Distance culling hides registered roots outside their configured distance.
- Neither automatically prevents the world from constructing all meshes/geometries at startup or retaining them in memory.

Do not add a second custom per-mesh camera culler until telemetry shows normal Three.js frustum culling is missing important objects. A naive custom FOV test can cause visible pop-in, incorrect shadows, or hide an object that enters the view between culler updates.

## Best remaining trim candidates (ordered)

1. **Shadow-pass workload.** The Android A/B runs show a large correlation between shadows enabled and increased frame time/draw calls, though runs were not perfectly controlled and GPU timing was unsupported. PR #103 tests distance-based shadow-caster toggles while retaining the shadow map, nearby detail and shadow receiving. It remains draft and requires CI/device/visual verification.
2. **Static building and streetscape mesh batching.** Building facades, windows, trim, signs and repeated roadside props include many individual meshes. Reuse shared geometries/materials and use InstancedMesh for repeated static items where placement and damage semantics allow it. This is a promising draw-call reduction without removing visible detail, but it should be a separate measured change.
3. **Visibility-aware shadow participation.** The directional-light shadow camera covers a large area, so objects outside the player camera can still contribute to the shadow pass. Any tighter shadow region must be tested for shadow coverage, terrain/building pop-in, and camera movement; do not simply stop all off-screen shadows.
4. **World construction and residency.** The city and its scene meshes are built at startup. Chunked construction or lazy activation could reduce startup work and retained memory, but must preserve deterministic world positions, collision, parking, transitions, and return-to-world state. This is a larger architectural change, not a quick culling toggle.
5. **Vehicle detail tiers.** The world has many vehicles. Consider simple far-distance visual proxies for vehicles that are not currently drivable/occupied, while retaining their simulation and world state. Do not instance or remove vehicles indiscriminately: interaction, collision, traffic, parking and vehicle entry must remain correct.
6. **CPU work at distance.** Existing diagnostics identified per-frame AI updates and pedestrian/vehicle interaction as candidates. Use subsystem p95/max timing to decide whether to throttle distant AI decisions while preserving motion continuity and reactions near the player.

## Things not to remove blindly

- The global sky dome (it is intentionally always rendered).
- Collision proxies, world registry entries, parked vehicle reservations or transition buffers.
- NPCs or traffic solely to improve a render counter.
- Materials or geometry shared by multiple objects when disposing one object's resources.
- All off-screen shadow casting; distant shadows can still be visible and shadow-map coverage is independent of the main camera frustum.

## Verification plan

1. Run the new hero-vehicle regression plus existing vehicle collision/damage, garage repair/paint, engine and system tests.
2. Run the browser gameplay suite. The latest PR #103 run passed 43 tests but failed tests/world-variety.spec.cjs at the 45-second test timeout; that is a separate existing test-timeout issue and is not evidence the shadow-culling code failed.
3. On the same Android phone, route and graphics settings, compare the same 50–60 second drive before and after the hero-shell change. Record FPS, average/p95 frame time, scene/bloom/output draw calls, triangles, geometry count, heap and runtime errors.
4. Inspect white hero car appearance, steering, wheel animation, collisions, damage, bumper detachment, repair and repaint.
5. Make only one additional trim change at a time, with a repeat device comparison and visual regression check.

No merge or production deployment is implied by this audit.
