export function testWorld(id) {
  return {
    id,
    version: 1,
    assetManifest: [],
    entryPoints: [{ id: 'default' }],
    gates: [],
    spawnPoints: [{ id: 'spawn-default', position: { x: 0, y: 0, z: 0 } }],
    memoryBudget: 64,
    streamingPriority: 1,
    collisionPolicy: {},
    aiPolicy: {},
    missionPolicy: {},
    environment: {},
    persistencePolicy: {}
  };
}

export function testGate(fromWorld, toWorld, type = 'physical', id = fromWorld + '-to-' + toWorld) {
  return {
    id, fromWorld, toWorld, type,
    preloadDistance: 80,
    activationDistance: 8,
    spawnPoint: 'spawn-default',
    fallbackPoint: 'spawn-default'
  };
}
