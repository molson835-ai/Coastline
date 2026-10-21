export function validateWorldManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('world manifest must be an object');
  if (typeof manifest.id !== 'string' || !manifest.id.trim()) throw new TypeError('world manifest id is required');
  if (!Number.isInteger(manifest.version) || manifest.version < 1) throw new TypeError('world manifest version must be a positive integer');
  const required = ['assetManifest','entryPoints','gates','spawnPoints','memoryBudget','streamingPriority','collisionPolicy','aiPolicy','missionPolicy','environment','persistencePolicy'];
  for (const key of required) if (!(key in manifest)) throw new TypeError(`world manifest ${key} is required`);
  return true;
}

function snapshot(manifest) {
  return structuredClone(manifest);
}

export class WorldRegistry {
  #worlds = new Map();

  register(manifest) {
    validateWorldManifest(manifest);
    if (this.#worlds.has(manifest.id)) throw new Error(`duplicate world ID: ${manifest.id}`);
    this.#worlds.set(manifest.id, snapshot(manifest));
    return this.get(manifest.id);
  }

  get(worldId) {
    const manifest = this.#worlds.get(worldId);
    return manifest ? snapshot(manifest) : undefined;
  }

  has(worldId) { return this.#worlds.has(worldId); }
  list() { return [...this.#worlds.values()].map(snapshot); }
}
