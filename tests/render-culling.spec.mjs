import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderCuller } from '../render-culling.js';

function root(visible = true) { return { visible }; }
function entry(id, x, z, options = {}) {
  return {
    id, kind: options.kind || 'building',
    position: { x, z },
    detailRoot: root(options.detailVisible ?? true),
    proxyRoot: options.proxy ? root(false) : null,
    detailDistance: options.detailDistance ?? 100,
    renderDistance: options.renderDistance ?? (options.proxy ? 300 : 100),
    alwaysVisible: options.alwaysVisible || (() => false)
  };
}

test('keeps nearby detailed objects and swaps distant buildings to a proxy', () => {
  const building = entry('building-1', 250, 0, { proxy: true });
  const culler = createRenderCuller({ getPlayerPosition: () => ({ x: 0, z: 0 }), entries: [building] });
  const stats = culler.update(0, true);
  assert.equal(building.detailRoot.visible, false);
  assert.equal(building.proxyRoot.visible, true);
  assert.deepEqual([stats.visibleDetail, stats.visibleProxy, stats.culled], [0, 1, 0]);
  building.position.x = 50;
  culler.update(250);
  assert.equal(building.detailRoot.visible, true);
  assert.equal(building.proxyRoot.visible, false);
});

test('hides objects beyond render distance and re-enters without threshold flicker', () => {
  const tree = entry('tree-1', 350, 0, { proxy: true, detailDistance: 100, renderDistance: 300 });
  const culler = createRenderCuller({ getPlayerPosition: () => ({ x: 0, z: 0 }), entries: [tree], hysteresis: 20 });
  culler.update(0, true);
  assert.equal(tree.detailRoot.visible, false);
  assert.equal(tree.proxyRoot.visible, false);
  tree.position.x = 275;
  culler.update(250);
  assert.equal(tree.proxyRoot.visible, true);
  tree.position.x = 315;
  culler.update(500);
  assert.equal(tree.proxyRoot.visible, true);
  tree.position.x = 330;
  culler.update(750);
  assert.equal(tree.proxyRoot.visible, false);
});

test('gameplay-suppressed roots stay hidden even inside the detail range', () => {
  const building = entry('interior-building', 5, 0, { proxy: true });
  building.isSuppressed = () => true;
  const culler = createRenderCuller({ getPlayerPosition: () => ({ x: 0, z: 0 }), entries: [building] });
  culler.update(0, true);
  assert.equal(building.detailRoot.visible, false);
  assert.equal(building.proxyRoot.visible, false);
  assert.equal(culler.snapshot().culled, 1);
});

test('always-visible player vehicle is retained regardless of distance', () => {
  const vehicle = entry('player-car', 5000, 0, { kind: 'vehicle', alwaysVisible: () => true });
  const culler = createRenderCuller({ getPlayerPosition: () => ({ x: 0, z: 0 }), entries: [vehicle] });
  culler.update(0, true);
  assert.equal(vehicle.detailRoot.visible, true);
  assert.equal(culler.snapshot().byKind.vehicle.detail, 1);
});

test('throttles repeated culling passes and reports per-kind counts', () => {
  const building = entry('building-1', 50, 0);
  const pedestrian = entry('ped-1', 500, 0, { kind: 'pedestrian', renderDistance: 100 });
  const culler = createRenderCuller({ getPlayerPosition: () => ({ x: 0, z: 0 }), entries: [building, pedestrian], intervalMs: 200 });
  culler.update(0, true);
  const skipped = culler.update(100);
  assert.equal(skipped.updateCount, 1);
  const updated = culler.update(220);
  assert.equal(updated.updateCount, 2);
  assert.equal(updated.visibleDetail, 1);
  assert.equal(updated.culled, 1);
  assert.equal(updated.byKind.pedestrian.hidden, 1);
});
