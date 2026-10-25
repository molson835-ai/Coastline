/**
 * Coastline's canonical four-island design manifest.
 *
 * These are world-segment contracts, not a claim that all four regions are
 * currently rendered/playable. Keep world identity, transition targets and
 * population budgets here rather than scattering them through runtime code.
 * Only the active region should own live simulation; distant regions are scenery.
 */
export const COASTLINE_ISLAND_REGIONS = Object.freeze([
  Object.freeze({
    id: 'downtown',
    title: 'Downtown Island',
    theme: 'urban-core',
    purpose: 'Skyline, dense avenues, plazas and glass towers',
    center: Object.freeze({ x: 0, z: 0 }),
    bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }),
    bridge: Object.freeze({ entry: 'west', exit: 'east', target: 'residential' }),
    population: Object.freeze({ traffic: 12, pedestrians: 16 }),
    visual: Object.freeze({ landmark: 'skyline', vegetation: 'street-palms', waterline: true }),
  }),
  Object.freeze({
    id: 'residential',
    title: 'Residential Island',
    theme: 'coastal-neighborhood',
    purpose: 'Homes, parks, winding roads and quiet neighborhood streets',
    center: Object.freeze({ x: 0, z: 0 }),
    bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }),
    bridge: Object.freeze({ entry: 'west', exit: 'east', target: 'waterfront' }),
    population: Object.freeze({ traffic: 8, pedestrians: 12 }),
    visual: Object.freeze({ landmark: 'neighborhood-park', vegetation: 'tropical-gardens', waterline: true }),
  }),
  Object.freeze({
    id: 'waterfront',
    title: 'Waterfront Island',
    theme: 'resort-marina',
    purpose: 'Beach, boardwalk, resorts, marina and entertainment streets',
    center: Object.freeze({ x: 0, z: 0 }),
    bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }),
    bridge: Object.freeze({ entry: 'west', exit: 'east', target: 'port' }),
    population: Object.freeze({ traffic: 10, pedestrians: 16 }),
    visual: Object.freeze({ landmark: 'marina', vegetation: 'beach-palms', waterline: true }),
  }),
  Object.freeze({
    id: 'port',
    title: 'Port Island',
    theme: 'working-harbor',
    purpose: 'Working harbor, warehouses, freight roads and expansion space',
    center: Object.freeze({ x: 0, z: 0 }),
    bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }),
    bridge: Object.freeze({ entry: 'west', exit: 'east', target: 'downtown' }),
    population: Object.freeze({ traffic: 8, pedestrians: 10 }),
    visual: Object.freeze({ landmark: 'container-cranes', vegetation: 'sparse-coastal', waterline: true }),
  }),
]);

export const COASTLINE_WORLD_POPULATION_LIMITS = Object.freeze({
  city: Object.freeze({ traffic: 12, pedestrians: 16 }),
  downtown: COASTLINE_ISLAND_REGIONS[0].population,
  residential: COASTLINE_ISLAND_REGIONS[1].population,
  waterfront: COASTLINE_ISLAND_REGIONS[2].population,
  port: COASTLINE_ISLAND_REGIONS[3].population,
});

export function getCoastlineIslandRegion(id) {
  return COASTLINE_ISLAND_REGIONS.find(region => region.id === id) ?? null;
}

export function validateCoastlineIslandManifest(regions = COASTLINE_ISLAND_REGIONS) {
  const ids = new Set();
  for (const region of regions) {
    if (!region || typeof region.id !== 'string' || !region.id.trim()) {
      throw new Error('each Coastline island must have a non-empty id');
    }
    if (ids.has(region.id)) throw new Error(`duplicate Coastline island id: ${region.id}`);
    ids.add(region.id);
    if (!region.title || !region.theme || !region.purpose) {
      throw new Error(`island ${region.id} is missing its identity or design purpose`);
    }
    if (!Number.isFinite(region.bounds?.halfWidth) || region.bounds.halfWidth <= 0 ||
        !Number.isFinite(region.bounds?.halfDepth) || region.bounds.halfDepth <= 0) {
      throw new Error(`island ${region.id} has invalid bounds`);
    }
    for (const key of ['traffic', 'pedestrians']) {
      if (!Number.isInteger(region.population?.[key]) || region.population[key] < 0) {
        throw new Error(`island ${region.id} has an invalid ${key} budget`);
      }
    }
    if (!ids.has(region.bridge?.target) && !regions.some(candidate => candidate.id === region.bridge?.target)) {
      throw new Error(`island ${region.id} targets an unknown neighboring island`);
    }
  }
  return true;
}
