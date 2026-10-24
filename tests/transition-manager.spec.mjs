import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransitionManager } from '../transition-manager.js';

test('registers worlds and rejects transitions with unknown worlds', () => {
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  assert.throws(
    () => manager.registerTransition({ id: 'bridge-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'allowed' }),
    /unknown world/i,
  );
});

test('transitions from world 1 to world 2 and leaves only world 2 active', async () => {
  const events = [];
  const manager = createTransitionManager({ onEvent: (event) => events.push(event) });
  let world1Unloaded = false;
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => { world1Unloaded = true; } });
  manager.registerWorld({ id: 'world-2', name: 'Island', load: async () => ({ id: 'world-2' }), unload: async () => {} });
  manager.registerTransition({ id: 'bridge-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 10, y: 0, z: 20 }, vehiclePolicy: 'allowed' });
  await manager.activate('world-1');

  await manager.transition('bridge-1', { player: { position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 }, vehicle: null });

  assert.equal(manager.getActiveWorldId(), 'world-2');
  assert.equal(world1Unloaded, true);
  assert.equal(manager.getStatus().state, 'active');
  assert.deepEqual(manager.getStatus().residentWorldIds, ['world-2']);
  assert.deepEqual(events.map((event) => event.type), [
    'world:activated',
    'transition:started',
    'transition:loading',
    'transition:unloading',
    'world:disposed',
    'world:activated',
    'transition:completed',
  ]);
});

test('preserves vehicle state when the transition allows a vehicle', async () => {
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  manager.registerWorld({ id: 'world-2', name: 'Island', load: async () => ({ id: 'world-2' }), unload: async () => {} });
  manager.registerTransition({ id: 'bridge-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 10, y: 0, z: 20 }, vehiclePolicy: 'allowed' });
  await manager.activate('world-1');
  const context = { player: { position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 }, vehicle: { id: 'sedan-1', position: { x: 2, y: 0, z: 3 }, rotationY: 1.25, speed: 12 } };

  await manager.transition('bridge-1', context);

  assert.deepEqual(context.vehicle, { id: 'sedan-1', position: { x: 2, y: 0, z: 3 }, rotationY: 1.25, speed: 12 });
  assert.deepEqual(manager.getStatus().lastTransitionState.vehicle, context.vehicle);
});

test('rejects a vehicle-required transition when no vehicle is present', async () => {
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  manager.registerWorld({ id: 'world-2', name: 'Garage', load: async () => ({ id: 'world-2' }), unload: async () => {} });
  manager.registerTransition({ id: 'garage-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'garage', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'required' });
  await manager.activate('world-1');

  await assert.rejects(() => manager.transition('garage-1', { player: {}, vehicle: null }), /vehicle is required/i);
  assert.equal(manager.getActiveWorldId(), 'world-1');
});

test('failed destination loading leaves the source world active and preserves the failure cause', async () => {
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  manager.registerWorld({ id: 'world-2', name: 'Broken Island', load: async () => { throw new Error('island asset load failed'); }, unload: async () => {} });
  manager.registerTransition({ id: 'bridge-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'allowed' });
  await manager.activate('world-1');

  await assert.rejects(() => manager.transition('bridge-1', { player: {}, vehicle: null }), /island asset load failed/);
  assert.equal(manager.getActiveWorldId(), 'world-1');
  assert.equal(manager.getStatus().state, 'active');
  assert.match(manager.getStatus().lastFailure.message, /island asset load failed/);
});

test('rejects a competing transition while a transition is loading', async () => {
  let release;
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  manager.registerWorld({ id: 'world-2', name: 'Island', load: () => new Promise((resolve) => { release = () => resolve({ id: 'world-2' }); }), unload: async () => {} });
  manager.registerWorld({ id: 'world-3', name: 'Home', load: async () => ({ id: 'world-3' }), unload: async () => {} });
  manager.registerTransition({ id: 'bridge-1', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'allowed' });
  manager.registerTransition({ id: 'door-1', fromWorld: 'world-1', toWorld: 'world-3', trigger: 'door', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'forbidden' });
  await manager.activate('world-1');

  const first = manager.transition('bridge-1', { player: {}, vehicle: null });
  await assert.rejects(() => manager.transition('door-1', { player: {}, vehicle: null }), /transition.*busy/i);
  release();
  await first;
});

test('restores the last return point after a successful round trip', async () => {
  const manager = createTransitionManager();
  manager.registerWorld({ id: 'world-1', name: 'City', load: async () => ({ id: 'world-1' }), unload: async () => {} });
  manager.registerWorld({ id: 'world-2', name: 'Island', load: async () => ({ id: 'world-2' }), unload: async () => {} });
  manager.registerTransition({ id: 'bridge-out', fromWorld: 'world-1', toWorld: 'world-2', trigger: 'bridge', destinationSpawn: { x: 10, y: 0, z: 20 }, returnPoint: { x: 99, y: 0, z: 88 }, vehiclePolicy: 'allowed' });
  manager.registerTransition({ id: 'bridge-back', fromWorld: 'world-2', toWorld: 'world-1', trigger: 'bridge', destinationSpawn: { x: 1, y: 0, z: 2 }, vehiclePolicy: 'allowed' });
  await manager.activate('world-1');
  await manager.transition('bridge-out', { player: { position: { x: 4, y: 0, z: 5 }, rotationY: 0.1 }, vehicle: null });
  await manager.transition('bridge-back', { player: { position: { x: 10, y: 0, z: 20 }, rotationY: 0.2 }, vehicle: null });

  assert.deepEqual(manager.restoreLastReturnPoint(), { x: 99, y: 0, z: 88 });
});

test('passes the validated destination spawn and transition state to the destination adapter', async () => {
  const manager = createTransitionManager();
  let loadArgs;
  manager.registerWorld({ id: 'city', name: 'City', load: async () => ({ id: 'city' }), unload: async () => {} });
  manager.registerWorld({ id: 'island', name: 'Island', load: async (args) => { loadArgs = args; return { id: 'island' }; }, unload: async () => {} });
  const destinationSpawn = { x: 120, y: 3, z: -40, rotationY: 1.2 };
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn, vehiclePolicy: 'allowed' });
  await manager.activate('city');
  const player = { position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 };
  const vehicle = { id: 'sedan', position: { x: 2, y: 0, z: 3 }, rotationY: 1.25, speed: 12 };

  await manager.transition('city-to-island', { player, vehicle });

  assert.deepEqual(loadArgs.destinationSpawn, destinationSpawn);
  assert.deepEqual(loadArgs.transitionState.player, player);
  assert.deepEqual(loadArgs.transitionState.vehicle, vehicle);
});

test('captures source world state before destination load can mutate the shared context', async () => {
  const manager = createTransitionManager();
  let captured;
  manager.registerWorld({
    id: 'city',
    name: 'City',
    load: async () => ({ id: 'city' }),
    unload: async () => {},
    captureState: async ({ context }) => {
      captured = structuredClone(context.player);
      return { player: structuredClone(context.player) };
    },
  });
  manager.registerWorld({
    id: 'island',
    name: 'Island',
    load: async ({ context }) => {
      context.player.position.x = 500;
      context.player.position.z = 500;
      return { id: 'island' };
    },
    unload: async () => {},
  });
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: { x: 500, y: 0, z: 500 }, vehiclePolicy: 'allowed' });
  await manager.activate('city');
  const context = { player: { position: { x: 12, y: 0, z: -34 }, rotationY: 0.25 }, vehicle: null };

  await manager.transition('city-to-island', context);

  assert.deepEqual(captured, { position: { x: 12, y: 0, z: -34 }, rotationY: 0.25 });
  assert.deepEqual(manager.getStatus().lastTransitionState.worldState, { player: captured });
});

test('cleans up partial destination resources when the destination loader fails before returning a handle', async () => {
  const manager = createTransitionManager();
  let partialResources = false;
  let cleanupCalls = 0;
  manager.registerWorld({ id: 'city', name: 'City', load: async () => ({ id: 'city' }), unload: async () => {} });
  manager.registerWorld({
    id: 'island',
    name: 'Island',
    load: async () => {
      partialResources = true;
      throw new Error('island construction failed');
    },
    cleanupFailedLoad: async () => { cleanupCalls += 1; partialResources = false; },
    unload: async () => {},
  });
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'allowed' });
  await manager.activate('city');

  await assert.rejects(() => manager.transition('city-to-island', {}), /island construction failed/);

  assert.equal(cleanupCalls, 1);
  assert.equal(partialResources, false);
  assert.equal(manager.getActiveWorldId(), 'city');
  assert.deepEqual(manager.getStatus().residentWorldIds, ['city']);
});

test('reports source-unload failure and retains accurate resident-world status', async () => {
  const events = [];
  const manager = createTransitionManager({ onEvent: (event) => events.push(event) });
  let destinationUnloadCalls = 0;
  manager.registerWorld({ id: 'city', name: 'City', load: async () => ({ id: 'city' }), unload: async () => { throw new Error('city disposal failed'); } });
  manager.registerWorld({ id: 'island', name: 'Island', load: async () => ({ id: 'island' }), unload: async () => { destinationUnloadCalls += 1; } });
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: { x: 0, y: 0, z: 0 }, vehiclePolicy: 'allowed' });
  await manager.activate('city');

  await assert.rejects(() => manager.transition('city-to-island', {}), /city disposal failed/);

  assert.equal(manager.getActiveWorldId(), 'city');
  assert.equal(manager.getStatus().state, 'degraded');
  assert.deepEqual(manager.getStatus().residentWorldIds, ['city']);
  assert.equal(destinationUnloadCalls, 1);
  assert.equal(manager.getStatus().lastFailure.phase, 'source-unload');
  assert.equal(events.at(-1).type, 'transition:failed');
  assert.equal(events.at(-1).phase, 'source-unload');
});
