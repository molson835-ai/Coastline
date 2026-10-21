const CORE_SECTIONS = Object.freeze([
  ['player', ['position', 'status']],
  ['vehicle', ['activeVehicle', 'condition', 'upgrades', 'customization']],
  ['economy', ['money', 'inventory']],
  ['progression', ['reputation', 'progression']],
  ['mission', ['activeMission', 'progress']],
  ['discoveries', []],
  ['environment', ['time', 'weather']],
  ['worldState', []]
]);

function clone(value) {
  try { return structuredClone(value); }
  catch (error) { throw new TypeError('player state snapshot must be structured-cloneable: ' + error.message); }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** Validate the versioned, engine-neutral state shape used at world boundaries. */
export function validatePlayerStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('player state snapshot must be an object');
  }
  if (snapshot.schemaVersion !== 1) throw new TypeError('player state snapshot schemaVersion must be 1');
  for (const [section, requiredKeys] of CORE_SECTIONS) {
    const value = snapshot[section];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('player state snapshot section ' + section + ' must be an object');
    }
    for (const key of requiredKeys) {
      if (!hasOwn(value, key)) throw new TypeError('player state snapshot is missing ' + section + '.' + key);
    }
  }
  if (typeof snapshot.economy.money !== 'number' || !Number.isFinite(snapshot.economy.money) || snapshot.economy.money < 0) {
    throw new TypeError('player state snapshot economy.money must be a finite non-negative number');
  }
  return true;
}

/**
 * Atomic, injectable boundary for persistent player/game data. The runtime adapter owns
 * the actual state; this class only captures, validates, restores and rolls back snapshots.
 *
 * captureSourceState(context, transitionContext) must return schemaVersion:1 data containing
 * player, vehicle, economy, progression, mission, discoveries, environment and worldState.
 * A restore provider without a destination backup must itself guarantee atomic application.
 */
export class PlayerStateHandoff {
  constructor({
    captureSourceState,
    restoreDestinationState,
    validateSnapshot = validatePlayerStateSnapshot,
    captureDestinationState = null,
    rollbackDestinationState = null,
    rollbackSourceState = null
  } = {}) {
    if (typeof captureSourceState !== 'function') throw new TypeError('captureSourceState callback is required');
    if (typeof restoreDestinationState !== 'function') throw new TypeError('restoreDestinationState callback is required');
    if (typeof validateSnapshot !== 'function') throw new TypeError('validateSnapshot must be a function');
    if (Boolean(captureDestinationState) !== Boolean(rollbackDestinationState)) {
      throw new TypeError('captureDestinationState and rollbackDestinationState must be provided together');
    }
    this.captureSourceState = captureSourceState;
    this.restoreDestinationState = restoreDestinationState;
    this.validateSnapshot = validateSnapshot;
    this.captureDestinationState = captureDestinationState;
    this.rollbackDestinationState = rollbackDestinationState;
    this.rollbackSourceState = rollbackSourceState;
  }

  async capture(context, transitionContext = {}) {
    const snapshot = clone(await this.captureSourceState(context, transitionContext));
    await this.validate(snapshot, transitionContext);
    return snapshot;
  }

  async validate(snapshot, transitionContext = {}) {
    const isolatedSnapshot = clone(snapshot);
    const valid = await this.validateSnapshot(isolatedSnapshot, transitionContext);
    if (valid === false) throw new Error('player state snapshot validation failed');
    return true;
  }

  async restore(snapshot, destinationContext = {}) {
    const isolatedSnapshot = clone(snapshot);
    await this.validate(isolatedSnapshot, destinationContext);
    let destinationBackup;
    if (this.captureDestinationState) {
      destinationBackup = clone(await this.captureDestinationState(destinationContext));
    }
    try {
      const result = await this.restoreDestinationState(clone(isolatedSnapshot), destinationContext);
      return result === undefined ? { restored: true } : result;
    } catch (error) {
      if (this.rollbackDestinationState) {
        try {
          await this.rollbackDestinationState(clone(destinationBackup), destinationContext, error);
        } catch (rollbackError) {
          try { Object.defineProperty(error, 'rollbackError', { value: rollbackError, configurable: true }); } catch { /* preserve original error */ }
        }
      }
      throw error;
    }
  }

  async rollback(sourceSnapshot, sourceContext = {}) {
    if (!this.rollbackSourceState) return true;
    await this.rollbackSourceState(clone(sourceSnapshot), sourceContext);
    return true;
  }
}

export const PLAYER_STATE_CORE_SECTIONS = CORE_SECTIONS;
