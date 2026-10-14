// Deterministic, bounded decision helpers for Coastline's living-world simulation.
// These functions choose high-level intent only; movement, collision, and world state
// remain authoritative in the game simulation.
function unitHash(a, b = 0, c = 0) {
  let x = (Math.imul((a | 0) ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul((b | 0) + 0x27d4eb2d, 0x165667b1) ^ Math.imul((c | 0) + 0x3449f5, 0x1b873593)) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const residentActivities = Object.freeze(['walk', 'phone', 'coffee', 'wait', 'jog', 'look around']);

export function chooseResidentActivity({ id = 0, daylight = 0.7, weather = 'clear', timeSlice = 0 } = {}) {
  // Keep choices stable for a given resident/time slice so test runs are reproducible.
  const pool = weather === 'rain'
    ? ['coffee', 'phone', 'wait', 'look around', 'walk']
    : weather === 'fog'
      ? ['walk', 'wait', 'look around', 'phone']
      : daylight < 0.2
        ? ['walk', 'phone', 'wait', 'look around', 'coffee']
        : daylight < 0.45
          ? ['walk', 'coffee', 'look around', 'wait', 'jog']
          : residentActivities;
  const index = Math.floor(unitHash(id, timeSlice, Math.round(daylight * 100) + weather.length * 17) * pool.length);
  return pool[index];
}

export function chooseWildlifeBehavior({ id = 0, daylight = 0.7, weather = 'clear', threatDistance = Infinity, phase = 0, species = 'deer' } = {}) {
  if (Number.isFinite(threatDistance) && threatDistance < (species === 'deer' ? 15 : 11)) return 'flee';
  // Weather and daylight influence intent, but never bypass collision or movement constraints.
  if (weather === 'rain' && unitHash(id, Math.floor(phase), 5) < 0.42) return 'shelter';
  if (daylight < 0.12 && unitHash(id, Math.floor(phase), 7) < 0.62) return 'rest';
  if (unitHash(id, Math.floor(phase), 11) < (daylight > 0.35 ? 0.62 : 0.34)) return 'forage';
  return 'roam';
}

export function livingWorldRules() {
  return {
    version: 1,
    residentDecision: 'seeded time/weather-aware activity selection',
    wildlifeDecision: 'threat-first flee, then weather/daylight-aware intent',
    decisionsPerRenderFrame: false,
    movementAuthority: 'game simulation',
    collisionAuthority: 'game physics',
    activities: [...residentActivities],
    wildlifeBehaviors: ['flee', 'shelter', 'rest', 'forage', 'roam']
  };
}
