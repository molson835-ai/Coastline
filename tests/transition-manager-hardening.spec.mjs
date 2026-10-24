import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransitionManager } from '../transition-manager.js';

const world = (id, log, { delay = 5 } = {}) => ({
  id,
  load: async () => { log.push(`load ${id}`); await new Promise(resolve => setTimeout(resolve, delay)); return { id }; },
  unload: async () => { log.push(`unload ${id}`); },
});
const door = (id, from, to, extra = {}) => ({ id, fromWorld: from, toWorld: to, trigger: 'door', vehiclePolicy: 'allowed', destinationSpawn: { x: 1, y: 0, z: 1 }, ...extra });
const player = (x = 0) => ({ position: { x, y: 0, z: 0 } });

test('concurrent activate() of the same world loads it once and shares the handle', async () => {
  const log = [];
  const manager = createTransitionManager();
  manager.registerWorld(world('A', log));
  const [first, second] = await Promise.all([manager.activate('A'), manager.activate('A')]);
  assert.equal(log.filter(entry => entry === 'load A').length, 1);
  assert.equal(first, second);
  assert.equal(manager.getStatus().state, 'active');
});

test('activate() of a different world while one is loading is rejected as busy', async () => {
  const log = [];
  const manager = createTransitionManager();
  manager.registerWorld(world('A', log));
  manager.registerWorld(world('B', log));
  const loading = manager.activate('A');
  await assert.rejects(manager.activate('B'), /busy/);
  await loading;
  assert.deepEqual(log, ['load A']);
});

test('a throwing event listener cannot fail or degrade a transition', async () => {
  const log = [];
  const original = console.error; console.error = () => {};
  try {
    const manager = createTransitionManager({ onEvent: () => { throw new Error('listener bug'); } });
    manager.registerWorld(world('A', log));
    manager.registerWorld(world('B', log));
    manager.registerTransition(door('a-b', 'A', 'B'));
    await manager.activate('A');
    await manager.transition('a-b', { player: player() });
    const status = manager.getStatus();
    assert.equal(status.state, 'active');
    assert.equal(status.activeWorldId, 'B');
    assert.deepEqual(status.residentWorldIds, ['B']);
    assert.deepEqual(log, ['load A', 'load B', 'unload A']);
  } finally { console.error = original; }
});

test('non-plain transition context fails early with a clear error and leaves the manager usable', async () => {
  const log = [];
  const manager = createTransitionManager();
  manager.registerWorld(world('A', log));
  manager.registerWorld(world('B', log));
  manager.registerTransition(door('a-b', 'A', 'B'));
  await manager.activate('A');
  await assert.rejects(
    manager.transition('a-b', { player: player(), vehicle: { kind: 'car', mesh: { update() {} } } }),
    error => error.name === 'TransitionStateError' && /plain data/.test(error.message),
  );
  assert.equal(manager.getStatus().state, 'active');
  assert.equal(manager.getActiveWorldId(), 'A');
  await manager.transition('a-b', { player: player(), vehicle: { kind: 'car', position: { x: 0, y: 0, z: 0 } } });
  assert.equal(manager.getActiveWorldId(), 'B');
});

test('default spawn keeps the saved return point (existing behavior)', async () => {
  const log = []; const spawns = [];
  const home = world('A', log); const load = home.load;
  home.load = async args => { spawns.push(args.destinationSpawn); return load(args); };
  const manager = createTransitionManager();
  manager.registerWorld(home);
  manager.registerWorld(world('B', log));
  manager.registerTransition(door('a-b', 'A', 'B'));
  manager.registerTransition(door('b-a', 'B', 'A', { destinationSpawn: { x: 500, y: 0, z: 500 } }));
  await manager.activate('A');
  await manager.transition('a-b', { player: player(10) });
  await manager.transition('b-a', { player: player() });
  assert.deepEqual(spawns.at(-1), { x: 10, y: 0, z: 0 });
  assert.deepEqual(manager.restoreLastReturnPoint(), { x: 10, y: 0, z: 0 });
});

test("spawn: 'fixed' always uses the transition's own destinationSpawn", async () => {
  const log = []; const spawns = [];
  const home = world('A', log); const load = home.load;
  home.load = async args => { spawns.push(args.destinationSpawn); return load(args); };
  const manager = createTransitionManager();
  manager.registerWorld(home);
  manager.registerWorld(world('B', log));
  manager.registerTransition(door('a-b', 'A', 'B'));
  manager.registerTransition(door('b-a-bridge', 'B', 'A', { spawn: 'fixed', destinationSpawn: { x: 500, y: 0, z: 500 } }));
  await manager.activate('A');
  await manager.transition('a-b', { player: player(10) });
  await manager.transition('b-a-bridge', { player: player() });
  assert.deepEqual(spawns.at(-1), { x: 500, y: 0, z: 500 });
  assert.deepEqual(manager.restoreLastReturnPoint(), { x: 500, y: 0, z: 500 });
  assert.throws(() => manager.registerTransition(door('bad', 'A', 'B', { spawn: 'sideways' })), /invalid spawn policy/);
});
