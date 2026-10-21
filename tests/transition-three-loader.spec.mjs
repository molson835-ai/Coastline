import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreeWorldLoaderAdapter } from '../src/transition/three-world-loader.mjs';
import { testWorld } from './fixtures/transition-worlds.mjs';

class FakeObject3D {
  constructor() { this.isObject3D = true; this.parent = null; this.children = []; this.matrixUpdates = 0; }
  add(child) { if (child.parent) child.parent.remove(child); child.parent = this; this.children.push(child); }
  remove(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    if (child.parent === this) child.parent = null;
  }
  updateMatrixWorld() { this.matrixUpdates += 1; }
}
class FakeScene extends FakeObject3D {}
function setup(options = {}) {
  const scene = new FakeScene(), events = [], THREE = { Object3D: FakeObject3D };
  const adapter = new ThreeWorldLoaderAdapter({
    THREE, scene,
    prepareWorld: options.prepareWorld ?? (async () => ({
      root: new FakeObject3D(), resourceCounts: { meshes: 3, geometries: 2, textures: 1 },
      warm: async () => events.push('warm-hook'),
      activate: async () => events.push('activate-hook'),
      deactivate: async () => events.push('deactivate-hook'),
      disposeOwnedResources: async () => events.push('dispose-owned')
    }))
  });
  return { adapter, scene, events, THREE };
}
test('preload stages a detached root and warm prepares it without activating scene nodes', async () => {
  const { adapter, scene, events } = setup();
  const instance = await adapter.preload(testWorld('world-a'));
  assert.equal(instance.state, 'PRELOADED'); assert.equal(instance.resources.root.parent, null); assert.equal(scene.children.length, 0);
  assert.deepEqual(instance.resourceCounts, { meshes: 3, geometries: 2, textures: 1 });
  await adapter.warm(instance);
  assert.equal(instance.state, 'WARMED'); assert.equal(scene.children.length, 0); assert.ok(instance.resources.root.matrixUpdates > 0);
  assert.deepEqual(events, ['warm-hook']);
});
test('activation adds the staged root and deactivation removes it without disposing resources', async () => {
  const { adapter, scene, events } = setup();
  const instance = await adapter.preload(testWorld('world-a')); await adapter.warm(instance); await adapter.activate(instance);
  assert.equal(instance.state, 'ACTIVE'); assert.equal(instance.resources.root.parent, scene); assert.deepEqual(scene.children, [instance.resources.root]);
  await adapter.deactivate(instance);
  assert.equal(instance.state, 'DEACTIVATED'); assert.equal(instance.resources.root.parent, null); assert.equal(scene.children.length, 0);
  assert.equal(events.includes('dispose-owned'), false);
});
test('disposes explicitly owned resources once and never double-disposes on repeated calls', async () => {
  const { adapter, scene, events } = setup();
  const instance = await adapter.preload(testWorld('world-a')); await adapter.activate(instance);
  await adapter.dispose(instance, { reason: 'test' }); await adapter.dispose(instance, { reason: 'duplicate' });
  assert.equal(instance.state, 'DISPOSED'); assert.equal(instance.resources, null); assert.equal(scene.children.length, 0);
  assert.equal(events.filter(event => event === 'dispose-owned').length, 1);
});
test('rejects an early live-scene attachment and removes the destination before cleanup', async () => {
  let cleaned = 0;
  const scene = new FakeScene(), attachedRoot = new FakeObject3D();
  scene.add(attachedRoot);
  const adapter = new ThreeWorldLoaderAdapter({
    THREE: { Object3D: FakeObject3D }, scene,
    prepareWorld: async () => ({ root: attachedRoot, disposeOwnedResources: async () => { cleaned += 1; } })
  });
  await assert.rejects(adapter.preload(testWorld('world-a')), /attached to the live scene during preload/);
  assert.equal(cleaned, 1); assert.equal(attachedRoot.parent, null); assert.equal(scene.children.length, 0);
});
test('preload abort cleans staged assets and returns no instance', async () => {
  let cleaned = 0; const controller = new AbortController();
  const { adapter } = setup({ prepareWorld: async () => {
    controller.abort(new Error('cancelled during preparation'));
    return { root: new FakeObject3D(), disposeOwnedResources: async () => { cleaned += 1; } };
  } });
  await assert.rejects(adapter.preload(testWorld('world-a'), { signal: controller.signal }), /cancelled during preparation/);
  assert.equal(cleaned, 1);
});
test('requires an explicit ownership-aware resource disposer', async () => {
  const { adapter } = setup({ prepareWorld: async () => ({ root: new FakeObject3D() }) });
  await assert.rejects(adapter.preload(testWorld('world-a')), /disposeOwnedResources/);
});
