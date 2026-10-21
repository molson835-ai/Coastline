import { createGateDefinition } from './gate-definition.mjs';

export function createPhysicalGate(input) { return createGateDefinition({ ...input, type: 'physical' }); }
export function createMaskedGate(input) { return createGateDefinition({ ...input, type: 'masked' }); }
export function createExplicitGate(input) { return createGateDefinition({ ...input, type: 'explicit' }); }

/**
 * Normalize all trigger kinds into TransitionManager.requestTransition input.
 * The activation barrier is kept outside serializable gate metadata.
 * A masked gate resolves its barrier when an interaction/animation reaches its safe handoff point.
 */
export function createGateTransitionRequest({ gate, sourceWorldId, playerStateContext = {}, waitForHandoff = null } = {}) {
  const normalizedGate = createGateDefinition(gate);
  if (sourceWorldId !== normalizedGate.fromWorld) throw new Error('request source must match gate fromWorld');
  if (normalizedGate.type === 'masked' && typeof waitForHandoff !== 'function') {
    throw new TypeError('masked gates require a waitForHandoff callback');
  }
  if (waitForHandoff !== null && typeof waitForHandoff !== 'function') throw new TypeError('waitForHandoff must be a function when provided');
  return {
    gate: normalizedGate,
    sourceWorldId,
    playerStateContext,
    ...(waitForHandoff ? { activationBarrier: waitForHandoff } : {})
  };
}
