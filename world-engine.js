// Coastline 2.0 runtime architecture.
// Renderer-agnostic world truth and simulation services for WebGL, WebGPU,
// tests, missions and persistence.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distSq = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; };

export const MATERIALS = Object.freeze({
  road: { solid: true, damageable: false, response: 'vehicle-impact' },
  curb: { solid: true, damageable: false, response: 'vehicle-impact' },
  sidewalk: { solid: true, damageable: false, response: 'hard-stop' },
  building: { solid: true, damageable: true, response: 'wall-impact' },
  pole: { solid: true, damageable: true, response: 'bend-or-break' },
  tree: { solid: true, damageable: true, response: 'flex-or-fall' },
  fence: { solid: true, damageable: true, response: 'break' },
  pedestrian: { solid: true, damageable: false, response: 'avoid-or-stop' },
  wildlife: { solid: true, damageable: false, response: 'flee' }
});

export function createSpatialHash(cellSize = 32) {
  const cells = new Map();
  const key = (x, z) => `${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`;
  const add = (id, x, z, data = {}) => {
    const k = key(x, z); if (!cells.has(k)) cells.set(k, new Map());
    cells.get(k).set(id, { id, x, z, ...data }); return k;
  };
  const remove = (id, x, z) => { const c = cells.get(key(x, z)); if (!c) return false; const removed = c.delete(id); if (!c.size) cells.delete(key(x, z)); return removed; };
  const update = (id, oldPos, newPos, data = {}) => { remove(id, oldPos.x, oldPos.z); return add(id, newPos.x, newPos.z, data); };
  const nearby = (x, z, radius = cellSize) => {
    const result = [], minX = Math.floor((x - radius) / cellSize), maxX = Math.floor((x + radius) / cellSize), minZ = Math.floor((z - radius) / cellSize), maxZ = Math.floor((z + radius) / cellSize), r2 = radius * radius;
    for (let cx = minX; cx <= maxX; cx++) for (let cz = minZ; cz <= maxZ; cz++) {
      const c = cells.get(`${cx}:${cz}`); if (!c) continue;
      for (const item of c.values()) if ((item.x - x) ** 2 + (item.z - z) ** 2 <= r2) result.push(item);
    }
    return result;
  };
  return Object.freeze({ cellSize, add, remove, update, nearby, size: () => cells.size });
}

export function createDamageState() {
  return { front: 0, rear: 0, left: 0, right: 0, roof: 0, glass: 0, lights: { left: 0, right: 0 }, structural: 0, lastImpact: null };
}

export function applyImpact(damage, { speed = 0, relativeSpeed = speed, side = 'front', mass = 1, objectType = 'vehicle' } = {}) {
  const d = damage || createDamageState();
  const energy = clamp((Math.abs(relativeSpeed) / 18) * mass, 0, 8);
  const amount = clamp(energy * 0.085, 0, .72);
  const key = ['front', 'rear', 'left', 'right', 'roof'].includes(side) ? side : 'front';
  d[key] = clamp(d[key] + amount, 0, 1);
  d.structural = clamp(d.structural + amount * .42, 0, 1);
  d.glass = clamp(d.glass + amount * (objectType === 'vehicle' ? .22 : .05), 0, 1);
  if (key === 'left') d.lights.left = clamp(d.lights.left + amount * .8, 0, 1);
  if (key === 'right') d.lights.right = clamp(d.lights.right + amount * .8, 0, 1);
  d.lastImpact = { time: Date.now(), side: key, energy, objectType };
  return d;
}

export function collisionResponse(material = 'road', impact = {}) {
  const profile = MATERIALS[material] || MATERIALS.road;
  if (!profile.solid) return { blocked: false, restitution: 0 };
  const speed = Math.abs(impact.speed || 0);
  if (material === 'pedestrian' || material === 'wildlife') return { blocked: true, restitution: .02, impulseScale: speed > 4 ? .05 : .12, avoid: true };
  if (material === 'tree' || material === 'pole') return { blocked: true, restitution: .08, damageable: true, impulseScale: .12 };
  if (material === 'building' || material === 'sidewalk') return { blocked: true, restitution: .02, damageable: profile.damageable, impulseScale: .04 };
  return { blocked: true, restitution: .05, damageable: profile.damageable, impulseScale: .06 };
}

export function simulationLOD(distance, { full = 80, active = 220, proxy = 520 } = {}) {
  if (distance <= full) return 0;
  if (distance <= active) return 1;
  if (distance <= proxy) return 2;
  return 3;
}

export function tickRateForLOD(lod) { return [30, 10, 3, 0][clamp(lod, 0, 3)]; }

// Rendering can use a slightly wider envelope than AI simulation. This keeps
// visual continuity while allowing expensive animation/AI work to fall off sooner.
export function renderLOD(distance, { full = 90, reduced = 240, impostor = 600 } = {}) {
  if (distance <= full) return 0;
  if (distance <= reduced) return 1;
  if (distance <= impostor) return 2;
  return 3;
}

// Deterministic, frame-budget-friendly scheduler. Actors are staggered by id so
// thousands of agents do not wake on the same frame. LOD controls cadence; a
// caller can additionally cap the number of selected actors per simulation step.
export function createSimulationScheduler({ maxActorsPerStep = 48 } = {}) {
  const lastTick = new Map();
  const cadence = [1 / 30, 1 / 10, 1 / 3, Infinity];
  const hash = id => {
    const s = String(id ?? '0'); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  };
  const select = (actors = [], now = 0) => {
    const ready = [];
    for (const actor of actors) {
      const lod = clamp(actor.lod ?? 3, 0, 3), period = cadence[lod];
      if (!Number.isFinite(period)) continue;
      const id = actor.id ?? ready.length;
      const previous = lastTick.get(id);
      if (previous == null || now - previous >= period) ready.push({ actor, lod, previous });
    }
    // Prioritize never-ticked and longest-waiting actors so the work cap cannot starve the tail.
    ready.sort((a, b) => (a.lod - b.lod) || ((a.previous == null ? -Infinity : a.previous) - (b.previous == null ? -Infinity : b.previous)) || (hash(a.actor.id) - hash(b.actor.id)));
    const selected = ready.slice(0, Math.max(0, maxActorsPerStep));
    for (const item of selected) lastTick.set(item.actor.id, now);
    return selected;
  };
  const reset = id => id == null ? lastTick.clear() : lastTick.delete(id);
  return Object.freeze({ select, reset, size: () => lastTick.size, maxActorsPerStep });
}

export function createWorldRuntime({ worldModel, chunkSize = 200 } = {}) {
  if (!worldModel) throw new Error('createWorldRuntime requires worldModel');
  const entities = new Map(), spatial = createSpatialHash(32), chunks = new Map();
  const adjustChunk = (x, z, delta) => {
    const c = worldModel.cellBounds(x, z, chunkSize), next = (chunks.get(c.key) || 0) + delta;
    if (next <= 0) chunks.delete(c.key); else chunks.set(c.key, next);
  };
  const register = (entity) => {
    if (!entity?.id) throw new Error('world entity requires id');
    const old = entities.get(entity.id);
    if (old) { spatial.remove(entity.id, old.x || 0, old.z || 0); adjustChunk(old.x || 0, old.z || 0, -1); }
    entities.set(entity.id, entity);
    spatial.add(entity.id, entity.x || 0, entity.z || 0, { type: entity.type || 'unknown' });
    adjustChunk(entity.x || 0, entity.z || 0, 1);
    return entity;
  };
  const move = (id, x, z) => {
    const e = entities.get(id); if (!e) return false;
    const old = { x: e.x || 0, z: e.z || 0 }, next = { x, z };
    e.x = x; e.z = z;
    spatial.update(id, old, next, { type: e.type || 'unknown' });
    const oldChunk = worldModel.cellBounds(old.x, old.z, chunkSize).key;
    const newChunk = worldModel.cellBounds(x, z, chunkSize).key;
    if (oldChunk !== newChunk) { adjustChunk(old.x, old.z, -1); adjustChunk(x, z, 1); }
    return true;
  };
  const unregister = (id) => {
    const e = entities.get(id); if (!e) return false;
    spatial.remove(id, e.x || 0, e.z || 0); adjustChunk(e.x || 0, e.z || 0, -1); entities.delete(id); return true;
  };
  const queryNearby = (x, z, radius) => spatial.nearby(x, z, radius).map(item => entities.get(item.id)).filter(Boolean);
  const queryChunk = (x, z) => worldModel.cellBounds(x, z, chunkSize).key;
  const actorLOD = (x, z, player) => simulationLOD(Math.sqrt((x - player.x) ** 2 + (z - player.z) ** 2));
  return Object.freeze({ register, move, unregister, queryNearby, queryChunk, actorLOD, get: id => entities.get(id), size: () => entities.size, chunks: () => chunks.size, chunkEntityCount: key => chunks.get(key) || 0 });
}

export function createParkingRegistry(worldModel, { spacing = 8 } = {}) {
  const occupied = new Set();
  const key = (road, side, slot) => `${road}:${side}:${slot}`;
  const makeSpot = (x, z, side, slot) => {
    const p = worldModel.parking(x, z, side, slot, spacing);
    return { id: key(p.roadId, side, slot), x: p.x, z: p.z, axis: p.axis, side, slot, roadId: p.roadId, rotation: p.rotation };
  };
  const reserve = id => { if (occupied.has(id)) return false; occupied.add(id); return true; };
  const release = id => occupied.delete(id);
  const isOccupied = id => occupied.has(id);
  const nearestAvailable = (x, z, radius = 45) => {
    const r = worldModel.nearestRoad(x, z), candidates = [];
    for (const side of [-1, 1]) for (let slot = -4; slot <= 4; slot++) {
      const p = makeSpot(r.x, r.z, side, slot); if (!isOccupied(p.id) && distSq(p, { x, z }) <= radius * radius) candidates.push(p);
    }
    candidates.sort((a, b) => distSq(a, { x, z }) - distSq(b, { x, z }));
    return candidates[0] || null;
  };
  return Object.freeze({ makeSpot, reserve, release, isOccupied, nearestAvailable, occupiedCount: () => occupied.size });
}

export function createWorldEventBus() {
  const listeners = new Map();
  const on = (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); return () => listeners.get(type)?.delete(fn); };
  const emit = (type, payload = {}) => { for (const fn of listeners.get(type) || []) fn(payload); };
  return Object.freeze({ on, emit });
}

export function createWorldArchitecture(worldModel) {
  const runtime = createWorldRuntime({ worldModel });
  const parking = createParkingRegistry(worldModel);
  const events = createWorldEventBus();
  const scheduler = createSimulationScheduler();
  return Object.freeze({ worldModel, runtime, parking, events, scheduler, materials: MATERIALS, simulationLOD, renderLOD, tickRateForLOD, collisionResponse, applyImpact });
}
