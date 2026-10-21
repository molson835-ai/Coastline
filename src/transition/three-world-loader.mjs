import { WorldInstance } from './world-instance.mjs';

function assertContextAbort(context) {
  if (context?.signal?.aborted) {
    const reason = context.signal.reason;
    if (reason instanceof Error) throw reason;
    const error = new Error('world load aborted');
    error.name = 'AbortError';
    error.code = 'TRANSITION_CANCELLED';
    throw error;
  }
}

/**
 * Three.js adapter for the existing game-v3 runtime. prepareWorld must stage a detached
 * Object3D root and return an ownership-aware disposer. The adapter never guesses which
 * geometry/material/texture resources are shared; the factory owns that decision.
 */
export class ThreeWorldLoaderAdapter {
  constructor({ THREE, scene, prepareWorld } = {}) {
    if (!THREE || typeof THREE.Object3D !== 'function') throw new TypeError('THREE.Object3D constructor is required');
    if (!scene || typeof scene.add !== 'function' || typeof scene.remove !== 'function') {
      throw new TypeError('Three.js scene with add/remove methods is required');
    }
    if (typeof prepareWorld !== 'function') throw new TypeError('prepareWorld callback is required');
    this.THREE = THREE;
    this.scene = scene;
    this.prepareWorld = prepareWorld;
  }

  async preload(manifest, context = {}) {
    assertContextAbort(context);
    let prepared;
    try {
      prepared = await this.prepareWorld(manifest, { ...context, scene: this.scene, THREE: this.THREE });
      assertContextAbort(context);
      const root = prepared?.root;
      if (!root || root.isObject3D !== true || !(root instanceof this.THREE.Object3D)) {
        throw new TypeError('prepareWorld must return a Three.js Object3D root');
      }
      // Prevent an incorrectly staged destination from leaking into the active source scene.
      // Do not detach a root from an unrelated parent; it may belong to another world.
      if (root.parent === this.scene) {
        this.scene.remove(root);
        throw new Error('prepared world root was attached to the live scene during preload; it was removed');
      }
      if (root.parent) throw new Error('prepared world root must be detached from every scene/group');
      if (typeof prepared.disposeOwnedResources !== 'function') {
        throw new TypeError('prepareWorld must return disposeOwnedResources() for explicit resource ownership');
      }
      const resources = {
        root,
        prepared,
        disposedResources: false,
        // The async cleanup below owns the lifecycle boundary; this no-op avoids a second,
        // un-awaited cleanup call from the base WorldInstance class.
        dispose() {}
      };
      const instance = new WorldInstance(manifest, resources);
      const counts = prepared.resourceCounts;
      if (counts && typeof counts === 'object') {
        for (const key of ['meshes', 'geometries', 'textures']) {
          if (Number.isFinite(counts[key]) && counts[key] >= 0) instance.resourceCounts[key] = counts[key];
        }
      }
      return instance;
    } catch (error) {
      if (prepared && typeof prepared.disposeOwnedResources === 'function') {
        try { await prepared.disposeOwnedResources({ reason: 'preload-rejected', manifest, context }); } catch { /* preserve original failure */ }
      }
      throw error;
    }
  }

  async warm(instance, context = {}) {
    assertContextAbort(context);
    const resources = this.#resources(instance);
    if (instance.disposed) throw new Error('cannot warm a disposed world instance');
    await resources.prepared.warm?.({ ...context, scene: this.scene, THREE: this.THREE, root: resources.root });
    assertContextAbort(context);
    resources.root.updateMatrixWorld?.(true);
    instance.setState('WARMED');
    return instance;
  }

  async activate(instance, context = {}) {
    assertContextAbort(context);
    const resources = this.#resources(instance);
    if (instance.disposed) throw new Error('cannot activate a disposed world instance');
    if (resources.root.parent && resources.root.parent !== this.scene) {
      throw new Error('world root is attached to a different parent before activation');
    }
    await resources.prepared.activate?.({ ...context, scene: this.scene, THREE: this.THREE, root: resources.root });
    assertContextAbort(context);
    if (resources.root.parent !== this.scene) this.scene.add(resources.root);
    resources.root.updateMatrixWorld?.(true);
    instance.setState('ACTIVE');
    return instance;
  }

  async deactivate(instance, context = {}) {
    if (instance.disposed) return instance;
    const resources = this.#resources(instance);
    if (resources.root.parent === this.scene) this.scene.remove(resources.root);
    await resources.prepared.deactivate?.({ ...context, scene: this.scene, THREE: this.THREE, root: resources.root });
    instance.setState('DEACTIVATED');
    return instance;
  }

  async dispose(instance, context = {}) {
    if (instance.disposed) return instance;
    const resources = this.#resources(instance);
    if (resources.root.parent === this.scene) this.scene.remove(resources.root);
    if (!resources.disposedResources) {
      resources.disposedResources = true;
      await resources.prepared.disposeOwnedResources({
        ...context, scene: this.scene, THREE: this.THREE, root: resources.root, manifest: instance.manifest
      });
    }
    instance.dispose();
    return instance;
  }

  #resources(instance) {
    const resources = instance?.resources;
    if (!resources?.root || !resources?.prepared) throw new TypeError('world instance was not created by this ThreeWorldLoaderAdapter');
    return resources;
  }
}
