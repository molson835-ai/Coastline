import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransitionManager } from '../transition-manager.js';

test('world definitions expose explicit content-density and render-readiness contracts', async () => {
  const manager = createTransitionManager();
  const roots = new Map();
  const makeWorld = (id, contentDensity) => ({
    id,
    content: { density: contentDensity, actorAssets: 'shared' },
    load: async () => {
      const root = { id: `${id}-root` };
      roots.set(id, root);
      return { id, root };
    },
    unload: async () => {},
  });

  manager.registerWorld(makeWorld('city', 'developed'));
  manager.registerWorld(makeWorld('future', 'sparse'));

  assert.deepEqual(manager.getWorldDefinition('city').content, {
    density: 'developed',
    actorAssets: 'shared',
    renderReadiness: 'required',
  });
  assert.deepEqual(manager.getWorldDefinition('future').content, {
    density: 'sparse',
    actorAssets: 'shared',
    renderReadiness: 'required',
  });
  assert.equal(manager.getWorldDefinitions().length, 2);
});

test('activation is idempotent and never creates a second resident root', async () => {
  const manager = createTransitionManager();
  let loads = 0;
  manager.registerWorld({
    id: 'homey',
    content: { density: 'developed', actorAssets: 'shared' },
    load: async () => ({ root: { id: `homey-root-${++loads}` } }),
    unload: async () => {},
  });

  const first = await manager.activate('homey');
  const second = await manager.activate('homey');

  assert.equal(first, second);
  assert.equal(loads, 1);
  assert.deepEqual(manager.getStatus().residentWorldIds, ['homey']);
});
