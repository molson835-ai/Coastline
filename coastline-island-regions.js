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
    contentDensity: 'developed',
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
    contentDensity: 'developed',
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
    contentDensity: 'sparse',
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
    contentDensity: 'sparse',
  }),
]);

export const COASTLINE_ISLAND_ELEVATION = 6;
export const COASTLINE_ISLAND_WATER_DROP = 3.0;

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

const RESIDENTIAL_SHORELINE = Object.freeze([
  [-0.72, -1], [0.18, -1], [0.56, -0.94], [0.82, -0.82],
  [0.72, -0.48], [0.82, -0.22], [0.94, -0.08], [1, 0],
  [1, 0.08], [0.78, 0.34], [0.86, 0.55], [0.62, 0.66],
  [0.18, 0.96], [0, 1], [-0.18, 0.92], [-0.48, 0.82],
  [-0.63, 0.62], [-0.82, 0.43], [-0.92, 0.18], [-0.92, -0.15],
  [-0.86, -0.38], [-0.82, -0.70],
]);

/** Point-in-shoreline test shared by rendering tests and the live movement blocker. */
export function isCoastlineIslandPointInside(x, z, regionId = 'residential') {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const region = getCoastlineIslandRegion(regionId);
  if (!region) return false;
  // Every streamed island root is currently placed in the shared world-space island slot.
  const nx = (x - 500) / region.bounds.halfWidth;
  const nz = (z - 500) / region.bounds.halfDepth;
  if (regionId !== 'residential') {
    const corner = Math.min(0.22, (region.bounds.cornerRadius || 20) / region.bounds.halfWidth);
    if (Math.abs(nx) > 1 || Math.abs(nz) > 1) return false;
    const dx = Math.max(0, Math.abs(nx) - (1 - corner));
    const dz = Math.max(0, Math.abs(nz) - (1 - corner));
    return dx * dx + dz * dz <= corner * corner;
  }
  const points = RESIDENTIAL_SHORELINE;
  // Keep bridge landings connected even when floating-point coordinates sit on an edge.
  const epsilon = 1e-6;
  for (let i = 0; i < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[(i + 1) % points.length];
    const cross = (nx - ax) * (bz - az) - (nz - az) * (bx - ax);
    const dot = (nx - ax) * (bx - ax) + (nz - az) * (bz - az);
    const lengthSquared = (bx - ax) ** 2 + (bz - az) ** 2;
    if (Math.abs(cross) < epsilon && dot >= -epsilon && dot <= lengthSquared + epsilon) return true;
  }
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > nz) !== (zj > nz) && nx < ((xj - xi) * (nz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function createIslandShape(THREE, region, scale = 1) {
  const half = region.bounds.halfWidth;
  const shape = new THREE.Shape();
  if (region.id === 'residential') {
    shape.moveTo(-half * 0.72 * scale, -half * scale);
    shape.lineTo(half * 0.18 * scale, -half * scale);
    shape.quadraticCurveTo(half * 0.7 * scale, -half * scale, half * 0.82 * scale, -half * 0.82 * scale);
    shape.lineTo(half * 0.72 * scale, -half * 0.48 * scale);
    shape.quadraticCurveTo(half * 0.66 * scale, -half * 0.2 * scale, half * 0.92 * scale, -half * 0.08 * scale);
    shape.quadraticCurveTo(half * scale, 0, half * scale, half * 0.08 * scale);
    shape.quadraticCurveTo(half * 0.98 * scale, half * 0.26 * scale, half * 0.78 * scale, half * 0.34 * scale);
    shape.quadraticCurveTo(half * 0.86 * scale, half * 0.55 * scale, half * 0.62 * scale, half * 0.66 * scale);
    shape.quadraticCurveTo(half * 0.36 * scale, half * 0.82 * scale, half * 0.18 * scale, half * 0.96 * scale);
    shape.quadraticCurveTo(0, half * 1.02 * scale, -half * 0.18 * scale, half * 0.92 * scale);
    shape.quadraticCurveTo(-half * 0.48 * scale, half * 0.82 * scale, -half * 0.63 * scale, half * 0.62 * scale);
    shape.quadraticCurveTo(-half * 0.83 * scale, half * 0.43 * scale, -half * 0.92 * scale, half * 0.18 * scale);
    shape.quadraticCurveTo(-half * 1.01 * scale, -half * 0.12 * scale, -half * 0.86 * scale, -half * 0.38 * scale);
    shape.quadraticCurveTo(-half * 0.82 * scale, -half * 0.7 * scale, -half * 0.72 * scale, -half * scale);
    shape.closePath();
    return shape;
  }
  const corner = (region.bounds.cornerRadius || 20) * scale;
  const edge = half * scale, inner = edge - corner;
  shape.moveTo(-inner, -edge); shape.lineTo(inner, -edge);
  shape.quadraticCurveTo(edge, -edge, edge, -inner); shape.lineTo(edge, inner);
  shape.quadraticCurveTo(edge, edge, inner, edge); shape.lineTo(-inner, edge);
  shape.quadraticCurveTo(-edge, edge, -edge, inner); shape.lineTo(-edge, -inner);
  shape.quadraticCurveTo(-edge, -edge, -inner, -edge);
  return shape;
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
  const oceanMat = material(0x176b80, 0.34, 0.08);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(740, 740), oceanMat);
  ocean.name = `coastline-${region.id}-surrounding-ocean`;
  ocean.rotation.x = -Math.PI / 2;
  // Keep the sea surface below the island shelf and the full rope-bridge sag.
  ocean.position.set(center.x, edgeY - COASTLINE_ISLAND_WATER_DROP, center.z);
  ocean.receiveShadow = false;
  root.add(ocean);

  // The sand is a continuous outer shoreline; the smaller raised land shape leaves
  // a visible beach band instead of painting the entire island sand-colored.
  const shoreShape = createIslandShape(THREE, region, 1.04);
  const shore = new THREE.Mesh(new THREE.ShapeGeometry(shoreShape, 6), sandMat);
  shore.name = `coastline-${region.id}-shoreline`;
  // Positive X rotation keeps the custom Shape's local Y aligned with world Z.
  shore.rotation.x = -Math.PI / 2; // ShapeGeometry faces +Z locally; rotate its normal upward for the visible top surface.
  shore.position.set(center.x, edgeY - 0.28, center.z);
  shore.receiveShadow = true;
  root.add(shore);

  // A sloped outer sand shelf bridges the raised island down to the lowered sea plane.
  // Reuse the shoreline's sampled contour so the slope follows the same distinctive cove.
  const upperBeachPoints = shoreShape.getPoints(8);
  const lowerBeachScale = 1.12 / 1.04;
  const beachVertices = [];
  const beachIndices = [];
  for (let i = 0; i < upperBeachPoints.length - 1; i++) {
    const a = upperBeachPoints[i], b = upperBeachPoints[i + 1];
    const base = beachVertices.length / 3;
    beachVertices.push(
      center.x + a.x, edgeY - 0.28, center.z + a.y,
      center.x + b.x, edgeY - 0.28, center.z + b.y,
      center.x + a.x * lowerBeachScale, edgeY - COASTLINE_ISLAND_WATER_DROP + 0.05, center.z + a.y * lowerBeachScale,
      center.x + b.x * lowerBeachScale, edgeY - COASTLINE_ISLAND_WATER_DROP + 0.05, center.z + b.y * lowerBeachScale
    );
    beachIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const beachGeometry = new THREE.BufferGeometry();
  beachGeometry.setAttribute('position', new THREE.Float32BufferAttribute(beachVertices, 3));
  beachGeometry.setIndex(beachIndices);
  beachGeometry.computeVertexNormals();
  const slopedBeach = new THREE.Mesh(beachGeometry, new THREE.MeshStandardMaterial({
    color: 0xc2b28b, roughness: 0.94, side: THREE.DoubleSide,
  }));
  slopedBeach.name = `coastline-${region.id}-sloped-sand-to-water`;
  slopedBeach.receiveShadow = true;
  root.add(slopedBeach);

  const landShape = createIslandShape(THREE, region, 0.94);
  const land = new THREE.Mesh(new THREE.ShapeGeometry(landShape, 6), landMat);
  land.name = `coastline-${region.id}-land`;
  land.rotation.x = -Math.PI / 2; // Keep the grass/land face visible from the camera above.
  land.position.set(center.x, edgeY - 0.02, center.z);
  land.receiveShadow = true;
  root.add(land);

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

  if (region.contentDensity === 'developed') {
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
    const plaster = material(0xe5e0d4, 0.84);
    const warmStone = material(0xc1b8a5, 0.9);
    const roof = material(0x343b40, 0.8, 0.12);
    const glass = material(0x315e69, 0.24, 0.18);
    const timber = material(0x75523b, 0.9);
    const garageShadow = material(0x111c20, 0.98);
    const poolWater = material(0x3195a6, 0.24, 0.12);
    const deck = material(0xc2b7a1, 0.88);
    const lawn = material(0x477a4b, 0.98);
    // The island's single signature property: a clean-lined modern villa, scaled
    // in the same world units as the drivable cars and with a car-sized garage bay.
    addBox('coastline-villa-main-volume', center.x + 5, edgeY + 4.5, center.z, 26, 9, 24, plaster, true, false);
    addBox('coastline-villa-upper-volume', center.x + 6, edgeY + 10, center.z, 20, 3.2, 18, warmStone, true, false);
    // Bright facade panels preserve the playful Homey identity without replacing
    // the original villa architecture or its existing garden details.
    const playfulPanels = [0xff6b6b, 0xffc857, 0x6bd5a4, 0x66b8ff, 0xb58cff].map(color => material(color, 0.74, 0.02));
    for (let i = 0; i < playfulPanels.length; i++) {
      addBox(`coastline-villa-playful-pattern-${i + 1}`, center.x - 7 + i * 5.1, edgeY + 7.3, center.z - 12.3, 2.1, 0.55, 0.08, playfulPanels[i], false, false);
    }
    addBox('coastline-villa-flat-roof', center.x + 5, edgeY + 11.8, center.z, 29, 0.65, 27, roof, true, false);
    addBox('coastline-villa-roof-overhang', center.x + 5, edgeY + 6.1, center.z - 0.4, 28, 0.38, 25, roof, true, false);
    // Wide glazing and timber accents give the façade warmth without a high-poly cost.
    for (const [i, x] of [center.x - 4, center.x + 2, center.x + 8, center.x + 13].entries()) {
      addBox(`coastline-villa-front-glass-${i + 1}`, x, edgeY + 5.1, center.z - 12.15, 4.2, 3.1, 0.12, glass, false, false);
    }
    addBox('coastline-villa-entry-door', center.x + 4.2, edgeY + 2.1, center.z - 12.28, 2.1, 4.1, 0.16, timber, false, false);
    addBox('coastline-villa-entry-porch', center.x + 4, edgeY + 0.2, center.z - 15, 11, 0.3, 6, deck, false, false);
    addBox('coastline-villa-garage-left-wall', center.x - 23.1, edgeY + 2.7, center.z - 2, 0.8, 5.4, 20, plaster, true, false);
    addBox('coastline-villa-garage-right-wall', center.x - 10.9, edgeY + 2.7, center.z - 2, 0.8, 5.4, 20, plaster, true, false);
    addBox('coastline-villa-garage-roof', center.x - 17, edgeY + 5.5, center.z - 2, 13.4, 0.55, 20.5, roof, true, false);
    addBox('coastline-villa-garage-shadow', center.x - 17, edgeY + 2.4, center.z + 7.7, 11.8, 4.6, 0.12, garageShadow, false, false);
    addBox('coastline-villa-garage-beam', center.x - 17, edgeY + 5.05, center.z - 12.2, 13.4, 0.55, 0.7, warmStone, true, false);
    addBox('coastline-villa-driveway', center.x - 17, edgeY + 0.08, center.z - 42, 7.8, 0.16, 56, concreteMat, false, false);
    addBox('coastline-villa-driveway-apron', center.x - 17, edgeY + 0.1, center.z - 14, 10, 0.18, 7, deck, false, false);
    addBox('coastline-villa-garden-lawn', center.x + 39, edgeY + 0.03, center.z + 3, 30, 0.08, 42, lawn, false, false);
    addBox('coastline-villa-pool-deck', center.x + 38, edgeY + 0.06, center.z + 3, 17, 0.12, 24, deck, false, false);
    addBox('coastline-villa-pool', center.x + 38, edgeY + 0.14, center.z + 3, 11, 0.08, 18, poolWater, false, false);
    for (const [i, x] of [center.x + 30, center.x + 34, center.x + 42].entries()) {
      addBox(`coastline-villa-pool-lounger-${i + 1}`, x, edgeY + 0.35, center.z + 18, 2.1, 0.32, 4.8, plaster, false, false);
    }
    // Colliders are segmented around the front entry and the open garage bay.
    colliders.push(
      { name: 'coastline-villa-west-wall', x: center.x - 8, z: center.z, w: 1.1, d: 24 },
      { name: 'coastline-villa-east-wall', x: center.x + 18, z: center.z, w: 1.1, d: 24 },
      { name: 'coastline-villa-back-wall', x: center.x + 5, z: center.z + 12, w: 26, d: 1.1 },
      { name: 'coastline-villa-front-left-wall', x: center.x + 1, z: center.z - 12, w: 12, d: 1.1 },
      { name: 'coastline-villa-front-right-wall', x: center.x + 13, z: center.z - 12, w: 8, d: 1.1 },
      { name: 'coastline-villa-garage-west-wall', x: center.x - 23.1, z: center.z - 2, w: 0.9, d: 20 },
      { name: 'coastline-villa-garage-east-wall', x: center.x - 10.9, z: center.z - 2, w: 0.9, d: 20 },
      { name: 'coastline-villa-garage-back-wall', x: center.x - 17, z: center.z + 8, w: 13.4, d: 0.9 }
    );
    // Small gardens, a stone walk, and warm path lights make the property feel lived in.
    addBox('coastline-villa-front-garden-bed', center.x + 7, edgeY + 0.06, center.z - 17, 18, 0.12, 3.2, lawn, false, false);
    addBox('coastline-villa-front-walk', center.x + 4, edgeY + 0.08, center.z - 20, 4, 0.16, 8, deck, false, false);
    // Large coastal rocks frame the perimeter while leaving both bridge landings open.
    const rockAngles = Array.from({ length: 16 }, (_, i) => i * Math.PI * 2 / 16)
      .filter(angle => Math.abs(angle) > 0.34 && Math.abs(Math.abs(angle) - Math.PI / 2) > 0.34);
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(rockGeometry, material(0x77756c, 0.98), rockAngles.length);
    const rockDummy = new THREE.Object3D();
    rocks.name = 'coastline-residential-giant-decorative-rocks';
    rockAngles.forEach((angle, i) => {
      rockDummy.position.set(center.x + Math.cos(angle) * 101, edgeY + 0.35, center.z + Math.sin(angle) * 101);
      rockDummy.scale.set(2.0 + (i % 3) * 0.55, 0.8 + (i % 2) * 0.35, 1.6 + (i % 4) * 0.3);
      rockDummy.rotation.set(0, angle, 0);
      rockDummy.updateMatrix();
      rocks.setMatrixAt(i, rockDummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = false;
    rocks.receiveShadow = true;
    root.add(rocks);
    const bushMat = material(0x2e6740, 0.98);
    const flowerMats = [0xf0c7ce, 0xf4d98a, 0xf6f1e5];
    const gardenDummy = new THREE.Object3D();
    const bushGeometry = new THREE.SphereGeometry(1, 7, 5);
    const bushes = new THREE.InstancedMesh(bushGeometry, bushMat, 18);
    bushes.name = 'coastline-villa-garden-bushes';
    const flowerGeometry = new THREE.SphereGeometry(0.2, 6, 4);
    const flowers = new THREE.InstancedMesh(flowerGeometry, material(0xffffff, 0.75), 18);
    flowers.name = 'coastline-villa-garden-flowers';
    for (let i = 0; i < 18; i++) {
      const x = center.x - 1 + (i % 9) * 2.2;
      const z = center.z - 18 - Math.floor(i / 9) * 2.4;
      gardenDummy.position.set(x, edgeY + 0.52, z);
      gardenDummy.scale.set(0.74, 0.52, 0.56);
      gardenDummy.rotation.set(0, (i % 4) * 0.2, 0);
      gardenDummy.updateMatrix(); bushes.setMatrixAt(i, gardenDummy.matrix);
      gardenDummy.position.set(x + 0.2, edgeY + 0.9, z - 0.2);
      gardenDummy.scale.setScalar(1);
      gardenDummy.rotation.set(0, 0, 0);
      gardenDummy.updateMatrix(); flowers.setMatrixAt(i, gardenDummy.matrix);
      flowers.setColorAt(i, new THREE.Color(flowerMats[i % flowerMats.length]));
    }
    bushes.instanceMatrix.needsUpdate = true; flowers.instanceMatrix.needsUpdate = true;
    bushes.castShadow = false; bushes.receiveShadow = true;
    flowers.castShadow = false;
    root.add(bushes, flowers);

    const lampPostMat = material(0x393c3a, 0.72, 0.18);
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffdf9b, emissive: 0xffbd63, emissiveIntensity: 1.1, roughness: 0.4 });
    const lampPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 1.45, 6), lampPostMat, 10);
    const lampBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 5), lampGlowMat, 10);
    lampPosts.name = 'coastline-villa-path-light-posts';
    lampBulbs.name = 'coastline-villa-path-light-bulbs';
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        const index = i * 2 + (side === 1 ? 1 : 0);
        const x = center.x - 17 + side * 5.5;
        const z = center.z - 17 - i * 7.5;
        gardenDummy.position.set(x, edgeY + 0.8, z);
        gardenDummy.scale.set(1, 1, 1); gardenDummy.rotation.set(0, 0, 0);
        gardenDummy.updateMatrix(); lampPosts.setMatrixAt(index, gardenDummy.matrix);
        gardenDummy.position.set(x, edgeY + 1.55, z);
        gardenDummy.updateMatrix(); lampBulbs.setMatrixAt(index, gardenDummy.matrix);
      }
    }
    lampPosts.instanceMatrix.needsUpdate = true; lampBulbs.instanceMatrix.needsUpdate = true;
    lampPosts.castShadow = false; lampBulbs.castShadow = false;
    root.add(lampPosts, lampBulbs);
    // The garden is deliberately modest so the mobile scene remains inexpensive.
    addBox('coastline-residential-park', center.x + 42, edgeY + 0.03, center.z - 51, 24, 0.08, 18, lawn, false, false);
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

  }

  if (region.contentDensity === 'developed' && region.visual?.vegetation !== 'sparse-coastal') {
    const trunk = material(0x79583d, 0.96);
    const leaves = material(0x2f7047, 0.94);
    const coconutMat = material(0x6b5635, 0.92);
    const treeOffsets = region.id === 'residential'
      ? [[-82,-56],[-63,-80],[-28,-88],[34,-88],[72,-68],[91,-8],[78,48],[46,82],[-12,88],[-58,73],[-86,32]]
      : Array.from({ length: 8 }, (_, i) => [-82 + (i % 4) * 54, i < 4 ? -72 : 76]);
    const treeDummy = new THREE.Object3D();
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 5.5, 7), trunk, treeOffsets.length);
    const crowns = new THREE.InstancedMesh(new THREE.SphereGeometry(1.05, 7, 5), leaves, treeOffsets.length);
    const fronds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.14, 4.8, 5), leaves, treeOffsets.length * 7);
    const coconuts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 5, 4), coconutMat, treeOffsets.length * 3);
    trunks.name = `coastline-${region.id}-palm-trunks`;
    crowns.name = `coastline-${region.id}-palm-crowns`;
    fronds.name = `coastline-${region.id}-palm-fronds`;
    coconuts.name = `coastline-${region.id}-palm-coconuts`;
    let frondIndex = 0, coconutIndex = 0;
    treeOffsets.forEach(([dx, dz], i) => {
      const x = center.x + dx, z = center.z + dz;
      const stem = new THREE.Object3D();
      stem.position.set(x, edgeY + 2.75, z); stem.updateMatrix(); trunks.setMatrixAt(i, stem.matrix);
      treeDummy.position.set(x, edgeY + 5.6, z);
      treeDummy.scale.set(1.25, 0.62, 1.25); treeDummy.rotation.set(0, 0, 0);
      treeDummy.updateMatrix(); crowns.setMatrixAt(i, treeDummy.matrix);
      colliders.push({ name: `coastline-${region.id}-palm-trunk-${i + 1}`, x, z, w: 2.0, d: 2.0 });
      for (let frond = 0; frond < 7; frond++) {
        const angle = frond * Math.PI * 2 / 7 + (i % 3) * 0.18;
        const direction = new THREE.Vector3(Math.cos(angle), -0.48 - (frond % 2) * 0.08, Math.sin(angle)).normalize();
        treeDummy.position.set(x + direction.x * 1.9, edgeY + 6.25 + direction.y * 1.9, z + direction.z * 1.9);
        treeDummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        treeDummy.scale.set(1, 1, 1); treeDummy.updateMatrix();
        fronds.setMatrixAt(frondIndex++, treeDummy.matrix);
      }
      for (let nut = 0; nut < 3; nut++) {
        const angle = nut * Math.PI * 2 / 3;
        treeDummy.position.set(x + Math.cos(angle) * 0.48, edgeY + 5.45, z + Math.sin(angle) * 0.48);
        treeDummy.quaternion.set(0, 0, 0, 1); treeDummy.scale.set(1, 1, 1); treeDummy.updateMatrix();
        coconuts.setMatrixAt(coconutIndex++, treeDummy.matrix);
      }
    });
    for (const mesh of [trunks, crowns, fronds, coconuts]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh === trunks;
      mesh.receiveShadow = mesh === trunks;
      root.add(mesh);
    }
    // Instanced shoreline rocks preserve the rough beach edge with a handful of draw calls.
    if (region.id === 'residential') {
      const rockMat = material(0x77756c, 0.98);
      const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
      const rocks = new THREE.InstancedMesh(rockGeometry, rockMat, 18);
      rocks.name = 'coastline-residential-shore-rocks';
      for (let i = 0; i < 18; i++) {
        const angle = i * Math.PI * 2 / 18;
        treeDummy.position.set(center.x + Math.cos(angle) * 103, edgeY + 0.02, center.z + Math.sin(angle) * 103);
        treeDummy.scale.set(1.12 + (i % 3) * 0.22, 0.44 + (i % 2) * 0.12, 0.9);
        treeDummy.rotation.set(0, angle, 0); treeDummy.updateMatrix();
        rocks.setMatrixAt(i, treeDummy.matrix);
      }
      rocks.instanceMatrix.needsUpdate = true;
      rocks.castShadow = false; rocks.receiveShadow = true; root.add(rocks);
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
    if (!['developed', 'sparse'].includes(region.contentDensity)) {
      throw new Error(`island ${region.id} has invalid content density`);
    }
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
