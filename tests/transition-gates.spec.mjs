import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateDefinition, validateGateDefinition } from '../src/transition/gate-definition.mjs';
import { createPhysicalGate, createMaskedGate, createExplicitGate, createGateTransitionRequest } from '../src/transition/gate-providers.mjs';

function gateInput(overrides = {}) {
  return {
    id: 'gate-a-b', fromWorld: 'world-a', toWorld: 'world-b', type: 'physical',
    preloadDistance: 120, activationDistance: 8, spawnPoint: 'arrival', fallbackPoint: 'safe-arrival',
    metadata: { district: 'waterfront' }, ...overrides
  };
}

test('gate definition validates and preserves stable metadata', () => {
  const input = gateInput();
  assert.equal(validateGateDefinition(input), true);
  const created = createGateDefinition(input);
  assert.deepEqual(created, input);
  assert.notEqual(created, input);
});

test('rejects invalid gate IDs, worlds, distances, types and fallback points', () => {
  assert.throws(() => createGateDefinition(gateInput({ id: '' })), /gate ID/);
  assert.throws(() => createGateDefinition(gateInput({ toWorld: 'world-a' })), /must differ/);
  assert.throws(() => createGateDefinition(gateInput({ activationDistance: 140 })), /cannot exceed/);
  assert.throws(() => createGateDefinition(gateInput({ preloadDistance: -1 })), /non-negative/);
  assert.throws(() => createGateDefinition(gateInput({ type: 'teleport' })), /unsupported gate type/);
  assert.throws(() => createGateDefinition(gateInput({ fallbackPoint: '' })), /fallbackPoint/);
});

test('physical, masked and explicit providers generate the same serializable gate contract', () => {
  const physical = createPhysicalGate(gateInput());
  const masked = createMaskedGate(gateInput({ id: 'elevator-a-b' }));
  const explicit = createExplicitGate(gateInput({ id: 'travel-a-b' }));
  assert.equal(physical.type, 'physical');
  assert.equal(masked.type, 'masked');
  assert.equal(explicit.type, 'explicit');
  for (const item of [physical, masked, explicit]) {
    assert.equal(item.fromWorld, 'world-a');
    assert.equal(item.toWorld, 'world-b');
    assert.equal(item.spawnPoint, 'arrival');
    assert.equal(item.fallbackPoint, 'safe-arrival');
  }
});

test('normalizes every provider into the same manager request shape', () => {
  const request = createGateTransitionRequest({ gate: createPhysicalGate(gateInput()), sourceWorldId: 'world-a', playerStateContext: { cash: 100 } });
  assert.deepEqual(Object.keys(request).sort(), ['gate', 'playerStateContext', 'sourceWorldId']);
  assert.equal(request.sourceWorldId, 'world-a');
  assert.equal(request.gate.type, 'physical');
});

test('masked gates require an activation barrier and keep callback out of serialized gate data', async () => {
  const waitForHandoff = async () => 'animation-ready';
  const request = createGateTransitionRequest({ gate: createMaskedGate(gateInput({ type: 'masked' })), sourceWorldId: 'world-a', waitForHandoff });
  assert.equal(typeof request.activationBarrier, 'function');
  assert.equal(Object.hasOwn(request.gate, 'activationBarrier'), false);
  assert.equal(await request.activationBarrier({}), 'animation-ready');
  assert.throws(() => createGateTransitionRequest({ gate: createMaskedGate(gateInput()), sourceWorldId: 'world-a' }), /require a waitForHandoff/);
});

test('normalized request cannot claim a source world other than the gate source', () => {
  assert.throws(() => createGateTransitionRequest({ gate: createPhysicalGate(gateInput()), sourceWorldId: 'world-c' }), /must match/);
});

test('manager waits at READY for a masked handoff barrier and can be cancelled during the wait', async () => {
  const { TransitionManager, TransitionCancelledError } = await import('../src/transition/transition-manager.mjs');
  const { WorldLoaderAdapter } = await import('../src/transition/world-loader-adapter.mjs');
  const { testWorld } = await import('./fixtures/transition-worlds.mjs');
  const manager = new TransitionManager({
    loader: new WorldLoaderAdapter({
      preload: async () => ({ dispose() {} }),
      warm: async instance => instance.setState('WARMED'),
      activate: async instance => instance.setState('ACTIVE'),
      deactivate: async instance => instance.setState('DEACTIVATED')
    }),
    idFactory: () => 'masked-wait-test'
  });
  manager.registerWorld(testWorld('world-a'));
  manager.registerWorld(testWorld('world-b'));
  await manager.initializeWorld('world-a');
  let signal;
  let activationCount = 0;
  let ready;
  const wait = new Promise(resolve => { ready = resolve; });
  const handle = manager.requestTransition({
    gate: createMaskedGate(gateInput()),
    activationBarrier: ({ signal: suppliedSignal }) => { signal = suppliedSignal; return wait; }
  });
  while (handle.getSnapshot().state !== 'READY') await new Promise(resolve => setImmediate(resolve));
  assert.equal(handle.cancel(), true);
  ready('animation skipped');
  await assert.rejects(handle.promise, TransitionCancelledError);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(activationCount, 0);
});
