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
    center: Object.freeze({ x: 500, z: 500 }),
    bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }),
    bridge: Object.freeze({ entry: 'north', exit: 'north', target: 'residential' }),
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
    bridge: Object.freeze({ entry: 'north', exit: 'east', target: 'waterfront' }),
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
    bridge: Object.freeze({ entry: 'west', exit: 'west', target: 'waterfront' }),
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

/**
 * Build a themed, self-contained island scene. The host runtime owns world
 * activation, collision, transition gates and disposal; this factory only
 * creates the region's renderable root and never starts background simulation.
 */
export function createCoastlineIslandRoot({ THREE, region, groundY = () => 0, addBridge, addSideBridge }) {
  if (!THREE || !region) throw new Error('THREE and an island region are required');
  const center = { x: 500, z: 500 };
  const half = region.bounds.halfWidth;
  const edgeY = Number.isFinite(groundY(center.x, center.z)) ? groundY(center.x, center.z) : 0;
  const root = new THREE.Group();
  root.name = `coastline-island-${region.id}-root`;
  const colliders = [];
  root.userData.coastlineColliders = colliders;

  const material = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const landMat = material(region.theme === 'working-harbor' ? 0x777b70 : 0x55785b, 0.96);
  const sandMat = material(0xc2b28b, 0.9);
  const roadMat = material(0x343c3d, 0.9);
  const concreteMat = material(0x777c7a, 0.88);
  const shape = new THREE.Shape();
  const corner = region.bounds.cornerRadius;
  const inner = half - corner;
  shape.moveTo(-inner, -half); shape.lineTo(inner, -half);
  shape.quadraticCurveTo(half, -half, half, -inner);
  shape.lineTo(half, inner); shape.quadraticCurveTo(half, half, inner, half);
  shape.lineTo(-inner, half); shape.quadraticCurveTo(-half, half, -half, inner);
  shape.lineTo(-half, -inner); shape.quadraticCurveTo(-half, -half, -inner, -half);

  const land = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), landMat);
  land.name = `coastline-${region.id}-land`;
  land.rotation.x = -Math.PI / 2;
  land.position.set(center.x, edgeY - 0.18, center.z);
  land.receiveShadow = true;
  root.add(land);
  const shore = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), sandMat);
  shore.name = `coastline-${region.id}-shoreline`;
  shore.rotation.x = -Math.PI / 2;
  shore.scale.setScalar(1.025);
  shore.position.set(center.x, edgeY - 0.04, center.z);
  root.add(shore);

  const addBox = (name, x, y, z, width, height, depth, mat, castShadow = true, collidable = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (collidable) colliders.push({ name, x, z, w: width, d: depth });
    return mesh;
  };
  addBox(`coastline-${region.id}-main-road`, center.x, edgeY + 0.02, center.z - 82.5, 16, 0.16, 55, roadMat, false, false);

  if (region.theme === 'urban-core') {
    const glass = material(0x668b98, 0.32, 0.18);
    const stone = material(0xb5b6b0, 0.8);
    for (let i = 0; i < 8; i++) {
      const x = center.x - 70 + (i % 4) * 46;
      const z = center.z - 28 + Math.floor(i / 4) * 48;
      const h = 18 + (i % 3) * 12;
      addBox(`coastline-downtown-tower-${i + 1}`, x, edgeY + h / 2, z, 18 + (i % 2) * 4, h, 18 + (i % 3) * 2, i % 2 ? glass : stone);
    }
  } else if (region.theme === 'coastal-neighborhood') {
    const walls = [material(0xd8c7a8), material(0xe5dfcf), material(0xc9d8d2)];
    const roofs = material(0x76594a, 0.86);
    for (let i = 0; i < 8; i++) {
      const x = center.x - 66 + (i % 4) * 44;
      const z = center.z - 16 + Math.floor(i / 4) * 50;
      addBox(`coastline-residential-home-${i + 1}`, x, edgeY + 3, z, 18, 6, 16, walls[i % walls.length]);
      addBox(`coastline-residential-roof-${i + 1}`, x, edgeY + 6.4, z, 19, 0.8, 17, roofs);
    }
    const grass = material(0x3e7848, 0.98);
    addBox('coastline-residential-park', center.x - 48, edgeY + 0.03, center.z + 58, 48, 0.08, 26, grass, false, false);
  } else if (region.theme === 'resort-marina') {
    const boardwalk = material(0x92765a, 0.92);
    const water = material(0x438c9a, 0.36, 0.08);
    addBox('coastline-waterfront-boardwalk', center.x, edgeY + 0.04, center.z + 40, 120, 0.2, 10, boardwalk);
    addBox('coastline-waterfront-marina-water', center.x + 42, edgeY - 0.02, center.z + 65, 48, 0.08, 30, water, false, false);
    for (let i = 0; i < 4; i++) addBox(`coastline-waterfront-dock-${i + 1}`, center.x + 20 + i * 12, edgeY + 0.1, center.z + 65, 2.4, 0.25, 32, boardwalk);
    const resort = material(0xf0e7d4, 0.78);
    addBox('coastline-waterfront-resort', center.x - 42, edgeY + 7, center.z - 5, 26, 14, 22, resort);
  } else if (region.theme === 'working-harbor') {
    const containerColors = [0x9a4f3e, 0x3f6979, 0xc19a4e, 0x657d67].map(color => material(color, 0.82, 0.12));
    const warehouse = material(0xaaa99f, 0.86, 0.08);
    addBox('coastline-port-warehouse', center.x - 42, edgeY + 5, center.z - 8, 42, 10, 28, warehouse);
    for (let i = 0; i < 12; i++) {
      const x = center.x + 12 + (i % 4) * 16;
      const z = center.z - 32 + Math.floor(i / 4) * 20;
      addBox(`coastline-port-container-${i + 1}`, x, edgeY + 2.5, z, 14, 5, 8, containerColors[i % containerColors.length]);
    }
    const crane = material(0xd6ad58, 0.62, 0.22);
    addBox('coastline-port-crane-mast', center.x + 66, edgeY + 12, center.z + 12, 2.4, 24, 2.4, crane);
    addBox('coastline-port-crane-boom', center.x + 54, edgeY + 23, center.z + 12, 26, 2.4, 2.4, crane);
  }

  if (region.visual?.vegetation !== 'sparse-coastal') {
    const trunk = material(0x79583d, 0.96);
    const leaves = material(0x2f7047, 0.94);
    for (let i = 0; i < 8; i++) {
      const x = center.x - 82 + (i % 4) * 54;
      const z = center.z + (i < 4 ? -72 : 76);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 5.5, 7), trunk);
      stem.name = `coastline-${region.id}-palm-trunk-${i + 1}`;
      stem.position.set(x, edgeY + 2.75, z);
      stem.castShadow = true;
      root.add(stem);
      colliders.push({ name: stem.name, x, z, w: 2.4, d: 2.4 });
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.5, 7, 5), leaves);
      crown.name = `coastline-${region.id}-palm-crown-${i + 1}`;
      crown.position.set(x, edgeY + 5.7, z);
      crown.scale.set(1.4, 0.5, 1.4);
      root.add(crown);
    }
  }
  if (region.id === 'residential' && typeof addBridge === 'function') addBridge(THREE, root, { x: center.x, startZ: center.z - half, y: edgeY, length: 100 });
  if (typeof addSideBridge === 'function') {
    if (region.id === 'waterfront' || region.id === 'port') {
      addSideBridge(THREE, root, { edgeX: center.x - half, z: center.z, y: edgeY, length: 100, direction: -1, name: `${region.id}-west` });
    }
    if (region.id === 'residential' || region.id === 'waterfront') {
      addSideBridge(THREE, root, { edgeX: center.x + half, z: center.z, y: edgeY, length: 100, direction: 1, name: `${region.id}-east` });
    }
  }
  return root;
}

export function validateCoastlineIslandManifest(regions = COASTLINE_ISLAND_REGIONS) {
  const ids = new Set();

  // Validate the complete identity set first. This ensures a duplicate id is
  // reported as such instead of masking it as a missing-neighbor error on an
  // earlier region whose target was overwritten by the duplicate.
  for (const region of regions) {
    if (!region || typeof region.id !== 'string' || !region.id.trim()) {
      throw new Error('each Coastline island must have a non-empty id');
    }
    if (ids.has(region.id)) throw new Error(`duplicate Coastline island id: ${region.id}`);
    ids.add(region.id);
  }

  for (const region of regions) {
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
    if (!ids.has(region.bridge?.target)) {
      throw new Error(`island ${region.id} targets an unknown neighboring island`);
    }
  }
  return true;
}
