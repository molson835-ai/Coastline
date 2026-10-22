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
  if (!definition.destinationSpawn || typeof definition.destinationSpawn !== 'object') {
    throw new Error(`transition ${definition.id} requires destinationSpawn`);
  }
  return definition;
}

function cloneState(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

export function createTransitionManager({ onEvent } = {}) {
  const worlds = new Map();
  const transitions = new Map();
  const handles = new Map();
  let activeWorldId = null;
  let state = 'idle';
  let activeTransitionId = null;
  let lastFailure = null;
  let lastTransitionState = null;
  let lastReturnPoint = null;
  let disposed = false;
  let transitionPromise = null;

  const emit = (type, data = {}) => {
    const event = Object.freeze({ type, ...data });
    if (typeof onEvent === 'function') onEvent(event);
    return event;
  };

  const status = () => Object.freeze({
    state,
    activeWorldId,
    activeTransitionId,
    lastFailure: lastFailure ? { name: lastFailure.name, message: lastFailure.message } : null,
    lastTransitionState: cloneState(lastTransitionState),
    residentWorldIds: [...handles.keys()],
  });

  const ensureUsable = () => {
    if (disposed) throw new Error('transition manager is disposed');
  };

  const activate = async (worldId, context = {}) => {
    ensureUsable();
    if (!worlds.has(worldId)) throw new Error(`unknown world: ${worldId}`);
    if (state === 'transitioning') throw new Error('transition manager is busy');
    if (activeWorldId === worldId) return handles.get(worldId);
    if (activeWorldId) throw new Error(`world ${activeWorldId} is already active`);

    state = 'loading';
    const definition = worlds.get(worldId);
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
    }
  };

  const performTransition = async (transitionId, context = {}) => {
    ensureUsable();
    if (state === 'transitioning' || transitionPromise) throw new Error('transition manager is busy');
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
    const transitionState = {
      player: cloneState(context.player),
      vehicle: hasVehicle ? cloneState(context.vehicle) : null,
      sourceWorld: transition.fromWorld,
      returnPoint: cloneState(transition.returnPoint ?? context.player?.position ?? null),
    };

    state = 'transitioning';
    activeTransitionId = transitionId;
    lastFailure = null;
    emit('transition:started', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });

    let destinationHandle = null;
    try {
      emit('transition:loading', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      destinationHandle = await destinationDefinition.load({
        worldId: transition.toWorld,
        context,
        transition,
        transitionState,
        reason: 'transition',
      });
      if (!destinationHandle) throw new Error(`world ${transition.toWorld} returned no load handle`);

      emit('transition:unloading', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      if (typeof sourceDefinition.captureState === 'function') {
        transitionState.worldState = cloneState(await sourceDefinition.captureState({ context, handle: sourceHandle, transition }));
      }
      await sourceDefinition.unload(sourceHandle, { context, transition, transitionState });
      handles.delete(transition.fromWorld);
      emit('world:disposed', { worldId: transition.fromWorld });

      handles.set(transition.toWorld, destinationHandle);
      activeWorldId = transition.toWorld;
      lastTransitionState = cloneState(transitionState);
      lastReturnPoint = cloneState(transition.returnPoint ?? context.player?.position ?? null);

      if (transition.vehiclePolicy === 'forbidden' && hasVehicle) {
        await context.storeVehicle(context.vehicle, { transition, sourceWorld: transition.fromWorld, destinationWorld: transition.toWorld });
        context.vehicle = null;
      }

      if (typeof destinationDefinition.restoreState === 'function' && transitionState.worldState !== undefined) {
        await destinationDefinition.restoreState(transitionState.worldState, { context, handle: destinationHandle, transition });
      }

      emit('world:activated', { worldId: transition.toWorld });
      state = 'active';
      activeTransitionId = null;
      emit('transition:completed', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld });
      return destinationHandle;
    } catch (error) {
      lastFailure = error;
      if (destinationHandle && !handles.has(transition.toWorld)) {
        try { await destinationDefinition.unload(destinationHandle, { context, transition, failed: true }); } catch {}
      }
      state = activeWorldId ? 'active' : 'idle';
      activeTransitionId = null;
      emit('transition:failed', { transitionId, fromWorld: transition.fromWorld, toWorld: transition.toWorld, error: { name: error.name, message: error.message } });
      throw error;
    }
  };

  const transition = (transitionId, context = {}) => {
    if (transitionPromise) throw new Error('transition manager is busy');
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
      if (disposed || state === 'transitioning') return false;
      const transition = transitions.get(transitionId);
      if (!transition || transition.fromWorld !== activeWorldId) return false;
      if (transition.vehiclePolicy === 'required' && !context.vehicle) return false;
      if (transition.vehiclePolicy === 'forbidden' && context.vehicle && typeof context.storeVehicle !== 'function') return false;
      return true;
    },
    activate,
    transition,
    restoreLastReturnPoint() { return cloneState(lastReturnPoint); },
    dispose() {
      disposed = true;
      state = 'disposed';
      activeTransitionId = null;
      worlds.clear();
      transitions.clear();
      handles.clear();
      activeWorldId = null;
    },
  };
}
