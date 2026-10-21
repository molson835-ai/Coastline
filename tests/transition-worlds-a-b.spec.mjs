import test from 'node:test';
import assert from 'node:assert/strict';
import { TransitionManager, TransitionCancelledError } from '../src/transition/transition-manager.mjs';
import { PlayerStateHandoff } from '../src/transition/player-state-handoff.mjs';
import { TransitionTelemetry } from '../src/transition/transition-telemetry.mjs';
import { ThreeWorldLoaderAdapter } from '../src/transition/three-world-loader.mjs';
import { createPhysicalGate, createMaskedGate } from '../src/transition/gate-providers.mjs';
import { testWorld } from './fixtures/transition-worlds.mjs';

class FakeObject3D {
  constructor(name) { this.name = name; this.isObject3D = true; this.parent = null; this.children = []; }
  add(child) { if (child.parent) child.parent.remove(child); child.parent = this; this.children.push(child); }
  remove(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    if (child.parent === this) child.parent = null;
  }
  updateMatrixWorld() {}
}
class FakeScene extends FakeObject3D { constructor() { super('scene'); } }

function playerSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    player: { position: { x: 12, y: 0, z: -18 }, status: 'driving' },
    vehicle: { activeVehicle: 'white-sedan', condition: { health: 0.93 }, upgrades: { engine: 2 }, customization: { paint: 'pearl' } },
    economy: { money: 4200, inventory: ['garage-key'] },
    progression: { reputation: { coastal: 8 }, progression: { district: 2 } },
    mission: { activeMission: null, progress: { completed: 4 } },
    discoveries: { visited: ['marina'] },
    environment: { time: 'sunset', weather: 'clear' },
    worldState: { garageDoorOpen: false },
    ...overrides
  };
}

function setup(options = {}) {
  const scene = new FakeScene();
  const events = [];
  const disposeCounts = new Map();
  const activateCounts = new Map();
  let serial = 0;
  const THREE = { Object3D: FakeObject3D };
  const loader = new ThreeWorldLoaderAdapter({
    THREE,
    scene,
    prepareWorld: async (manifest) => {
      if (options.failPreload?.(manifest)) throw new Error('injected preload failure for ' + manifest.id);
      const root = new FakeObject3D(manifest.id + '-' + (++serial));
      const prepared = {
        root,
        resourceCounts: { meshes: 2, geometries: 2, textures: 1 },
        warm: async () => {
          events.push('warm:' + manifest.id);
          if (options.failWarm?.(manifest)) throw new Error('injected warm failure for ' + manifest.id);
        },
        activate: async () => {
          events.push('activate:' + manifest.id);
          activateCounts.set(manifest.id, (activateCounts.get(manifest.id) || 0) + 1);
          if (options.failActivate?.(manifest)) throw new Error('injected activation failure for ' + manifest.id);
        },
        deactivate: async () => events.push('deactivate:' + manifest.id),
        disposeOwnedResources: async () => {
          events.push('dispose:' + manifest.id);
          disposeCounts.set(manifest.id, (disposeCounts.get(manifest.id) || 0) + 1);
        }
      };
      events.push('preload:' + manifest.id);
      return prepared;
    }
  });
  const telemetry = new TransitionTelemetry();
  const restored = [];
  const handoff = new PlayerStateHandoff({
    captureSourceState: async context => structuredClone(context?.snapshot ?? playerSnapshot()),
    restoreDestinationState: async (snapshot, context) => {
      events.push('restore:' + context.destinationWorldId);
      restored.push({ worldId: context.destinationWorldId, snapshot: structuredClone(snapshot) });
      context.destinationInstance.resources.prepared.restoredState = structuredClone(snapshot);
      if (options.failRestore?.(context)) throw new Error('injected restore failure');
      return { restored: true, sourceWorldId: context.sourceWorldId, destinationWorldId: context.destinationWorldId };
    },
    rollbackSourceState: async (_snapshot, context) => events.push('rollback-source:' + context.sourceWorldId)
  });
  const idFactory = (() => { let n = 0; return () => 'ab-' + (++n); })();
  const manager = new TransitionManager({ loader, stateHandoff: handoff, telemetry, idFactory });
  for (const id of ['world-a', 'world-b', 'world-c']) manager.registerWorld(testWorld(id));
  return { manager, scene, events, disposeCounts, activateCounts, restored, telemetry };
}

const setImmediatePromise = () => new Promise(resolve => setImmediate(resolve));
async function waitForState(handle, state, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    if (handle.getSnapshot().state === state) return;
    await setImmediatePromise();
  }
  throw new Error('transition did not reach ' + state + '; saw ' + handle.getSnapshot().state);
}

test('acceptance: synthetic World A -> B -> A transfers state and releases each retired root', async () => {
  const { manager, scene, events, disposeCounts, restored, telemetry } = setup();
  await manager.initializeWorld('world-a');
  const state = playerSnapshot();
  const toB = manager.requestTransition({ gate: createPhysicalGate({ id:'bridge-a-b', fromWorld:'world-a', toWorld:'world-b', preloadDistance:100, activationDistance:8, spawnPoint:'island-entry', fallbackPoint:'city-safe' }), playerStateContext:{ snapshot:state } });
  const resultB = await toB.promise;
  assert.equal(resultB.state, 'COMPLETE');
  assert.equal(manager.getActiveWorldId(), 'world-b');
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0].name.startsWith('world-b-'), true);
  assert.equal(restored[0].snapshot.economy.money, 4200);
  assert.equal(restored[0].snapshot.vehicle.activeVehicle, 'white-sedan');
  assert.ok(events.indexOf('restore:world-b') < events.indexOf('activate:world-b'));
  assert.equal(disposeCounts.get('world-a'), 1);
  assert.equal(telemetry.get(toB.id).status, 'COMPLETE');
  const toA = manager.requestTransition({ gate: createPhysicalGate({ id:'tunnel-b-a', fromWorld:'world-b', toWorld:'world-a', preloadDistance:90, activationDistance:7, spawnPoint:'city-entry', fallbackPoint:'island-safe' }), playerStateContext:{ snapshot:state } });
  const resultA = await toA.promise;
  assert.equal(resultA.state, 'COMPLETE');
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0].name.startsWith('world-a-'), true);
  assert.equal(disposeCounts.get('world-b'), 1);
  assert.equal(telemetry.get(toA.id).status, 'COMPLETE');
});

test('acceptance: destination preload failure never inserts destination or retires source', async () => {
  const { manager, scene, disposeCounts } = setup({ failPreload: manifest => manifest.id === 'world-b' });
  await manager.initializeWorld('world-a');
  const sourceRoot = scene.children[0];
  const handle = manager.requestTransition({ gate: createPhysicalGate({ id:'bridge-a-b', fromWorld:'world-a', toWorld:'world-b', preloadDistance:100, activationDistance:8, spawnPoint:'island-entry', fallbackPoint:'city-safe' }) });
  await assert.rejects(handle.promise, /injected preload failure/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.deepEqual(scene.children, [sourceRoot]);
  assert.equal(sourceRoot.parent, scene);
  assert.equal(disposeCounts.get('world-b') ?? 0, 0);
  assert.equal(handle.getSnapshot().state, 'FAILED');
});

test('acceptance: activation failure rolls back persistent state and retains only source world', async () => {
  const { manager, scene, events, disposeCounts, telemetry } = setup({ failActivate: manifest => manifest.id === 'world-b' });
  await manager.initializeWorld('world-a');
  const sourceRoot = scene.children[0];
  const handle = manager.requestTransition({
    gate: createPhysicalGate({ id:'bridge-a-b', fromWorld:'world-a', toWorld:'world-b', preloadDistance:100, activationDistance:8, spawnPoint:'island-entry', fallbackPoint:'city-safe' }),
    playerStateContext: { snapshot: playerSnapshot() }
  });
  await assert.rejects(handle.promise, /injected activation failure/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.deepEqual(scene.children, [sourceRoot]);
  assert.equal(disposeCounts.get('world-b'), 1);
  assert.ok(events.includes('rollback-source:world-a'));
  assert.equal(telemetry.get(handle.id).status, 'FAILED');
  assert.ok(handle.getSnapshot().history.some(entry => entry.state === 'RECOVERING'));
});

test('acceptance: failed state restoration fails safely before destination activation', async () => {
  const { manager, scene, activateCounts, disposeCounts } = setup({ failRestore: () => true });
  await manager.initializeWorld('world-a');
  const sourceRoot = scene.children[0];
  const handle = manager.requestTransition({
    gate: createPhysicalGate({ id:'bridge-a-b', fromWorld:'world-a', toWorld:'world-b', preloadDistance:100, activationDistance:8, spawnPoint:'island-entry', fallbackPoint:'city-safe' }),
    playerStateContext: { snapshot: playerSnapshot() }
  });
  await assert.rejects(handle.promise, /injected restore failure/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.deepEqual(scene.children, [sourceRoot]);
  assert.equal(activateCounts.get('world-b') ?? 0, 0);
  assert.equal(disposeCounts.get('world-b'), 1);
});

test('acceptance: masked gate preloads while waiting and cancellation leaves source active', async () => {
  const { manager, scene, activateCounts, disposeCounts } = setup();
  await manager.initializeWorld('world-a');
  const sourceRoot = scene.children[0];
  let releaseBarrier;
  const barrier = new Promise(resolve => { releaseBarrier = resolve; });
  const gate = createMaskedGate({ id:'mansion-doorman', fromWorld:'world-a', toWorld:'world-b', preloadDistance:100, activationDistance:8, spawnPoint:'lobby', fallbackPoint:'front-walk' });
  const handle = manager.requestTransition({ gate, activationBarrier: () => barrier });
  await waitForState(handle, 'READY');
  assert.equal(scene.children.length, 1);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(handle.cancel(), true);
  await assert.rejects(handle.promise, TransitionCancelledError);
  releaseBarrier('handoff complete');
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.deepEqual(scene.children, [sourceRoot]);
  assert.equal(activateCounts.get('world-b') ?? 0, 0);
  assert.equal(disposeCounts.get('world-b'), 1);
});

test('acceptance: rapid sequential A -> B -> A -> B leaves one authoritative root', async () => {
  const { manager, scene, disposeCounts } = setup();
  await manager.initializeWorld('world-a');
  const gate = (fromWorld, toWorld, id) => createPhysicalGate({ id, fromWorld, toWorld, preloadDistance:100, activationDistance:8, spawnPoint:'default', fallbackPoint:'safe' });
  await manager.requestTransition({ gate:gate('world-a','world-b','a-b-1') }).promise;
  await manager.requestTransition({ gate:gate('world-b','world-a','b-a') }).promise;
  await manager.requestTransition({ gate:gate('world-a','world-b','a-b-2') }).promise;
  assert.equal(manager.getActiveWorldId(), 'world-b');
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0].name.startsWith('world-b-'), true);
  assert.equal(disposeCounts.get('world-a'), 2);
  assert.equal(disposeCounts.get('world-b'), 1);
});
