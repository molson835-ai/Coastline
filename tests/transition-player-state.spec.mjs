import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerStateHandoff, validatePlayerStateSnapshot } from '../src/transition/player-state-handoff.mjs';

function snapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    player: { position: { x: 1, y: 0, z: 2 }, status: 'walking' },
    vehicle: { activeVehicle: null, condition: {}, upgrades: {}, customization: {} },
    economy: { money: 1200, inventory: [] },
    progression: { reputation: {}, progression: {} },
    mission: { activeMission: null, progress: {} },
    discoveries: { visited: [] },
    environment: { time: 'sunset', weather: 'clear' },
    worldState: {},
    ...overrides
  };
}

test('validates every core persistent-state section, allowing explicit null values', () => {
  const state = snapshot();
  assert.equal(validatePlayerStateSnapshot(state), true);
  assert.equal(state.vehicle.activeVehicle, null);
  assert.equal(state.mission.activeMission, null);
});

test('rejects incomplete, version-mismatched and invalid-economy snapshots', () => {
  assert.throws(() => validatePlayerStateSnapshot({}), /schemaVersion/);
  assert.throws(() => validatePlayerStateSnapshot(snapshot({ schemaVersion: 2 })), /schemaVersion/);
  assert.throws(() => validatePlayerStateSnapshot(snapshot({ player: { position: {} } })), /player.status/);
  assert.throws(() => validatePlayerStateSnapshot(snapshot({ economy: { money: -1, inventory: [] } })), /non-negative/);
});

test('capture returns an isolated snapshot and validates it before returning', async () => {
  const source = snapshot();
  const handoff = new PlayerStateHandoff({ captureSourceState: async () => source, restoreDestinationState: async () => true });
  const captured = await handoff.capture({ source: 'world-a' });
  source.economy.money = 0;
  assert.equal(captured.economy.money, 1200);
  assert.notEqual(captured, source);
});

test('restore validates and sends a separate snapshot to destination', async () => {
  let applied;
  const state = snapshot();
  const handoff = new PlayerStateHandoff({ captureSourceState: async () => state, restoreDestinationState: async copy => { applied = copy; copy.economy.money = 7; } });
  const captured = await handoff.capture({});
  const result = await handoff.restore(captured, { destinationWorldId: 'world-b' });
  assert.equal(result.restored, true);
  assert.equal(applied.economy.money, 7);
  assert.equal(captured.economy.money, 1200);
});

test('partially failing destination restore rolls back the destination backup and preserves the original error', async () => {
  const calls = [];
  const handoff = new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => { calls.push('restore'); throw new Error('apply failed'); },
    captureDestinationState: async () => ({ prior: 'destination-state' }),
    rollbackDestinationState: async backup => calls.push('rollback:' + backup.prior)
  });
  await assert.rejects(handoff.restore(await handoff.capture({}), {}), /apply failed/);
  assert.deepEqual(calls, ['restore', 'rollback:destination-state']);
});

test('rollback restores source-owned state through the injected owner callback', async () => {
  let rolledBack;
  const handoff = new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => true,
    rollbackSourceState: async value => { rolledBack = value; }
  });
  const captured = await handoff.capture({});
  await handoff.rollback(captured, { sourceWorldId: 'world-a' });
  assert.equal(rolledBack.economy.money, 1200);
  assert.notEqual(rolledBack, captured);
});

test('requires destination backup and rollback hooks to be configured together', () => {
  assert.throws(() => new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => true,
    captureDestinationState: async () => ({})
  }), /must be provided together/);
});

test('TransitionManager restores the canonical state before destination activation', async () => {
  const { TransitionManager } = await import('../src/transition/transition-manager.mjs');
  const { WorldLoaderAdapter } = await import('../src/transition/world-loader-adapter.mjs');
  const { testWorld, testGate } = await import('./fixtures/transition-worlds.mjs');
  const order = [];
  const loader = new WorldLoaderAdapter({
    preload: async manifest => ({ dispose: () => order.push('dispose:' + manifest.id) }),
    warm: async instance => instance.setState('WARMED'),
    activate: async (instance, context) => {
      order.push('activate:' + instance.id);
      if (instance.id === 'world-b') assert.equal(context.restoredState.restored, true);
      instance.setState('ACTIVE');
    },
    deactivate: async instance => instance.setState('DEACTIVATED')
  });
  const handoff = new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => { order.push('restore:world-b'); return { restored: true }; }
  });
  const manager = new TransitionManager({ loader, stateHandoff: handoff, idFactory: () => 'integration-transition' });
  manager.registerWorld(testWorld('world-a'));
  manager.registerWorld(testWorld('world-b'));
  await manager.initializeWorld('world-a');
  const result = await manager.requestTransition({ gate: testGate('world-a', 'world-b') }).promise;
  assert.equal(result.state, 'COMPLETE');
  assert.ok(order.indexOf('restore:world-b') < order.indexOf('activate:world-b'));
  assert.equal(result.stateHandoff.restored, true);
});

test('TransitionManager calls source rollback and leaves source active after activation fails', async () => {
  const { TransitionManager } = await import('../src/transition/transition-manager.mjs');
  const { WorldLoaderAdapter } = await import('../src/transition/world-loader-adapter.mjs');
  const { testWorld, testGate } = await import('./fixtures/transition-worlds.mjs');
  const order = [];
  const loader = new WorldLoaderAdapter({
    preload: async manifest => ({ dispose: () => order.push('dispose:' + manifest.id) }),
    warm: async instance => instance.setState('WARMED'),
    activate: async instance => { if (instance.id === 'world-b') throw new Error('destination activation denied'); instance.setState('ACTIVE'); },
    deactivate: async instance => instance.setState('DEACTIVATED')
  });
  const handoff = new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => true,
    rollbackSourceState: async () => order.push('rollback-source')
  });
  const manager = new TransitionManager({ loader, stateHandoff: handoff, idFactory: () => 'rollback-transition' });
  manager.registerWorld(testWorld('world-a'));
  manager.registerWorld(testWorld('world-b'));
  await manager.initializeWorld('world-a');
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  await assert.rejects(handle.promise, /destination activation denied/);
  assert.equal(manager.getActiveWorldId(), 'world-a');
  assert.equal(manager.getActiveWorld().state, 'ACTIVE');
  assert.ok(order.includes('rollback-source'));
  assert.ok(order.includes('dispose:world-b'));
});

test('manager reports destination rollback failures instead of dropping recovery diagnostics', async () => {
  const { TransitionManager } = await import('../src/transition/transition-manager.mjs');
  const { WorldLoaderAdapter } = await import('../src/transition/world-loader-adapter.mjs');
  const { testWorld, testGate } = await import('./fixtures/transition-worlds.mjs');
  const loader = new WorldLoaderAdapter({
    preload: async () => ({ dispose() {} }),
    warm: async instance => instance.setState('WARMED'),
    activate: async instance => instance.setState('ACTIVE'),
    deactivate: async instance => instance.setState('DEACTIVATED')
  });
  const handoff = new PlayerStateHandoff({
    captureSourceState: async () => snapshot(),
    restoreDestinationState: async () => { throw new Error('apply failed'); },
    captureDestinationState: async () => ({ old: true }),
    rollbackDestinationState: async () => { throw new Error('destination rollback failed'); }
  });
  const manager = new TransitionManager({ loader, stateHandoff: handoff, idFactory: () => 'diagnostic-transition' });
  manager.registerWorld(testWorld('world-a'));
  manager.registerWorld(testWorld('world-b'));
  await manager.initializeWorld('world-a');
  const handle = manager.requestTransition({ gate: testGate('world-a', 'world-b') });
  await assert.rejects(handle.promise, /apply failed/);
  assert.equal(handle.getSnapshot().failure.message, 'apply failed');
  assert.equal(handle.getSnapshot().failure.rollbackError.message, 'destination rollback failed');
  assert.equal(manager.getActiveWorldId(), 'world-a');
});
