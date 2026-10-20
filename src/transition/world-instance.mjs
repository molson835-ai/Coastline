export const WORLD_INSTANCE_STATES = Object.freeze(['PRELOADED','WARMED','ACTIVE','DEACTIVATED','DISPOSED']);

export class WorldInstance {
  constructor(manifest, resources = null) {
    this.id = manifest.id;
    this.version = manifest.version;
    this.manifest = structuredClone(manifest);
    this.resources = resources;
    this.state = 'PRELOADED';
    this.resourceCounts = { meshes: 0, geometries: 0, textures: 0 };
    this.disposed = false;
  }

  setState(state) {
    if (!WORLD_INSTANCE_STATES.includes(state)) throw new Error(`invalid world instance state: ${state}`);
    this.state = state;
  }

  dispose() {
    if (this.disposed) return false;
    this.disposed = true;
    this.state = 'DISPOSED';
    this.resources?.dispose?.();
    this.resources = null;
    return true;
  }
}
