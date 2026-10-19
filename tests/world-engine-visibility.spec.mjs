import test from 'node:test';
import assert from 'node:assert/strict';
import * as streaming from '../coastline-world-streaming.js';

test('distance visibility controller preserves nearby and critical objects and uses hysteresis', () => {
  assert.equal(typeof streaming.createDistanceVisibilityController, 'function',
    'streaming module should expose createDistanceVisibilityController');
  const controller = streaming.createDistanceVisibilityController({ showDistance: 100, hideDistance: 120 });
  const near = { visible: true };
  const far = { visible: true };
  const critical = { visible: true };
  const initiallyHidden = { visible: false };
  let farPosition = { x: 130, z: 0 };
  controller.register('near', { object: near, getPosition: () => ({ x: 40, z: 0 }) });
  controller.register('far', { object: far, getPosition: () => farPosition });
  controller.register('critical', { object: critical, getPosition: () => ({ x: 900, z: 0 }), isCritical: () => true });
  controller.register('hidden', { object: initiallyHidden, getPosition: () => ({ x: 10, z: 0 }) });

  controller.update(0, 0);
  assert.equal(near.visible, true);
  assert.equal(far.visible, false);
  assert.equal(critical.visible, true);
  assert.equal(initiallyHidden.visible, false);

  farPosition = { x: 110, z: 0 };
  controller.update(0, 0);
  assert.equal(far.visible, false, 'object should remain culled inside the hysteresis band');

  farPosition = { x: 90, z: 0 };
  controller.update(0, 0);
  assert.equal(far.visible, true, 'object should return before entering the near-field envelope');

  controller.unregister('far');
  farPosition = { x: 500, z: 0 };
  controller.update(0, 0);
  assert.equal(far.visible, true, 'unregistering should restore normal renderer ownership');
});

test('distance visibility controller validates thresholds and clears culled objects safely', () => {
  assert.equal(typeof streaming.createDistanceVisibilityController, 'function');
  assert.throws(() => streaming.createDistanceVisibilityController({ showDistance: 200, hideDistance: 100 }), /hideDistance/);
  const controller = streaming.createDistanceVisibilityController({ showDistance: 10, hideDistance: 20 });
  const object = { visible: true };
  controller.register('item', { object, getPosition: () => ({ x: 100, z: 0 }) });
  controller.update(0, 0);
  assert.equal(object.visible, false);
  controller.clear();
  assert.equal(object.visible, true);
});
