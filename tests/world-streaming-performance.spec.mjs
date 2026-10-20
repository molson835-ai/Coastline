import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistanceVisibilityController } from '../coastline-world-streaming.js';

function record(id, x, z) {
  return { id, object: { visible: true }, position: { x, z } };
}

test('distance visibility keeps hysteresis while using spatial buckets', () => {
  const controller = createDistanceVisibilityController({ showDistance: 120, hideDistance: 180, cellSize: 100 });
  const records = [];
  for (let z = -1000; z <= 1000; z += 50) {
    for (let x = -1000; x <= 1000; x += 50) {
      const item = record(`${x}:${z}`, x, z);
      records.push(item);
      controller.register(item.id, { object: item.object, getPosition: () => item.position });
    }
  }

  const first = controller.update(0, 0);
  assert.ok(first.visited < records.length / 10, `spatial visibility should not scan every record; visited=${first.visited}, total=${records.length}`);
  assert.equal(records.find(item => item.position.x === 1000 && item.position.z === 1000).object.visible, false);

  const edge = records.find(item => item.position.x === 150 && item.position.z === 0);
  assert.equal(edge.object.visible, true);
  edge.position.x = 181;
  const second = controller.update(0, 0);
  assert.equal(edge.object.visible, false);
  assert.ok(second.visited < records.length / 10);

  edge.position.x = 119;
  const third = controller.update(0, 0);
  assert.equal(edge.object.visible, true);
});

test('dynamic records can move between visibility buckets without changing critical-object behavior', () => {
  const controller = createDistanceVisibilityController({ showDistance: 80, hideDistance: 120, cellSize: 100 });
  const dynamic = record('dynamic', 300, 0);
  const critical = record('critical', 5000, 5000);
  controller.register(dynamic.id, { object: dynamic.object, getPosition: () => dynamic.position, dynamic: true });
  controller.register(critical.id, { object: critical.object, getPosition: () => critical.position, isCritical: () => true });

  controller.update(0, 0);
  assert.equal(dynamic.object.visible, false);
  assert.equal(critical.object.visible, true);

  dynamic.position.x = 40;
  const result = controller.update(0, 0);
  assert.equal(dynamic.object.visible, true);
  assert.equal(critical.object.visible, true);
  assert.ok(result.visited <= 3);
});
