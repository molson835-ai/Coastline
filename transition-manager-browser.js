import { createTransitionManager } from './transition-manager.js';

const manager = createTransitionManager({
  onEvent(event) {
    window.dispatchEvent(new CustomEvent(`coastline:${event.type}`, { detail: event }));
  },
});

manager.registerWorld({
  id: 'world-1',
  name: 'Coastline City',
  load: async ({ reason }) => ({ id: 'world-1', kind: 'placeholder', reason }),
  unload: async () => {},
});

manager.registerWorld({
  id: 'world-2',
  name: 'Island Placeholder',
  load: async ({ reason }) => ({ id: 'world-2', kind: 'placeholder', reason }),
  unload: async () => {},
});

manager.registerTransition({
  id: 'bridge-world-1-to-world-2',
  fromWorld: 'world-1',
  toWorld: 'world-2',
  trigger: 'bridge',
  destinationSpawn: { x: 0, y: 0, z: 0 },
  vehiclePolicy: 'allowed',
});

manager.registerTransition({
  id: 'bridge-world-2-to-world-1',
  fromWorld: 'world-2',
  toWorld: 'world-1',
  trigger: 'bridge',
  destinationSpawn: { x: 0, y: 0, z: 0 },
  vehiclePolicy: 'allowed',
});

await manager.activate('world-1');

window.__coastlineTransitionManager = manager;
window.__coastlineTransitionTest = {
  status: () => manager.getStatus(),
  activeWorld: () => manager.getActiveWorldId(),
  canTransition: (id, context = {}) => manager.canTransition(id, context),
  transition: (id, context = {}) => manager.transition(id, context),
  returnPoint: () => manager.restoreLastReturnPoint(),
};
