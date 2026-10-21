import { WorldLoaderAdapter } from './world-loader-adapter.mjs';
import { WorldRegistry } from './world-registry.mjs';
import { TransitionStateMachine } from './transition-state-machine.mjs';

const GATE_TYPES = new Set(['physical', 'masked', 'explicit']);
const CANCELLABLE_STATES = new Set(['IDLE', 'REQUESTED', 'PRELOADING', 'WARMING', 'READY', 'TRANSFERRING']);

function clone(value) { return value === undefined ? undefined : structuredClone(value); }

function safeCall(target, method, ...args) {
  try {
    const result = target?.[method]?.(...args);
    if (result && typeof result.then === 'function') result.catch(() => {});
    return result;
  } catch { return undefined; }
}

export class TransitionBusyError extends Error {
  constructor(message = 'another transition is already in progress') {
    super(message);
    this.name = 'TransitionBusyError';
    this.code = 'TRANSITION_BUSY';
  }
}

export class TransitionCancelledError extends Error {
  constructor(message = 'transition cancelled before activation') {
    super(message);
    this.name = 'TransitionCancelledError';
    this.code = 'TRANSITION_CANCELLED';
  }
}

/** Orchestrates world changes without owning game state or renderer details. */
export class TransitionManager {
  constructor({
    registry = new WorldRegistry(),
    loader = new WorldLoaderAdapter(),
    stateHandoff = null,
    telemetry = null,
    idFactory = () => 'ctm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
    clock = () => Date.now()
  } = {}) {
    this.registry = registry;
    this.loader = loader;
    this.stateHandoff = stateHandoff ?? {
      capture: async context => clone(context ?? {}),
      validate: async snapshot => snapshot !== undefined,
      restore: async snapshot => clone(snapshot),
      rollback: async () => true
    };
    this.telemetry = telemetry;
    this.idFactory = idFactory;
    this.clock = clock;
    this.instances = new Map();
    this.retiredInstances = [];
    this.activeWorldId = null;
    this._activeTransition = null;
    this._initializing = false;
  }

  registerWorld(manifest) { return this.registry.register(manifest); }
  getActiveWorldId() { return this.activeWorldId; }
  getActiveWorld() { return this.activeWorldId ? this.instances.get(this.activeWorldId) ?? null : null; }
  getActiveTransition() { return this._activeTransition?.handle ?? null; }

  async initializeWorld(worldId, context = {}) {
    if (this.activeWorldId) throw new Error('active world already initialized: ' + this.activeWorldId);
    if (this._initializing) throw new TransitionBusyError('initial world initialization is already in progress');
    const manifest = this.registry.get(worldId);
    if (!manifest) throw new Error('unknown world ID: ' + worldId);
    this._initializing = true;
    let instance;
    try {
      instance = await this.loader.preload(manifest, { ...context, initialWorld: true });
      await this.loader.warm(instance, { ...context, initialWorld: true });
      await this.loader.activate(instance, { ...context, initialWorld: true });
      this.instances.set(worldId, instance);
      this.activeWorldId = worldId;
      return instance;
    } catch (error) {
      if (instance) {
        try { await this.loader.dispose(instance, { ...context, initialWorld: true, reason: 'initialization-failed' }); } catch { /* preserve original error */ }
      }
      throw error;
    } finally { this._initializing = false; }
  }

  requestTransition({ gate, sourceWorldId, playerStateContext = {} } = {}) {
    if (!gate || typeof gate !== 'object') throw new TypeError('gate definition is required');
    sourceWorldId = sourceWorldId ?? gate.fromWorld ?? this.activeWorldId;
    this.#validateGateShape(gate, sourceWorldId);
    const destinationWorldId = gate.toWorld;
    const existing = this._activeTransition;
    if (existing) {
      if (existing.sourceWorldId === sourceWorldId && existing.destinationWorldId === destinationWorldId) return existing.handle;
      throw new TransitionBusyError('transition ' + existing.sourceWorldId + ' -> ' + existing.destinationWorldId + ' is already active');
    }
    this.#validateRequest(gate, sourceWorldId);

    const record = {
      id: this.idFactory(), gate: clone(gate), sourceWorldId, destinationWorldId,
      sourceInstance: this.instances.get(sourceWorldId), destinationInstance: null, playerStateContext,
      stateSnapshot: undefined, restoredState: undefined, controller: new AbortController(),
      cancelRequested: false, committed: false, failure: null, cleanupWarnings: [],
      startedAt: this.clock(), updatedAt: this.clock(), machine: null, handle: null
    };
    record.machine = new TransitionStateMachine({
      clock: this.clock,
      onTransition: entry => {
        record.updatedAt = entry.at;
        safeCall(this.telemetry, 'mark', record.id, entry.state, {
          sourceWorldId, destinationWorldId, gateId: gate.id, state: entry.state, at: entry.at
        });
      }
    });
    this._activeTransition = record;
    const promise = Promise.resolve().then(() => this.#execute(record)).finally(() => {
      if (this._activeTransition === record) this._activeTransition = null;
    });
    record.handle = Object.freeze({
      id: record.id,
      promise,
      cancel: () => this.#cancel(record),
      getSnapshot: () => this.#snapshot(record)
    });
    return record.handle;
  }

  #validateGateShape(gate, sourceWorldId) {
    if (typeof gate.id !== 'string' || !gate.id.trim()) throw new TypeError('gate ID is required');
    if (!GATE_TYPES.has(gate.type)) throw new TypeError('unsupported gate type: ' + gate.type);
    if (typeof gate.fromWorld !== 'string' || !gate.fromWorld || typeof gate.toWorld !== 'string' || !gate.toWorld) {
      throw new TypeError('gate fromWorld and toWorld are required');
    }
    if (gate.fromWorld !== sourceWorldId) throw new Error('gate source world does not match request source');
  }

  #validateRequest(gate, sourceWorldId) {
    if (sourceWorldId !== this.activeWorldId) throw new Error('request source is not the active world');
    if (!this.registry.has(sourceWorldId)) throw new Error('unknown source world ID: ' + sourceWorldId);
    if (!this.registry.has(gate.toWorld)) throw new Error('unknown destination world ID: ' + gate.toWorld);
    if (sourceWorldId === gate.toWorld) throw new Error('source and destination worlds must differ');
    const source = this.instances.get(sourceWorldId);
    if (!source || source.disposed || source.state !== 'ACTIVE') throw new Error('source world instance is not active');
  }

  #cancel(record) {
    if (record.committed || !CANCELLABLE_STATES.has(record.machine.state) || record.cancelRequested) return false;
    record.cancelRequested = true;
    record.controller.abort(new TransitionCancelledError());
    record.updatedAt = this.clock();
    safeCall(this.telemetry, 'mark', record.id, 'CANCEL_REQUESTED', {
      sourceWorldId: record.sourceWorldId, destinationWorldId: record.destinationWorldId,
      gateId: record.gate.id, at: record.updatedAt
    });
    return true;
  }

  #throwIfCancelled(record) {
    if (record.cancelRequested || record.controller.signal.aborted) throw new TransitionCancelledError();
  }

  async #execute(record) {
    const { id, sourceWorldId, destinationWorldId, sourceInstance, gate, controller } = record;
    safeCall(this.telemetry, 'start', id, {
      sourceWorldId, destinationWorldId, gateId: gate.id, gateType: gate.type, startedAt: record.startedAt
    });
    try {
      record.machine.transition('REQUESTED', { gateId: gate.id });
      this.#throwIfCancelled(record);
      record.machine.transition('PRELOADING');
      const destinationManifest = this.registry.get(destinationWorldId);
      if (!Array.isArray(destinationManifest.spawnPoints) || destinationManifest.spawnPoints.length === 0) {
        throw new Error('destination world ' + destinationWorldId + ' has no spawn points');
      }
      record.destinationInstance = await this.loader.preload(destinationManifest, {
        transitionId: id, gate, sourceWorldId, destinationWorldId, signal: controller.signal
      });
      if (!record.destinationInstance) throw new Error('world loader returned no destination instance');
      if (record.destinationInstance.id !== destinationWorldId) throw new Error('world loader returned an instance for the wrong destination');
      this.instances.set(destinationWorldId, record.destinationInstance);
      this.#throwIfCancelled(record);

      record.machine.transition('WARMING');
      await this.loader.warm(record.destinationInstance, {
        transitionId: id, gate, sourceWorldId, destinationWorldId, signal: controller.signal
      });
      this.#throwIfCancelled(record);
      record.machine.transition('READY', { destinationWorldId });

      record.machine.transition('TRANSFERRING');
      record.stateSnapshot = this.stateHandoff?.capture
        ? await this.stateHandoff.capture(record.playerStateContext, { sourceWorldId, destinationWorldId, gate, signal: controller.signal })
        : clone(record.playerStateContext ?? {});
      this.#throwIfCancelled(record);
      const valid = this.stateHandoff?.validate
        ? await this.stateHandoff.validate(record.stateSnapshot, { sourceWorldId, destinationWorldId, gate })
        : true;
      if (valid === false) throw new Error('player state handoff validation failed');
      record.restoredState = this.stateHandoff?.restore
        ? await this.stateHandoff.restore(record.stateSnapshot, {
          sourceWorldId, destinationWorldId, gate, destinationInstance: record.destinationInstance, signal: controller.signal
        })
        : clone(record.stateSnapshot);
      this.#throwIfCancelled(record);

      record.machine.transition('ACTIVATING');
      await this.loader.activate(record.destinationInstance, {
        transitionId: id, gate, sourceWorldId, destinationWorldId, signal: controller.signal,
        playerStateSnapshot: record.stateSnapshot, restoredState: record.restoredState
      });

      // Destination becomes authoritative only after activation and handoff succeed.
      record.committed = true;
      this.activeWorldId = destinationWorldId;
      this.instances.set(destinationWorldId, record.destinationInstance);
      record.machine.transition('RETIRING_OLD_WORLD');
      try {
        await this.loader.deactivate(sourceInstance, { transitionId: id, reason: 'world-retired', destinationWorldId });
      } catch (error) { record.cleanupWarnings.push('source deactivation failed: ' + error.message); }
      record.machine.transition('UNLOADING');
      try {
        await this.loader.dispose(sourceInstance, { transitionId: id, reason: 'world-retired', destinationWorldId });
        this.instances.delete(sourceWorldId);
      } catch (error) {
        record.cleanupWarnings.push('source disposal failed: ' + error.message);
        this.retiredInstances.push({ worldId: sourceWorldId, instance: sourceInstance, error: error.message, at: this.clock() });
        this.instances.delete(sourceWorldId);
      }
      record.machine.transition('COMPLETE', { cleanupWarnings: [...record.cleanupWarnings] });
      const result = this.#snapshot(record);
      safeCall(this.telemetry, 'complete', id, result);
      return result;
    } catch (error) {
      record.failure = {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        code: error?.code ?? null,
        ...(error?.rollbackError ? { rollbackError: { name: error.rollbackError.name ?? 'Error', message: error.rollbackError.message ?? String(error.rollbackError) } } : {})
      };
      const canRecover = !record.committed && ['TRANSFERRING', 'ACTIVATING'].includes(record.machine.state);
      if (canRecover) {
        try { record.machine.transition('RECOVERING', record.failure); } catch { /* preserve primary failure */ }
        if (record.destinationInstance?.state === 'ACTIVE') {
          try { await this.loader.deactivate(record.destinationInstance, { transitionId: id, reason: 'activation-recovery', sourceWorldId }); }
          catch (cleanupError) { record.cleanupWarnings.push('destination deactivation failed during recovery: ' + cleanupError.message); }
        }
        try {
          await this.stateHandoff?.rollback?.(record.stateSnapshot, {
            sourceWorldId, destinationWorldId, gate, sourceInstance, destinationInstance: record.destinationInstance, error
          });
        } catch (rollbackError) { record.cleanupWarnings.push('state handoff rollback failed: ' + rollbackError.message); }
      }
      if (!record.committed && record.destinationInstance) {
        try { await this.loader.dispose(record.destinationInstance, { transitionId: id, reason: 'transition-failed', error }); }
        catch (cleanupError) { record.cleanupWarnings.push('destination disposal failed: ' + cleanupError.message); }
        this.instances.delete(destinationWorldId);
      }
      if (record.machine.state !== 'FAILED' && record.machine.state !== 'COMPLETE') {
        try { record.machine.transition('FAILED', record.failure); } catch { /* preserve primary failure */ }
      }
      safeCall(this.telemetry, 'fail', id, this.#snapshot(record));
      throw error;
    }
  }

  #snapshot(record) {
    const machine = record.machine.snapshot();
    return {
      id: record.id, state: machine.state, history: machine.history,
      sourceWorldId: record.sourceWorldId, destinationWorldId: record.destinationWorldId,
      gate: clone(record.gate), startedAt: record.startedAt, updatedAt: record.updatedAt,
      durationMs: Math.max(0, (record.updatedAt ?? this.clock()) - record.startedAt),
      cancelled: Boolean(record.cancelRequested), committed: Boolean(record.committed),
      failure: clone(record.failure), cleanupWarnings: [...record.cleanupWarnings],
      stateHandoff: { captured: record.stateSnapshot !== undefined, restored: record.restoredState !== undefined },
      activeWorldId: this.activeWorldId
    };
  }
}
