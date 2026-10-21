import test from 'node:test';
import assert from 'node:assert/strict';
import { TransitionManager, TransitionBusyError, TransitionCancelledError } from '../src/transition/transition-manager.mjs';
import { WorldLoaderAdapter } from '../src/transition/world-loader-adapter.mjs';
import { testGate, testWorld } from './fixtures/transition-worlds.mjs';

function setup(options = {}) {
  const calls = [];
  const behavior = options.loaderImplementation || {};
  const loader = new WorldLoaderAdapter({
    preload: async manifest => { calls.push('preload:' + manifest.id); return { dispose: () => calls.push('release:' + manifest.id) }; },
    warm: async instance => { calls.push('warm:' + instance.id); instance.setState('WARMED'); },
    activate: async (instance, context) => { calls.push('activate:' + instance.id); if (behavior.activate) await behavior.activate(instance, context); instance.setState('ACTIVE'); },
    deactivate: async (instance, context) => { calls.push('deactivate:' + instance.id); if (behavior.deactivate) await behavior.deactivate(instance, context); if (!instance.disposed) instance.setState('DEACTIVATED'); },
    dispose: async (instance, context) => { calls.push('dispose:' + instance.id); if (behavior.dispose) await behavior.dispose(instance, context); instance.dispose(); }
  });
  const n = { value: 0 };
  const manager = new TransitionManager({ loader, stateHandoff: options.stateHandoff, telemetry: options.telemetry, idFactory: () => 'transition-' + (++n.value) });
  ['world-a', 'world-b', 'world-c'].forEach(id => manager.registerWorld(testWorld(id)));
  return { manager, calls };
}

async function startAtA(manager) { await manager.initializeWorld('world-a'); }

test('A to B to A retires old instances once', async () => {
  const { manager, calls } = setup();
  await startAtA(manager);
  assert.equal((await manager.requestTransition({ gate: testGate('world-a', 'world-b') }).promise).state, 'COMPLETE');
  assert.equal(manager.getActiveWorldId(), 'world-b');
  assert.equal((await manager.requestTransition({ gate: testGate('world-b', 'world-a') }).promise).state, 'COMPLETE');
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(calls.filter(x => x === 'release:world-a').length, 1);
  assert.equal(calls.filter(x => x === 'release:world-b').length, 1);
});

test('preload failure preserves the source world', async () => {
  const { manager } = setup();
  await startAtA(manager);
  manager.loader.implementation.preload = async () => { throw new Error('network unavailable'); };
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  await assert.rejects(handle.promise, /network unavailable/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(manager.getActiveWorld().state, 'ACTIVE');
  assert.equal(handle.getSnapshot().state, 'FAILED');
  assert.equal(handle.getSnapshot().committed, false);
});

test('activation failure rolls back state and disposes the destination', async () => {
  const rolledBack = [];
  const { manager, calls } = setup({
    loaderImplementation: { activate: async instance => { if (instance.id === 'world-b') throw new Error('activation failed'); } },
    stateHandoff: { capture: async s => structuredClone(s), validate: async () => true, restore: async s => ({ ...s }), rollback: async () => rolledBack.push(true) }
  });
  await startAtA(manager);
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b'), playerStateContext: { cash: 123 } });
  await assert.rejects(handle.promise, /activation failed/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.deepEqual(rolledBack, [true]);
  assert.ok(calls.includes('dispose:world-b'));
  assert.ok(handle.getSnapshot().history.some(row => row.state === 'RECOVERING'));
});

test('cancelling during preload disposes the late result and leaves source active', async () => {
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  const { manager, calls } = setup();
  await startAtA(manager);
  manager.loader.implementation.preload = async manifest => { await hold; return { dispose: () => calls.push('release:' + manifest.id) }; };
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(handle.cancel(), true);
  release();
  await assert.rejects(handle.promise, TransitionCancelledError);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.ok(calls.includes('release:world-b'));
});

test('coalesces same destination requests and rejects conflicting requests', async () => {
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  const { manager } = setup();
  await startAtA(manager);
  manager.loader.implementation.preload = async () => { await hold; return { dispose() {} }; };
  const first = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  const duplicate = manager.requestTransition({ gate: testGate('world-a', 'world-b', 'masked', 'alternate') });
  assert.equal(first, duplicate);
  assert.throws(() => manager.requestTransition({ gate: testGate('world-a', 'world-c') }), TransitionBusyError);
  assert.equal(manager.getActiveTransition(), first);
  release();
  assert.equal((await first.promise).state, 'COMPLETE');
});

test('rejects illegal lifecycle transitions', async () => {
  const { TransitionStateMachine } = await import('../src/transition/transition-state-machine.mjs');
  assert.throws(() => new TransitionStateMachine().transition('COMPLETE'), /invalid transition state change/);
});

test('telemetry errors are advisory and cannot fail gameplay transitions', async () => {
  const { manager } = setup({ telemetry: { start() { throw new Error('offline'); }, mark() { throw new Error('offline'); }, complete() { throw new Error('offline'); } } });
  await startAtA(manager);
  assert.equal((await manager.requestTransition({ gate: testGate('world-a', 'world-b') }).promise).state, 'COMPLETE');
});

test('immediate cancellation before preload starts is safe', async () => {
  const { manager, calls } = setup();
  await startAtA(manager);
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  assert.equal(handle.cancel(), true);
  await assert.rejects(handle.promise, TransitionCancelledError);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(calls.includes('preload:world-b'), false);
});
