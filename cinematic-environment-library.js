// Modular environment detail profiles. Geometry remains swappable while world semantics stay stable.

const ROAD_FURNITURE = Object.freeze({
  residential: Object.freeze(['mailbox', 'driveway', 'utility-pole', 'hydrant', 'street-tree', 'drain']),
  arterial: Object.freeze(['signal', 'crosswalk', 'guardrail', 'bus-stop', 'utility-pole', 'drain']),
  rural: Object.freeze(['fence', 'mailbox', 'ditch', 'culvert', 'utility-pole', 'field-marker']),
});

const WEATHERING = Object.freeze({
  asphalt: Object.freeze(['tire-polish', 'patch', 'crack', 'seam', 'oil-stain']),
  concrete: Object.freeze(['joint', 'chip', 'stain', 'hairline-crack']),
  paintedMetal: Object.freeze(['fade', 'edge-wear', 'rust-speck', 'dust']),
  wood: Object.freeze(['grain', 'fade', 'water-mark', 'moss']),
});

const TERRAIN = Object.freeze({
  valley: Object.freeze(['topsoil', 'grass', 'brush', 'woodland', 'rock', 'stream-edge']),
  river: Object.freeze(['bank', 'riprap', 'wet-soil', 'reeds', 'driftwood', 'water']),
  developed: Object.freeze(['lawn', 'mulch', 'foundation', 'drainage', 'pavement']),
});

export function environmentDetail(kind) {
  if (kind === 'road') return ROAD_FURNITURE;
  if (kind === 'weathering') return WEATHERING;
  if (kind === 'terrain') return TERRAIN;
  return null;
}

export function environmentLayerBudget(distance, performance = 1) {
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const p = Math.max(0, Math.min(1, performance));
  if (d < 60) return Math.max(4, Math.round(12 * p));
  if (d < 180) return Math.max(3, Math.round(8 * p));
  if (d < 420) return Math.max(2, Math.round(4 * p));
  return 1;
}

export function environmentRules() {
  return Object.freeze({
    construction: 'modular-procedural',
    detail: 'layered-by-material-and-distance',
    weathering: 'sparse-seeded-imperfections',
    terrain: 'continuous-transitions-not-hard-color-bands',
    regionalism: 'road-furniture-and-land-use carry identity',
  });
}

export { ROAD_FURNITURE, WEATHERING, TERRAIN };
