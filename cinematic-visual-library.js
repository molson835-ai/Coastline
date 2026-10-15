// Coastline cinematic visual architecture.
// Data-first: game geometry can consume these profiles without changing world semantics.

const LOD = Object.freeze({
  hero: Object.freeze({ distance: 45, detail: 1 }),
  near: Object.freeze({ distance: 120, detail: 0.78 }),
  mid: Object.freeze({ distance: 300, detail: 0.42 }),
  far: Object.freeze({ distance: 700, detail: 0.16 }),
});

const VEHICLES = Object.freeze({
  suv: Object.freeze({
    dimensions: Object.freeze({ length: 4.83, width: 1.92, height: 1.73 }),
    wheel: Object.freeze({ radius: 0.39, width: 0.235, inset: 0.04 }),
    body: Object.freeze({ hoodRatio: 0.22, cabinRatio: 0.43, rearRatio: 0.35, glassRatio: 0.31 }),
    materials: Object.freeze(['paint', 'glass', 'rubber', 'chrome', 'lamp']),
    details: Object.freeze(['panel-seams', 'door-handles', 'mirrors', 'grille', 'underbody', 'lamp-lenses']),
  }),
  sedan: Object.freeze({
    dimensions: Object.freeze({ length: 4.78, width: 1.84, height: 1.44 }),
    wheel: Object.freeze({ radius: 0.34, width: 0.215, inset: 0.035 }),
    body: Object.freeze({ hoodRatio: 0.25, cabinRatio: 0.45, rearRatio: 0.30, glassRatio: 0.34 }),
    materials: Object.freeze(['paint', 'glass', 'rubber', 'chrome', 'lamp']),
    details: Object.freeze(['panel-seams', 'door-handles', 'mirrors', 'grille', 'underbody', 'lamp-lenses']),
  }),
  pickup: Object.freeze({
    dimensions: Object.freeze({ length: 5.65, width: 2.03, height: 1.82 }),
    wheel: Object.freeze({ radius: 0.41, width: 0.25, inset: 0.05 }),
    body: Object.freeze({ hoodRatio: 0.24, cabinRatio: 0.34, rearRatio: 0.42, glassRatio: 0.28 }),
    materials: Object.freeze(['paint', 'glass', 'rubber', 'chrome', 'lamp']),
    details: Object.freeze(['panel-seams', 'door-handles', 'mirrors', 'grille', 'bed', 'lamp-lenses']),
  }),
  sports: Object.freeze({
    dimensions: Object.freeze({ length: 4.55, width: 1.93, height: 1.25 }),
    wheel: Object.freeze({ radius: 0.35, width: 0.255, inset: 0.025 }),
    body: Object.freeze({ hoodRatio: 0.29, cabinRatio: 0.40, rearRatio: 0.31, glassRatio: 0.30 }),
    materials: Object.freeze(['paint', 'glass', 'rubber', 'metal', 'lamp']),
    details: Object.freeze(['panel-seams', 'door-handles', 'mirrors', 'diffuser', 'grille', 'lamp-lenses']),
  }),
});

const CHARACTER = Object.freeze({
  adult: Object.freeze({
    height: 1.76,
    proportions: Object.freeze({ head: 0.13, torso: 0.31, pelvis: 0.11, upperLeg: 0.245, lowerLeg: 0.255 }),
    widths: Object.freeze({ shoulder: 0.26, pelvis: 0.18 }),
    articulation: Object.freeze(['neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'spine', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR']),
    states: Object.freeze(['idle', 'walk', 'run', 'jump', 'crouch', 'enterVehicle', 'exitVehicle']),
  }),
});

const ENVIRONMENT = Object.freeze({
  road: Object.freeze({ layers: Object.freeze(['base', 'asphalt', 'aggregate', 'marking', 'wear']), edge: Object.freeze(['curb', 'drain', 'shoulder']) }),
  vegetation: Object.freeze({ layers: Object.freeze(['groundcover', 'shrub', 'understory', 'canopy', 'deadfall']) }),
  architecture: Object.freeze({ layers: Object.freeze(['foundation', 'structure', 'facade', 'roof', 'service', 'weathering']) }),
  infrastructure: Object.freeze({ layers: Object.freeze(['pole', 'wire', 'fixture', 'sign', 'utility', 'maintenance']) }),
});

export function getCinematicProfile(kind, name) {
  const group = kind === 'vehicle' ? VEHICLES : kind === 'character' ? { adult: CHARACTER.adult } : ENVIRONMENT;
  return group[name] ?? null;
}

export function cinematicLOD(distance) {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  if (distance <= LOD.hero.distance) return 0;
  if (distance <= LOD.near.distance) return 1;
  if (distance <= LOD.mid.distance) return 2;
  if (distance <= LOD.far.distance) return 3;
  return 4;
}

export function cinematicQuality(distance, budget = 1) {
  const level = cinematicLOD(distance);
  const base = [1, 0.78, 0.42, 0.16, 0][level];
  return Math.max(0, Math.min(1, base * Math.max(0, Math.min(1, budget))));
}

export function vehicleVisualRules() {
  return Object.freeze({
    coordinateUnit: 'meters',
    geometry: 'modular-hard-surface',
    materials: 'layered-PBR-ready',
    lighting: 'physical-key-fill-rim',
    reflections: 'screen-space-when-affordable',
    shadows: 'tiered-by-distance-and-performance',
    principle: 'hero-detail near camera; semantic proxies at distance',
  });
}

export { LOD, VEHICLES, CHARACTER, ENVIRONMENT };
