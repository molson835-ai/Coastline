import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../world-model.js';

test('road intersections align with the same world-origin grid as road geometry', () => {
  const world = createWorldModel({ citySize: 1500, roadSpacing: 200 });
  const nodes = world.roadNodes();
  assert.ok(nodes.length > 0);
  for (const node of nodes) {
    assert.equal(node.x % world.roadSpacing, 0);
    assert.equal(node.z % world.roadSpacing, 0);
    assert.equal(node.id, `n:${node.x}:${node.z}`);
  }
});

test('road routing returns deterministic connected Manhattan paths', () => {
  const world = createWorldModel({ citySize: 1500, roadSpacing: 200 });
  const path = world.findRoadPath(15, -15, 399, 401);
  assert.deepEqual(path.map(({ x, z }) => [x, z]), [
    [0, 0], [200, 0], [400, 0], [400, 200], [400, 400]
  ]);
  for (let i = 1; i < path.length; i++) {
    const distance = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z);
    assert.equal(distance, world.roadSpacing);
  }
  assert.deepEqual(path, world.findRoadPath(15, -15, 399, 401));
});

test('road routing clamps destinations to the playable road grid and rejects invalid input', () => {
  const world = createWorldModel({ citySize: 1500, roadSpacing: 200 });
  const path = world.findRoadPath(-5000, -5000, 5000, 5000);
  assert.deepEqual([path[0].x, path[0].z], [-600, -600]);
  assert.deepEqual([path.at(-1).x, path.at(-1).z], [600, 600]);
  assert.deepEqual(world.findRoadPath(0, 0, Number.NaN, 1), []);
});
