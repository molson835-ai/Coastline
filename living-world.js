// Deterministic, bounded decision helpers for Coastline's living-world simulation.
// These functions choose high-level intent only; movement, collision, and world state
// remain authoritative in the game simulation.
import { REALISM_PROFILES, realismLibraryRules } from './realism-library.js';

function stableInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value | 0;
  const s = String(value ?? '0'); let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}
function unitHash(a, b = 0, c = 0) {
  let x = (Math.imul(stableInt(a) ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(stableInt(b) + 0x27d4eb2d, 0x165667b1) ^ Math.imul(stableInt(c) + 0x3449f5, 0x1b873593)) | 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// Cache only same-origin game assets. This reduces repeat-download data without
// putting a second scheduler or simulation loop into the hot path.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./coastline-sw.js', { scope: './' }).catch(() => {});
  }, { once: true });
}

const residentActivities = Object.freeze(['walk', 'phone', 'coffee', 'wait', 'jog', 'look around']);

export function chooseResidentActivity({ id = 0, daylight = 0.7, weather = 'clear', timeSlice = 0 } = {}) {
  const pool = weather === 'rain'
    ? ['coffee', 'phone', 'wait', 'look around', 'walk']
    : weather === 'fog'
      ? ['walk', 'wait', 'look around', 'phone']
      : daylight < 0.2
        ? ['walk', 'phone', 'wait', 'look around', 'coffee']
        : daylight < 0.45
          ? ['walk', 'coffee', 'look around', 'wait', 'jog']
          : residentActivities;
  return pool[Math.floor(unitHash(id, timeSlice, Math.round(daylight * 100) + weather.length * 17) * pool.length)];
}

export function chooseWildlifeBehavior({ id = 0, daylight = 0.7, weather = 'clear', threatDistance = Infinity, phase = 0, species = 'deer' } = {}) {
  const fleeRadius = species === 'deer' ? 15 : 11;
  if (Number.isFinite(threatDistance) && threatDistance < fleeRadius) return 'flee';
  if (weather === 'rain' && unitHash(id, Math.floor(phase), 5) < 0.42) return 'shelter';
  if (daylight < 0.12 && unitHash(id, Math.floor(phase), 7) < 0.62) return 'rest';
  if (unitHash(id, Math.floor(phase), 11) < (daylight > 0.35 ? 0.62 : 0.34)) return 'forage';
  return 'roam';
}

// Lightweight local avoidance primitive for agents that do not yet have a full navmesh.
// Returns a normalized steering vector; it never teleports an actor or overrides physics.
export function separationSteering({ x = 0, z = 0, neighbors = [], radius = 2.2, strength = 1 } = {}) {
  let sx = 0, sz = 0, count = 0, r2 = radius * radius;
  for (const n of neighbors || []) {
    const dx = x - Number(n.x || 0), dz = z - Number(n.z || 0), d2 = dx * dx + dz * dz;
    if (d2 <= 0.0001 || d2 > r2) continue;
    const inv = 1 / Math.sqrt(d2);
    sx += dx * inv * (1 - Math.sqrt(d2) / radius); sz += dz * inv * (1 - Math.sqrt(d2) / radius); count++;
  }
  if (!count) return { x: 0, z: 0 };
  const len = Math.hypot(sx, sz) || 1;
  return { x: (sx / len) * strength, z: (sz / len) * strength };
}

export function livingWorldRules() {
  return {
    version: 4,
    residentDecision: 'seeded identity + time/weather-aware activity selection',
    wildlifeDecision: 'threat-first flee, then weather/daylight-aware intent',
    localAvoidance: 'bounded separation steering',
    decisionsPerRenderFrame: false,
    movementAuthority: 'game simulation',
    collisionAuthority: 'game physics',
    assetCaching: 'same-origin service-worker cache with network refresh',
    visualGrammar: realismLibraryRules().philosophy,
    realismProfiles: Object.keys(REALISM_PROFILES),
    activities: [...residentActivities],
    wildlifeBehaviors: ['flee', 'shelter', 'rest', 'forage', 'roam']
  };
}
