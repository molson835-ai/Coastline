import { WorldInstance } from './world-instance.mjs';

export class WorldLoaderAdapter {
  constructor(implementation = {}) { this.implementation = implementation; }

  async preload(manifest, context = {}) {
    const resources = await (this.implementation.preload?.(manifest, context) ?? null);
    return new WorldInstance(manifest, resources);
  }

  async warm(instance, context = {}) {
    await this.implementation.warm?.(instance, context);
    instance.setState('WARMED');
    return instance;
  }

  async activate(instance, context = {}) {
    await this.implementation.activate?.(instance, context);
    instance.setState('ACTIVE');
    return instance;
  }

  async deactivate(instance, context = {}) {
    if (instance.disposed) return instance;
    await this.implementation.deactivate?.(instance, context);
    instance.setState('DEACTIVATED');
    return instance;
  }

  async dispose(instance, context = {}) {
    await this.implementation.dispose?.(instance, context);
    instance.dispose();
  }
}
