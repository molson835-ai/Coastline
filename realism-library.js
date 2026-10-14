// Coastline real-world visual grammar.
// Data-only profiles keep high-fidelity modeling deterministic and reusable without
// shipping heavyweight mesh assets. Geometry builders can consume these profiles.

const freezeProfile = profile => Object.freeze({ ...profile, materials: Object.freeze({ ...profile.materials }), dimensions: Object.freeze({ ...profile.dimensions }) });

export const REALISM_PROFILES = Object.freeze({
  residentialStreet: freezeProfile({
    type: 'residential-street',
    dimensions: { laneWidth: 3.35, sidewalkWidth: 1.55, curbHeight: 0.14, shoulderWidth: 0.35 },
    materials: { pavement: 'asphalt', curb: 'concrete', sidewalk: 'concrete', marking: 'none' },
    features: ['driveways', 'mailboxes', 'utility-poles', 'street-trees', 'parked-cars', 'front-yards']
  }),
  arterial: freezeProfile({
    type: 'arterial',
    dimensions: { laneWidth: 3.55, sidewalkWidth: 1.8, curbHeight: 0.16, shoulderWidth: 0.75 },
    materials: { pavement: 'asphalt', curb: 'concrete', sidewalk: 'concrete', marking: 'thermoplastic' },
    features: ['double-yellow', 'white-edge-lines', 'crosswalks', 'signal-poles', 'guardrails', 'bus-stops']
  }),
  retailStrip: freezeProfile({
    type: 'retail-strip',
    dimensions: { storefrontDepth: 18, parkingDepth: 17, sidewalkWidth: 2.2, curbHeight: 0.16 },
    materials: { pavement: 'asphalt', sidewalk: 'concrete', facade: 'mixed-masonry-metal' },
    features: ['monument-signs', 'parking-islands', 'light-poles', 'loading-zones', 'storefront-glass', 'dumpsters']
  }),
  serviceStation: freezeProfile({
    type: 'service-station',
    dimensions: { canopyHeight: 5.3, canopyDepth: 8.8, pumpIslandWidth: 1.3, forecourtDepth: 28 },
    materials: { forecourt: 'concrete', canopy: 'painted-steel', building: 'masonry-glass' },
    features: ['pump-islands', 'price-pylon', 'air-machine', 'bollards', 'vacuum', 'fuel-canopy-lighting']
  }),
  riverTrail: freezeProfile({
    type: 'river-trail',
    dimensions: { trailWidth: 3.0, shoulderWidth: 0.6, waterBuffer: 8 },
    materials: { trail: 'asphalt', edge: 'earth-gravel', rail: 'weathered-steel' },
    features: ['trail-signs', 'benches', 'bollards', 'riparian-trees', 'drainage-swales', 'riverbank-rocks']
  }),
  farmstead: freezeProfile({
    type: 'farmstead',
    dimensions: { houseWidth: 11, houseDepth: 9, barnWidth: 14, barnDepth: 22, porchDepth: 2.2 },
    materials: { house: 'painted-siding', barn: 'weathered-wood', roof: 'asphalt-shingle' },
    features: ['porch', 'barn', 'fence', 'gravel-drive', 'field', 'mature-trees']
  })
});

export function getRealismProfile(type) {
  return REALISM_PROFILES[type] || null;
}

export function featureSet(type) {
  return [...(getRealismProfile(type)?.features || [])];
}

export function realismLibraryRules() {
  return Object.freeze({
    version: 1,
    philosophy: 'real-world proportions + repeated modular detail + regional context',
    profiles: Object.keys(REALISM_PROFILES),
    assetStrategy: 'small reusable primitives first; replace with detailed meshes without changing world semantics'
  });
}
