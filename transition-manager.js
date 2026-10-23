const VALID_TRIGGERS = new Set(['bridge', 'tunnel', 'garage', 'door', 'elevator', 'generic']);
const VALID_VEHICLE_POLICIES = new Set(['required', 'allowed', 'forbidden']);

function assertNonEmptyId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must have a non-empty id`);
  }
}

function validateWorldDefinition(definition) {
  if (!definition || typeof definition !== 'object') throw new Error('world definition is required');
  assertNonEmptyId(definition.id, 'world');
  if (typeof definition.load !== 'function') throw new Error(`world ${definition.id} must define load()`);
  if (typeof definition.unload !== 'function') throw new Error(`world ${definition.id} must define unload()`);
  return definition;
}

function validateTransitionDefinition(definition, worlds) {
  if (!definition || typeof definition !== 'object') throw new Error('transition definition is required');
  assertNonEmptyId(definition.id, 'transition');
  if (!worlds.has(definition.fromWorld) || !worlds.has(definition.toWorld)) {
    throw new Error(`transition ${definition.id} references an unknown world`);
  }
  if (!VALID_TRIGGERS.has(definition.trigger)) throw new Error(`transition ${definition.id} has an invalid trigger`);
  if (!VALID_VEHICLE_POLICIES.has(definition.vehiclePolicy)) throw new Error(`transition ${definition.id} has an invalid vehicle policy`);
  if (definition.spawn !== undefined && definition.spawn !== 'return-point' && definition.spawn !== 'fixed') {
    throw new Error(`transition ${definition.id} has an invalid spawn policy`);
  }
  if (!definition.destinationSpawn || typeof definition.destinationSpawn !== 'object') {
    throw new Error(`transition ${definition.id} requires destinationSpawn`);
  }
  return definition;
}

function cloneState(value) {
  if (value === undefined) return undefined;
  try {
    return structuredClone(value);
  } catch (error) {
    const wrapped = new Error(`transition state must be plain data (numbers, strings, arrays, plain objects); pass snapshots, not game or Three.js objects: ${error.message}`, { cause: error });
    wrapped.name = 'TransitionStateError';
    throw wrapped;
  }
}

export function createTransitionManager({ onEvent } = {}) {
  const worlds = new Map();
  const transitions = new Map();
  const handles = new Map();
  const savedReturnPoints = new Map();
  const savedWorldStates = new Map();
  let activeWorldId = null;
  let state = 'idle';
  let activeTransitionId = null;
  let lastFailure = null;
  let lastTransitionState = null;
  let lastReturnPoint = null;
  let disposed = false;
  let transitionPromise = null;
  let activationPromise = null;
  let activatingWorldId = null;

  const emit = (type, data = {}) => {
    const event = Object.freeze({ type, ...data });
    if (typeof onEvent === 'function') {
      try {
        onEvent(event);
      } catch (listenerError) {
        if (typeof console !== 'undefined') console.error('transition manager event listener failed', type, listenerError);
      }
    }
    return event;
  };

  const status = () => Object.freeze({
    state,
    activeWorldId,
    activeTransitionId,
    lastFailure: lastFailure ? { name: lastFailure.name, message: lastFailure.message, phase: lastFailure.phase ?? null, cleanupError: lastFailure.cleanupError ?? null } : null,
    lastTransitionState: cloneState(lastTransitionState),
    residentWorldIds: [...handles.keys()],
  });

  const ensureUsable = () => {
    if (disposed) throw new Error('transition manager is disposed');
  };

  const activate = async (worldId, context = {}) => {
    ensureUsable();
    if (!worlds.has(worldId)) throw new Error(`unknown world: ${worldId}`);
    if (state === 'loading') {
      if (activatingWorldId === worldId && activationPromise) return activationPromise;
      throw new Error('transition manager is busy');
    }
    if (state === 'transitioning') throw new Error('transition manager is busy');
    if (activeWorldId === worldId) return handles.get(worldId);
    if (activeWorldId) throw new Error(`world ${activeWorldId} is already active`);

    state = 'loading';
    activatingWorldId = worldId;
    const definition = worlds.get(worldId);
    activationPromise = (async () => {
      try {
        const handle = await definition.load({ worldId, context, reason: 'initial-activation' });
        if (!handle) throw new Error(`world ${worldId} returned no load handle`);
        handles.set(worldId, handle);
        activeWorldId = worldId;
        state = 'active';
        emit('world:activated', { worldId });
        return handle;
      } catch (error) {
        state = 'idle';
        lastFailure = error;
        throw error;
      } finally {
        activatingWorldId = null;
        activationPromise = null;
      }
    })();
    return activationPromise;
  };

  const performTransition = async (transitionId, context = {}) => {
    ensureUsable();
    if (state !== 'active' || transitionPromise) throw new Error(state === 'degraded' ? 'transition manager is degraded' : 'transition manager is busy');
    const transition = transitions.get(transitionId);
    if (!transition) throw new Error(`unknown transition: ${transitionId}`);
    if (activeWorldId !== transition.fromWorld) {
      throw new Error(`transition ${transitionId} is not valid from active world ${activeWorldId}`);
    }
    if (!handles.has(activeWorldId)) throw new Error(`active world ${activeWorldId} has no resident handle`);

    const hasVehicle = Boolean(context.vehicle);
    if (transition.vehiclePolicy === 'required' && !hasVehicle) throw new Error(`transition ${transitionId}: vehicle is required`);
    if (transition.vehiclePolicy === 'forbidden' && hasVehicle && typeof context.storeVehicle !== 'function') {
      throw new Error(`transition ${transitionId}: vehicle is forbidden and no vehicle storage adapter was provided`);
    }

    const sourceDefinition = worlds.get(transition.fromWorld);
    const destinationDefinition = worlds.get(transition.toWorld);
    const sourceHandle = handles.get(transition.fromWorld);
    const sourceReturnPoint = cloneState(transition.returnPoint ?? context.player?.position ?? null);
    const transitionState = {
      player: cloneState(context.player),
      vehicle: hasVehicle ? cloneState(context.vehicle) : null,
      sourceWorld: transition.fromWorld,
      returnPoint: sourceReturnPoint,
    };

    state = 'transitioning';
    activeTransitionId = transitionId;
    lastFailure = null;
    emit('transition:started', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });

    let destinationHandle = null;
    let destinationLoadCompleted = false;
    let phase = 'source-capture';
    let sourceUnloadStarted = false;
    let cleanupError = null;
    try {
      if (typeof sourceDefinition.captureState === 'function') {
        transitionState.worldState = cloneState(await sourceDefinition.captureState({ context, handle: sourceHandle, transition }));
      }

      emit('transition:loading', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      phase = 'destination-load';
      const savedSpawn = transition.spawn === 'fixed' ? undefined : savedReturnPoints.get(transition.toWorld);
      const destinationSpawn = cloneState(savedSpawn ?? transition.destinationSpawn);
      destinationHandle = await destinationDefinition.load({
        worldId: transition.toWorld,
        context,
        transition,
        transitionState,
        destinationSpawn,
        reason: 'transition',
      });
      if (!destinationHandle) throw new Error(`world ${transition.toWorld} returned no load handle`);
      destinationLoadCompleted = true;

      const destinationWorldState = savedWorldStates.get(transition.toWorld);
      if (typeof destinationDefinition.restoreState === 'function' && destinationWorldState !== undefined) {
        phase = 'destination-restore';
        await destinationDefinition.restoreState(cloneState(destinationWorldState), { context, handle: destinationHandle, transition, transitionState, destinationSpawn });
      }

      if (transition.vehiclePolicy === 'forbidden' && hasVehicle) {
        phase = 'vehicle-storage';
        await context.storeVehicle(context.vehicle, { transition, sourceWorld: transition.fromWorld, destinationWorld: transition.toWorld });
        context.vehicle = null;
      }

      emit('transition:unloading', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      phase = 'source-unload';
      sourceUnloadStarted = true;
      await sourceDefinition.unload(sourceHandle, { context, transition, transitionState });
      handles.delete(transition.fromWorld);
      emit('world:disposed', { worldId: transition.fromWorld });

      if (sourceReturnPoint !== null) savedReturnPoints.set(transition.fromWorld, cloneState(sourceReturnPoint));
      if (transitionState.worldState !== undefined) savedWorldStates.set(transition.fromWorld, cloneState(transitionState.worldState));

      handles.set(transition.toWorld, destinationHandle);
      activeWorldId = transition.toWorld;
      lastTransitionState = cloneState(transitionState);
      lastReturnPoint = cloneState(destinationSpawn);

      emit('world:activated', { worldId: transition.toWorld });
      state = 'active';
      activeTransitionId = null;
      emit('transition:completed', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      return destinationHandle;
    } catch (error) {
      if (!destinationLoadCompleted) {
        if (typeof destinationDefinition.cleanupFailedLoad === 'function') {
          try {
            await destinationDefinition.cleanupFailedLoad({ worldId: transition.toWorld, context, transition, transitionState, error });
          } catch (cleanupFailure) {
            cleanupError = { name: cleanupFailure?.name ?? 'Error', message: cleanupFailure?.message ?? String(cleanupFailure) };
          }
        }
      } else if (destinationHandle && !handles.has(transition.toWorld)) {
        try {
          await destinationDefinition.unload(destinationHandle, { context, transition, transitionState, failed: true });
        } catch (cleanupFailure) {
          cleanupError = { name: cleanupFailure?.name ?? 'Error', message: cleanupFailure?.message ?? String(cleanupFailure) };
          handles.set(transition.toWorld, destinationHandle);
        }
      }

      if (transition.vehiclePolicy === 'forbidden' && hasVehicle && context.vehicle == null) {
        context.vehicle = cloneState(transitionState.vehicle);
      }
      state = sourceUnloadStarted || cleanupError ? 'degraded' : activeWorldId ? 'active' : 'idle';
      activeTransitionId = null;
      lastFailure = {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        phase,
        cleanupError,
      };
      emit('transition:failed', {
        transitionId,
        fromWorld: transition.fromWorld,
        toWorld: transition.toWorld,
        phase,
        cleanupError,
        error: { name: lastFailure.name, message: lastFailure.message },
      });
      throw error;
    }
  };

  const transition = (transitionId, context = {}) => {
    if (transitionPromise) return Promise.reject(new Error('transition manager is busy'));
    transitionPromise = performTransition(transitionId, context);
    return transitionPromise.finally(() => { transitionPromise = null; });
  };

  return {
    registerWorld(definition) {
      ensureUsable();
      validateWorldDefinition(definition);
      if (worlds.has(definition.id)) throw new Error(`world ${definition.id} is already registered`);
      worlds.set(definition.id, definition);
      return definition.id;
    },
    registerTransition(definition) {
      ensureUsable();
      validateTransitionDefinition(definition, worlds);
      if (transitions.has(definition.id)) throw new Error(`transition ${definition.id} is already registered`);
      transitions.set(definition.id, definition);
      return definition.id;
    },
    getActiveWorldId() { return activeWorldId; },
    getStatus: status,
    canTransition(transitionId, context = {}) {
      if (disposed || state !== 'active') return false;
      const transition = transitions.get(transitionId);
      if (!transition || transition.fromWorld !== activeWorldId) return false;
      if (transition.vehiclePolicy === 'required' && !context.vehicle) return false;
      if (transition.vehiclePolicy === 'forbidden' && context.vehicle && typeof context.storeVehicle !== 'function') return false;
      return true;
    },
    activate,
    transition,
    restoreLastReturnPoint(worldId) {
      if (worldId !== undefined) return cloneState(savedReturnPoints.get(worldId) ?? null);
      return cloneState(lastReturnPoint);
    },
    dispose() {
      disposed = true;
      state = 'disposed';
      activeTransitionId = null;
      worlds.clear();
      transitions.clear();
      handles.clear();
      savedReturnPoints.clear();
      savedWorldStates.clear();
      activeWorldId = null;
    },
  };
}
