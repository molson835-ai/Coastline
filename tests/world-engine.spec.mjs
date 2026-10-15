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

test('render LOD preserves visuals farther than full simulation', () => {
  assert.deepEqual([engine.renderLOD(20), engine.renderLOD(150), engine.renderLOD(400), engine.renderLOD(800)], [0, 1, 2, 3]);
  assert.equal(engine.renderLOD(100), 1);
  assert.equal(engine.simulationLOD(100), 1);
});

test('simulation scheduler staggers actors and caps per-step work', () => {
  const scheduler = engine.createSimulationScheduler({ maxActorsPerStep: 2 });
  const actors = Array.from({ length: 8 }, (_, i) => ({ id: `npc-${i}`, lod: 0 }));
  const first = scheduler.select(actors, 1);
  assert.equal(first.length, 2);
  const second = scheduler.select(actors, 1.01);
  assert.ok(second.length <= 2);
  assert.ok(second.every(item => item.actor && Number.isInteger(item.lod)));
  assert.equal(scheduler.size(), first.length + second.length);
  assert.equal(scheduler.select([{ id: 'far', lod: 3 }], 10).length, 0);
});


test('road surface stays flat at every generated grid crossing', () => {
  for (const seed of [0, 7, 19]) {
    const model = createWorldModel({ citySize: 1500, roadSpacing: 200, roadWidth: 15, roadSurfaceY: 3, seed });
    for (let x = -600; x <= 600; x += 200) {
      for (let z = -600; z <= 600; z += 200) {
        assert.equal(model.groundY(x, z), 3, `road center must match road surface for seed=${seed}, x=${x}, z=${z}`);
        assert.equal(model.groundY(x + 7, z + 7), 3, 'the paved road envelope must not inherit terrain noise');
      }
    }
  }
});

test('terrain heights and normals remain finite and continuous around road edges', () => {
  const model = createWorldModel({ citySize: 1500, roadSpacing: 200, roadWidth: 15, roadSurfaceY: 3, seed: 41 });
  for (let x = -740; x <= 740; x += 13) {
    for (const z of [-613, -211, -8, 17, 199, 407, 721]) {
      const y = model.groundY(x, z);
      const normal = model.groundNormal(x, z);
      assert.ok(Number.isFinite(y), `non-finite terrain height at ${x},${z}`);
      assert.ok([normal.x, normal.y, normal.z].every(Number.isFinite), `non-finite normal at ${x},${z}`);
      assert.ok(normal.y > 0 && normal.y <= 1, `invalid terrain normal at ${x},${z}`);
      const next = model.groundY(x + 0.25, z);
      assert.ok(Math.abs(next - y) < 0.5, `terrain discontinuity at ${x},${z}: ${y} -> ${next}`);
    }
  }
});

test('world regions, roads and terrain are deterministic for a fixed seed', () => {
  const a = createWorldModel({ seed: 2026 });
  const b = createWorldModel({ seed: 2026 });
  for (const [x, z] of [[0, 0], [199, 201], [-412, 80], [610, -580], [720, 700]]) {
    assert.equal(a.groundY(x, z), b.groundY(x, z));
    assert.deepEqual(a.groundNormal(x, z), b.groundNormal(x, z));
    assert.equal(a.regionAt(x, z), b.regionAt(x, z));
    assert.equal(a.isRoadCorridor(x, z), b.isRoadCorridor(x, z));
  }
});
