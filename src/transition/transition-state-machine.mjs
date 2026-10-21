export const TRANSITION_STATES = Object.freeze([
  'IDLE', 'REQUESTED', 'PRELOADING', 'WARMING', 'READY', 'TRANSFERRING',
  'ACTIVATING', 'RETIRING_OLD_WORLD', 'UNLOADING', 'COMPLETE', 'FAILED', 'RECOVERING'
]);

const ALLOWED = Object.freeze({
  IDLE: ['REQUESTED'],
  REQUESTED: ['PRELOADING', 'FAILED'],
  PRELOADING: ['WARMING', 'FAILED'],
  WARMING: ['READY', 'FAILED'],
  READY: ['TRANSFERRING', 'FAILED'],
  TRANSFERRING: ['ACTIVATING', 'FAILED', 'RECOVERING'],
  ACTIVATING: ['RETIRING_OLD_WORLD', 'RECOVERING'],
  RETIRING_OLD_WORLD: ['UNLOADING', 'COMPLETE'],
  UNLOADING: ['COMPLETE'],
  RECOVERING: ['FAILED'],
  COMPLETE: [],
  FAILED: []
});

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class TransitionStateMachine {
  constructor({ onTransition = null, clock = () => Date.now() } = {}) {
    this.state = 'IDLE';
    this.clock = clock;
    this.onTransition = onTransition;
    this.history = [{ state: 'IDLE', at: this.clock(), details: null }];
  }

  transition(nextState, details = null) {
    if (!TRANSITION_STATES.includes(nextState)) throw new TypeError('unknown transition state: ' + nextState);
    if (!ALLOWED[this.state].includes(nextState)) throw new Error('invalid transition state change: ' + this.state + ' -> ' + nextState);
    const entry = { state: nextState, at: this.clock(), details: clone(details) ?? null };
    this.state = nextState;
    this.history.push(entry);
    try { this.onTransition?.(clone(entry)); } catch { /* telemetry must not break transitions */ }
    return this.state;
  }

  snapshot() { return { state: this.state, history: clone(this.history) }; }
}
