# Coastline Vehicle Flight + Collision Architecture v1

## Flight: reserved until the dedicated stack is ready

The current prototype aircraft is intentionally removed from the playable presentation. It has no proper lift/descent model, so keeping it in the world would teach the wrong mechanics.

### Flight model to build later

Use one shared vehicle architecture with type-specific force modules rather than a separate ad-hoc controller for each aircraft.

**Plane / jet**
- Throttle -> engine thrust and airspeed.
- Airspeed + angle of attack -> lift.
- Pitch -> nose attitude.
- Roll -> bank angle.
- Yaw -> rudder/heading correction.
- Drag -> speed loss.
- Stall protection / simplified stall behavior -> prevents arbitrary vertical flight.
- Ground interaction -> runway roll, takeoff threshold, landing, braking.
- Optional landing gear and VTOL mode for suitable aircraft.

**Helicopter**
- Collective -> total rotor lift / vertical climb and descent.
- Cyclic pitch -> forward/backward acceleration.
- Cyclic roll -> lateral acceleration/banking.
- Tail rotor -> yaw.
- Rotor thrust and body tilt must remain coupled so forward flight naturally trades some vertical lift for horizontal movement.
- Hover should require active stabilization, not a teleport-like altitude lock.

**Jetpack**
- Thrust vector -> lift and movement.
- Fuel/heat or stamina budget can limit sustained flight later.
- Character orientation remains independent enough to aim movement/camera naturally.

### Input contract

Do not reuse the car steering contract for aircraft. Each flight vehicle exposes semantic axes:

`throttle`, `pitch`, `roll`, `yaw`, `lift/collective`, `camera`, `exit`.

Keyboard, touch and future DualShock input map into those semantic axes. The physics layer consumes only those axes. No runtime A/D swapping is allowed.

Battlefield 6 demonstrates the value of separating throttle, pitch, roll and yaw; it also offers simplified flight controls for players who do not want full manual axis management. GTA V similarly separates throttle, pitch, roll and yaw for aircraft and gives helicopters collective/cyclic/yaw behavior. Microsoft Flight Simulator models helicopter-specific collective, cyclic and rotor systems. These are the principles Coastline should combine into a more accessible but physically coherent arcade-realistic model.

## Collision: visible-world truth

The current building collision issue is a classic mismatch between render geometry and collision proxies. Coastline should not solve this by simply making collision radii smaller everywhere.

### Target contract

1. **No invisible walls.** A vehicle cannot be blocked by empty space beyond the rendered/physical footprint of an object.
2. **Visible things are hittable.** If an object has a meaningful physical structure, its collision representation follows that structure.
3. **Collision is shape-aware.** Buildings use their actual footprint rather than a large generic radius. Curbs, poles, signs, trees and walls use appropriate simple shapes.
4. **Soft objects respond.** Vegetation and other flexible props should bend, move or be displaced rather than behave like concrete.
5. **Hard objects transfer momentum.** Vehicle-to-vehicle and vehicle-to-structure impacts apply an impulse based on impact speed, mass and contact direction.
6. **Damage is directional.** Front/side/rear impact zones accumulate different damage states; visual deformation can be added progressively.
7. **Every collision has feedback.** At minimum: displacement/rotation, tire response, audio, particles or a visible mark. Major impacts can add dents/deformation.
8. **Collision and visual geometry share a source of truth.** When an asset's visible dimensions change, its collision proxy must update with it.

### Implementation sequence

**Phase A — collision truth**
- Replace broad building-radius blocking with per-object footprint data.
- Give every collidable world object a material/category and exact bounds.
- Add debug visualization for collision proxies during development.
- Add edge-proximity regression tests: a car should pass within a small clearance of a visible wall without being stopped early.

**Phase B — vehicle response**
- Compute relative velocity at contact.
- Apply an impulse at the contact point so hard impacts push the vehicle off course instead of merely clamping position.
- Add yaw torque for off-center impacts.
- Preserve stable suspension and prevent tunneling at high speed with swept/continuous collision checks where needed.

**Phase C — damage and interaction**
- Vehicles: dents, scratches, broken lights/glass states and panel deformation thresholds.
- Poles/signs: bend, break or fall when the impact threshold is exceeded.
- Fences/barriers: flex or break according to material.
- Vegetation: bend/displace and recover where appropriate.
- Buildings: remain structurally solid, but receive marks/decals and transfer a realistic impulse to the vehicle.

Three.js provides raycasting and precise object intersections for scene queries, while higher-end physics systems such as Unreal Chaos use collision shapes, sweeps/overlaps and impulses rather than relying on one oversized invisible blocker. Unreal's City Sample also demonstrates dynamic vehicle deformation driven by collision locations and impact thresholds.

## Motorcycle and driver presentation

Motorcycles will get an articulated rider as part of the character/vehicle integration pass. The rider should be a proper seated driver with hands aligned to handlebars, feet aligned to pegs, torso leaning with the bike and animation blending during braking/turning.

The same driver system will later be generalized to cars so the garage can switch between vehicle configurations/mods without losing a believable driver. Driver visibility is intentionally separated from the current vehicle-handling fix so it does not destabilize driving physics.

## Research basis

- Unreal Engine Chaos Vehicles: wheel/suspension/vehicle physics and aerofoil forces; supports configurable uplift/downforce and roll/pitch/yaw control surfaces.
- Unreal City Sample: collision-driven vehicle deformation using multiple physics bodies and Control Rig constraints.
- Battlefield 6: separate throttle, pitch, roll and yaw aircraft controls plus simplified controls.
- Microsoft Flight Simulator: aircraft and helicopter-specific aerodynamic/rotor parameters.
- Three.js: Raycaster and Box3 provide the scene-query primitives needed for visible-world collision auditing.
