import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../world-model.js';
import { chooseResidentActivity, chooseWildlifeBehavior, separationSteering } from '../living-world.js';
import { createWorldArchitecture, applyImpact, createDamageState, collisionResponse, simulationLOD } from '../world-engine.js';

test('world truth exposes lane, shoulder, sidewalk and parking positions', () => {
  const world = createWorldModel({ seed: 11 });
  const lane = world.roadLane(0, 80);
  const shoulder = world.shoulder(0, 80, 1);
  const sidewalk = world.sidewalk(0, 80, 1);
  const parking = world.parking(0, 80, 1, 0);
  assert.ok(Math.abs(shoulder.x) > Math.abs(lane.x));
  assert.ok(Math.abs(sidewalk.x) > Math.abs(lane.x));
  assert.ok(Math.abs(parking.x) > Math.abs(lane.x));
  assert.ok(Number.isFinite(parking.rotation));
});

test('world architecture supports nearby actors and parking reservations', () => {
  const world = createWorldModel({ seed: 4 });
  const architecture = createWorldArchitecture(world);
  architecture.runtime.register({ id: 'npc-a', type: 'pedestrian', x: 0, z: 0 });
  architecture.runtime.register({ id: 'car-a', type: 'vehicle', x: 10, z: 0 });
  assert.equal(architecture.runtime.queryNearby(0, 0, 12).length, 2);
  const spot = architecture.parking.makeSpot(0, 0, 1, 0);
  assert.equal(architecture.parking.reserve(spot.id), true);
  assert.equal(architecture.parking.reserve(spot.id), false);
});

test('impact damage accumulates without exceeding physical bounds', () => {
  let damage = createDamageState();
  damage = applyImpact(damage, { relativeSpeed: 24, side: 'front' });
  damage = applyImpact(damage, { relativeSpeed: 24, side: 'right' });
  assert.ok(damage.front > 0 && damage.right > 0);
  assert.ok(damage.structural <= 1 && damage.glass <= 1);
  assert.ok(collisionResponse('building', { speed: 30 }).restitution < .1);
});

test('simulation LOD provides progressively cheaper actor work', () => {
  assert.deepEqual([simulationLOD(20), simulationLOD(120), simulationLOD(300), simulationLOD(900)], [0,1,2,3]);
});

test('resident identity and wildlife threat decisions are deterministic', () => {
  const a = chooseResidentActivity({ id: 17, daylight: .8, weather: 'clear', timeSlice: 4 });
  assert.equal(a, chooseResidentActivity({ id: 17, daylight: .8, weather: 'clear', timeSlice: 4 }));
  assert.equal(chooseWildlifeBehavior({ id: 'deer-17', threatDistance: 5 }), 'flee');
});

test('local separation steering provides bounded avoidance for nearby actors', () => {
  const s = separationSteering({ x: 0, z: 0, neighbors: [{ x: 1, z: 0 }] });
  assert.ok(s.x < 0);
  assert.equal(s.z, 0);
  assert.ok(Math.hypot(s.x, s.z) <= 1);
});
