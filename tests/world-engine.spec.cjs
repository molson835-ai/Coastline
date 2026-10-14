const test = require('node:test');
const assert = require('node:assert/strict');

async function loadModules() {
  return {
    world: await import('../world-model.js'),
    engine: await import('../world-engine.js')
  };
}

test('world truth produces stable road, sidewalk and parking queries', async () => {
  const { world } = await loadModules();
  const model = world.createWorldModel({ citySize: 1500, roadSpacing: 200, roadWidth: 15, roadSurfaceY: 3, seed: 7 });
  assert.equal(model.roadId(3, 204), model.roadId(3, 204));
  const lane = model.roadLane(3, 204);
  const sidewalk = model.sidewalk(3, 204, 1);
  const parking = model.parking(3, 204, 1, 0);
  assert.ok(Math.abs(lane.x) > 0);
  assert.ok(Math.abs(sidewalk.x) > Math.abs(lane.x));
  assert.ok(Math.abs(parking.x) > Math.abs(sidewalk.x));
});

test('spatial runtime tracks entities and nearby queries', async () => {
  const { world, engine } = await loadModules();
  const model = world.createWorldModel({ seed: 3 });
  const runtime = engine.createWorldRuntime({ worldModel: model });
  runtime.register({ id: 'npc-1', type: 'pedestrian', x: 0, z: 0 });
  runtime.register({ id: 'car-1', type: 'vehicle', x: 20, z: 0 });
  assert.equal(runtime.size(), 2);
  assert.equal(runtime.queryNearby(0, 0, 10).length, 1);
  runtime.move('car-1', 5, 0);
  assert.equal(runtime.queryNearby(0, 0, 10).length, 2);
});

test('parking registry prevents duplicate reservations', async () => {
  const { world, engine } = await loadModules();
  const model = world.createWorldModel({ seed: 0 });
  const parking = engine.createParkingRegistry(model);
  const spot = parking.makeSpot(0, 0, 1, 0);
  assert.equal(parking.reserve(spot.id), true);
  assert.equal(parking.reserve(spot.id), false);
  assert.equal(parking.isOccupied(spot.id), true);
  parking.release(spot.id);
  assert.equal(parking.isOccupied(spot.id), false);
});

test('collision responses never add explosive bounce energy', async () => {
  const { engine } = await loadModules();
  const hard = engine.collisionResponse('building', { speed: 25 });
  const tree = engine.collisionResponse('tree', { speed: 25 });
  assert.ok(hard.restitution < 0.1);
  assert.ok(tree.restitution < 0.15);
  assert.equal(tree.damageable, true);
});

test('damage accumulates deterministically and stays bounded', async () => {
  const { engine } = await loadModules();
  let damage = engine.createDamageState();
  damage = engine.applyImpact(damage, { relativeSpeed: 18, side: 'front', mass: 1 });
  damage = engine.applyImpact(damage, { relativeSpeed: 30, side: 'front', mass: 1 });
  assert.ok(damage.front > 0);
  assert.ok(damage.front <= 1);
  assert.ok(damage.structural <= 1);
});

test('AI simulation LOD reduces work with distance', async () => {
  const { engine } = await loadModules();
  assert.equal(engine.simulationLOD(20), 0);
  assert.equal(engine.simulationLOD(100), 1);
  assert.equal(engine.simulationLOD(300), 2);
  assert.equal(engine.simulationLOD(800), 3);
  assert.equal(engine.tickRateForLOD(3), 0);
});
