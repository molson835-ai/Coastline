import test from 'node:test';
import assert from 'node:assert/strict';

const { createWorldModel } = await import('../world-model.js');
const engine = await import('../world-engine.js');

test('world truth produces stable road, sidewalk and parking queries', () => {
  const model = createWorldModel({ citySize: 1500, roadSpacing: 200, roadWidth: 15, roadSurfaceY: 3, seed: 7 });
  assert.equal(model.roadId(3, 204), model.roadId(3, 204));
  const lane = model.roadLane(3, 204);
  const sidewalk = model.sidewalk(3, 204, 1);
  const parking = model.parking(3, 204, 1, 0);
  assert.ok(Math.abs(lane.x) > 0);
  assert.ok(Math.abs(sidewalk.x) > Math.abs(lane.x));
  assert.ok(Math.abs(parking.x) > Math.abs(sidewalk.x));
});

test('spatial runtime tracks entities and nearby queries', () => {
  const model = createWorldModel({ seed: 3 });
  const runtime = engine.createWorldRuntime({ worldModel: model });
  runtime.register({ id: 'npc-1', type: 'pedestrian', x: 0, z: 0 });
  runtime.register({ id: 'car-1', type: 'vehicle', x: 20, z: 0 });
  assert.equal(runtime.size(), 2);
  assert.equal(runtime.queryNearby(0, 0, 10).length, 1);
  runtime.move('car-1', 5, 0);
  assert.equal(runtime.queryNearby(0, 0, 10).length, 2);
});

test('runtime chunk bookkeeping follows registration, movement and removal', () => {
  const model = createWorldModel({ citySize: 1500, roadSpacing: 200 });
  const runtime = engine.createWorldRuntime({ worldModel: model, chunkSize: 200 });
  const first = model.cellBounds(0, 0, 200).key;
  const second = model.cellBounds(250, 0, 200).key;
  runtime.register({ id: 'npc', type: 'pedestrian', x: 0, z: 0 });
  assert.equal(runtime.chunks(), 1);
  assert.equal(runtime.chunkEntityCount(first), 1);
  runtime.move('npc', 250, 0);
  assert.equal(runtime.chunkEntityCount(first), 0);
  assert.equal(runtime.chunkEntityCount(second), 1);
  assert.equal(runtime.chunks(), 1);
  runtime.unregister('npc');
  assert.equal(runtime.size(), 0);
  assert.equal(runtime.chunks(), 0);
});

test('re-registering an id replaces its spatial and chunk state', () => {
  const model = createWorldModel({ seed: 3 });
  const runtime = engine.createWorldRuntime({ worldModel: model });
  runtime.register({ id: 'npc', type: 'pedestrian', x: 0, z: 0 });
  runtime.register({ id: 'npc', type: 'vehicle', x: 300, z: 0 });
  assert.equal(runtime.size(), 1);
  assert.equal(runtime.get('npc').type, 'vehicle');
  assert.equal(runtime.queryNearby(0, 0, 20).length, 0);
  assert.equal(runtime.queryNearby(300, 0, 20).length, 1);
});

test('parking registry prevents duplicate reservations', () => {
  const model = createWorldModel({ seed: 0 });
  const parking = engine.createParkingRegistry(model);
  const spot = parking.makeSpot(0, 0, 1, 0);
  assert.equal(parking.reserve(spot.id), true);
  assert.equal(parking.reserve(spot.id), false);
  assert.equal(parking.isOccupied(spot.id), true);
  parking.release(spot.id);
  assert.equal(parking.isOccupied(spot.id), false);
});

test('collision responses avoid explosive bounce energy', () => {
  const hard = engine.collisionResponse('building', { speed: 25 });
  const tree = engine.collisionResponse('tree', { speed: 25 });
  assert.ok(hard.restitution < 0.1);
  assert.ok(tree.restitution < 0.15);
  assert.equal(tree.damageable, true);
});

test('damage accumulates and stays bounded', () => {
  let damage = engine.createDamageState();
  damage = engine.applyImpact(damage, { relativeSpeed: 18, side: 'front', mass: 1 });
  damage = engine.applyImpact(damage, { relativeSpeed: 30, side: 'front', mass: 1 });
  assert.ok(damage.front > 0 && damage.front <= 1);
  assert.ok(damage.structural <= 1);
});

test('AI simulation LOD reduces work with distance', () => {
  assert.equal(engine.simulationLOD(20), 0);
  assert.equal(engine.simulationLOD(100), 1);
  assert.equal(engine.simulationLOD(300), 2);
  assert.equal(engine.simulationLOD(800), 3);
  assert.equal(engine.tickRateForLOD(3), 0);
});
