import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldRegistry, validateWorldManifest } from '../src/transition/world-registry.mjs';

const base = () => ({
  id: 'world-a', version: 1, assetManifest: [], entryPoints: [], gates: [],
  spawnPoints: [{ id: 'spawn-a' }], memoryBudget: 100, streamingPriority: 1,
  collisionPolicy: {}, aiPolicy: {}, missionPolicy: {}, environment: {}, persistencePolicy: {}
});

test('registers and returns an immutable world manifest snapshot', () => {
  const registry = new WorldRegistry();
  registry.register(base());
  const found = registry.get('world-a');
  assert.equal(found.id, 'world-a');
  found.entryPoints.push('mutated');
  assert.deepEqual(registry.get('world-a').entryPoints, []);
});

test('rejects duplicate world IDs', () => {
  const registry = new WorldRegistry();
  registry.register(base());
  assert.throws(() => registry.register(base()), /duplicate/i);
});

test('rejects missing IDs and invalid versions', () => {
  assert.throws(() => validateWorldManifest({ ...base(), id: '' }), /id/i);
  assert.throws(() => validateWorldManifest({ ...base(), version: 0 }), /version/i);
});
