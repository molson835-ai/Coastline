export const GATE_TYPES = Object.freeze(['physical', 'masked', 'explicit']);

function isRecord(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

export function validateGateDefinition(gate) {
  if (!isRecord(gate)) throw new TypeError('gate definition must be an object');
  if (typeof gate.id !== 'string' || !gate.id.trim()) throw new TypeError('gate ID is required');
  if (!GATE_TYPES.includes(gate.type)) throw new TypeError('unsupported gate type: ' + gate.type);
  if (typeof gate.fromWorld !== 'string' || !gate.fromWorld.trim()) throw new TypeError('gate fromWorld is required');
  if (typeof gate.toWorld !== 'string' || !gate.toWorld.trim()) throw new TypeError('gate toWorld is required');
  if (gate.fromWorld === gate.toWorld) throw new TypeError('gate source and destination must differ');
  for (const key of ['preloadDistance', 'activationDistance']) {
    if (typeof gate[key] !== 'number' || !Number.isFinite(gate[key]) || gate[key] < 0) {
      throw new TypeError('gate ' + key + ' must be a finite non-negative number');
    }
  }
  if (gate.activationDistance > gate.preloadDistance) throw new TypeError('gate activationDistance cannot exceed preloadDistance');
  if (typeof gate.spawnPoint !== 'string' || !gate.spawnPoint.trim()) throw new TypeError('gate spawnPoint is required');
  if (typeof gate.fallbackPoint !== 'string' || !gate.fallbackPoint.trim()) throw new TypeError('gate fallbackPoint is required');
  return true;
}

export function createGateDefinition(input) {
  validateGateDefinition(input);
  return structuredClone(input);
}
