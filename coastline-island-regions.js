/**
 * Coastline's canonical four-island design manifest.
 *
 * These four world-segment contracts define distinct islands at the same visual
 * quality bar as the City. Keep identity, transition targets, content density,
 * and population budgets here rather than scattering them through runtime code.
 * Only the active region owns live simulation; inactive islands are streamed scenery.
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
    contentDensity: 'developed',
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
    visual: Object.freeze({ landmark: 'container-cranes', vegetation: 'harbor-palms', waterline: true }),
    contentDensity: 'developed',
  }),
]);

export const COASTLINE_CAVE_THRESHOLD = Object.freeze({ x: 548, z: 540.5, radius: 1.0 });
export const COASTLINE_CAVE_PORTAL_CLEAR_WIDTH = 6.0;

export function getCoastlineCaveColliders(caveX = 548, caveZ = 538) {
  return [
    {name:'coastline-waterfront-cave-mountain-left-slope',x:caveX-12,z:caveZ-5,w:10,d:12},
    {name:'coastline-waterfront-cave-mountain-right-slope',x:caveX+12,z:caveZ-5,w:10,d:12},
    {name:'coastline-waterfront-cave-mountain-rear-ridge',x:caveX,z:caveZ-13,w:30,d:10},
    {name:'coastline-waterfront-cave-mountain-left-wing',x:caveX-10.5,z:caveZ-1,w:13,d:21},
    {name:'coastline-waterfront-cave-mountain-right-wing',x:caveX+10.5,z:caveZ-1,w:13,d:21},
    {name:'coastline-waterfront-cave-rear-wall',x:caveX,z:caveZ-10.5,w:28,d:8},
    {name:'coastline-waterfront-cave-left-portal-jamb',x:caveX-4.5,z:caveZ-.3,w:3,d:8.2},
    {name:'coastline-waterfront-cave-right-portal-jamb',x:caveX+4.5,z:caveZ-.3,w:3,d:8.2},
    {name:'coastline-electric-lemonade-cave-left-rock',x:caveX-6.5,z:caveZ+.1,w:4.2,d:5.2},
    {name:'coastline-electric-lemonade-cave-right-rock',x:caveX+6.5,z:caveZ+.1,w:4.2,d:5.2},
  ];
}

export function isCoastlineCavePointBlocked(x, z, radius = 0) {
  if (![x,z,radius].every(Number.isFinite) || radius < 0) return true;
  return getCoastlineCaveColliders().some(collider =>
    Math.abs(x - collider.x) <= collider.w / 2 + radius &&
    Math.abs(z - collider.z) <= collider.d / 2 + radius
  );
}

export const COASTLINE_ISLAND_ELEVATION = 6;
export const COASTLINE_ISLAND_WATER_DROP = 3.0;

// Water depth is a deterministic gameplay contract, independent of rendered meshes.
// Distances are world units measured from the authored shallow-water shelf.
export const COASTLINE_WATER_DEPTH_BANDS = Object.freeze({
  shoreMax: 0.45,
  shallowMax: 1.25,
  midMax: 4.5,
});

export function getCoastlineWaterDepthBand(depth) {
  if (!Number.isFinite(depth) || depth < 0) return 'deep';
  if (depth <= COASTLINE_WATER_DEPTH_BANDS.shoreMax) return 'shore';
  if (depth <= COASTLINE_WATER_DEPTH_BANDS.shallowMax) return 'shallow';
  if (depth <= COASTLINE_WATER_DEPTH_BANDS.midMax) return 'mid';
  return 'deep';
}

export function canTraverseCoastlineWater(depth, mode = 'on-foot') {
  return mode === 'on-foot' &&
    (getCoastlineWaterDepthBand(depth) === 'shore' || getCoastlineWaterDepthBand(depth) === 'shallow');
}

/** Authored shallow-water footpath on the Waterfront's southeast edge. */
export function isCoastlineShallowWaterPath(x, z, regionId = 'waterfront', mode = 'on-foot') {
  if (regionId !== 'waterfront' || mode !== 'on-foot' || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  const insidePath = x >= 602 && x <= 638 && z >= 522 && z <= 558;
  return insidePath && canTraverseCoastlineWater(0.8, mode);
}

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

const NATURAL_ISLAND_SHORELINES = Object.freeze({
  downtown: Object.freeze([
    [-0.72,-1],[-0.12,-1],[0.36,-.95],[.68,-.82],[.84,-.59],[.78,-.32],[.97,-.12],[1,0],[.91,.22],[.73,.43],[.82,.67],[.5,.86],[.15,.96],[-.18,.94],[-.5,.8],[-.76,.6],[-.91,.31],[-.97,.04],[-.86,-.28],[-.84,-.65]
  ].map(point=>Object.freeze(point))),
  waterfront: Object.freeze([
    [-.82,-.9],[-.34,-1],[.18,-.98],[.58,-.9],[.82,-.72],[.9,-.46],[.78,-.24],[.96,-.08],[1,0],[.94,.18],[.76,.39],[.78,.67],[.48,.86],[.12,.96],[-.2,.9],[-.43,.72],[-.72,.63],[-.9,.38],[-.96,.12],[-1,0],[-.9,-.32],[-.94,-.62]
  ].map(point=>Object.freeze(point))),
  port: Object.freeze([
    [-.75,-1],[-.18,-.98],[.28,-.92],[.68,-.8],[.86,-.6],[.92,-.36],[.8,-.1],[.96,.08],[1,0],[.91,.31],[.7,.58],[.48,.8],[.12,.95],[-.25,.88],[-.62,.78],[-.86,.56],[-.96,.25],[-1,0],[-.88,-.32],[-.9,-.7]
  ].map(point=>Object.freeze(point))),
});

/** Point-in-shoreline test shared by rendering tests and the live movement blocker. */
export function isCoastlineIslandPointInside(x, z, regionId = 'residential') {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const region = getCoastlineIslandRegion(regionId);
  if (!region) return false;
  // Every streamed island occupies the same world-space slot; movement bounds
  // follow each island's authored irregular shoreline instead of a rounded box.
  const nx = (x - 500) / region.bounds.halfWidth;
  const nz = (z - 500) / region.bounds.halfDepth;
  const points = regionId === 'residential' ? RESIDENTIAL_SHORELINE : NATURAL_ISLAND_SHORELINES[regionId];
  if (!points) return false;
  const epsilon = 1e-6;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    const cross = (nx - xi) * (zj - zi) - (nz - zi) * (xj - xi);
    const dot = (nx - xi) * (xj - xi) + (nz - zi) * (zj - zi);
    const lengthSquared = (xj - xi) ** 2 + (zj - zi) ** 2;
    if (Math.abs(cross) < epsilon && dot >= -epsilon && dot <= lengthSquared + epsilon) return true;
    if ((zi > nz) !== (zj > nz) && nx < ((xj - xi) * (nz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}


function coastlineBoundaryGap(region,x,z,center={x:500,z:500}) {
  const rx=x-center.x,rz=z-center.z,halfX=region.bounds.halfWidth,halfZ=region.bounds.halfDepth;
  // Rope-bridge deck width is 5.2 world units. Leave a 9-unit visual portal
  // (4.5 each side) so vehicles fit with a small margin without hiding whole
  // shoreline sections beside the bridge.
  const north=(region.bridge?.entry==='north'||region.bridge?.exit==='north')&&rz < -halfZ*.9&&Math.abs(rx)<4.5;
  const east=(region.bridge?.entry==='east'||region.bridge?.exit==='east')&&rx>halfX*.9&&Math.abs(rz)<4.5;
  const west=(region.bridge?.entry==='west'||region.bridge?.exit==='west')&&rx<-halfX*.9&&Math.abs(rz)<4.5;
  return north||east||west;
}
/** Visible short segments share the authored shoreline vertices used by movement collision. */
export function getCoastlineIslandBoundarySegments(regionId,maxSegmentLength=2.35) {
  const region=getCoastlineIslandRegion(regionId);
  if(!region||!Number.isFinite(maxSegmentLength)||maxSegmentLength<=0)return [];
  const halfX=region.bounds.halfWidth,halfZ=region.bounds.halfDepth;
  const points=region.id==='residential'?RESIDENTIAL_SHORELINE:NATURAL_ISLAND_SHORELINES[region.id];
  if(!Array.isArray(points)||points.length<3)return [];
  const center={x:500,z:500},result=[];
  for(let i=0;i<points.length;i++){
    const [ax,az]=points[i],[bx,bz]=points[(i+1)%points.length];
    const x1=center.x+ax*halfX,z1=center.z+az*halfZ,x2=center.x+bx*halfX,z2=center.z+bz*halfZ;
    const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/maxSegmentLength));
    for(let step=0;step<steps;step++){
      const t0=step/steps,t1=(step+1)/steps,sx=x1+dx*t0,sz=z1+dz*t0,ex=x1+dx*t1,ez=z1+dz*t1,mx=(sx+ex)/2,mz=(sz+ez)/2;
      if(coastlineBoundaryGap(region,mx,mz,center))continue;
      result.push({x1:sx,z1:sz,x2:ex,z2:ez,x:mx,z:mz,length:Math.hypot(ex-sx,ez-sz),rotationY:Math.atan2(-(ez-sz),ex-sx)});
    }
  }
  return result;
}

function createIslandShape(THREE, region, scale = 1) {
  const half = region.bounds.halfWidth;
  const points = region.id === 'residential' ? RESIDENTIAL_SHORELINE : NATURAL_ISLAND_SHORELINES[region.id];
  const shape = new THREE.Shape();
  if (!points?.length) throw new Error(`island ${region.id} has no authored shoreline`);
  const contour = points.map(([x, z]) => [x * half * scale, z * half * scale]);
  const last = contour[contour.length - 1], first = contour[0];
  shape.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < contour.length; i++) {
    const current = contour[i], next = contour[(i + 1) % contour.length];
    shape.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  shape.closePath();
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
  root.userData.coastlineGroundY = edgeY;
  root.userData.coastlineRegionId = region.id;
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
  if (region.id === 'waterfront') {
    const shallowMat = new THREE.MeshStandardMaterial({ color: 0x62c6c6, roughness: .34, metalness: .04, transparent: true, opacity: .68, side: THREE.DoubleSide });
    const shallowChannel = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), shallowMat);
    shallowChannel.name = 'coastline-waterfront-shallow-water-secret-path';
    shallowChannel.rotation.x = -Math.PI / 2;
    shallowChannel.position.set(620, edgeY - .16, 540); // raised tidal shelf: foot route, not a drivable vehicle surface
    shallowChannel.receiveShadow = false;
    root.add(shallowChannel);
    const depthBands = [
      { name: 'coastline-waterfront-water-depth-shallow', size: 270, width: 16, color: 0x4da9b8, opacity: .28 },
      { name: 'coastline-waterfront-water-depth-mid', size: 330, width: 18, color: 0x267e98, opacity: .23 },
      { name: 'coastline-waterfront-water-depth-deep', size: 390, width: 20, color: 0x104d75, opacity: .18 },
    ];
    for (const band of depthBands) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(band.size / 2 - band.width, band.size / 2, 96), new THREE.MeshBasicMaterial({ color: band.color, transparent: true, opacity: band.opacity, side: THREE.DoubleSide, depthWrite: false }));
      mesh.name = band.name; mesh.rotation.x = -Math.PI / 2; mesh.position.set(center.x, edgeY - COASTLINE_ISLAND_WATER_DROP + .02, center.z); root.add(mesh);
    }
  }
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
  // Reuse the City's road-edge language on every island: concrete sidewalks,
  // painted center dashes, street lamps and benches, all with instancing where practical.
  const sidewalkMat = material(0x858987, 0.94);
  const stripeMat = material(0xe7e1c9, 0.82);
  for (const side of [-1, 1]) addBox(`coastline-${region.id}-main-road-sidewalk-${side}`, center.x + side * 10.1, edgeY + 0.12, center.z - 82.5, 3.2, 0.2, 55, sidewalkMat, false, false);
  for (let dash = 0; dash < 6; dash++) addBox(`coastline-${region.id}-main-road-center-dash-${dash + 1}`, center.x, edgeY + 0.12, center.z - 104 + dash * 8.5, .16, .035, 4.0, stripeMat, false, false);
  const lampMetal = material(0x3b4545, 0.68, 0.28);
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xffe4ad, emissive: 0xffc56d, emissiveIntensity: 1.05, roughness: .35 });
  const streetLampCount = 6;
  const streetLamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .12, 4.4, 6), lampMetal, streetLampCount);
  const streetLampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(.55, .12, .24), lampGlow, streetLampCount);
  streetLamps.name = `coastline-${region.id}-street-lamp-posts`;
  streetLampHeads.name = `coastline-${region.id}-street-lamp-heads`;
  const streetDummy = new THREE.Object3D();
  for (let i = 0; i < streetLampCount; i++) {
    const side = i % 2 === 0 ? -1 : 1, z = center.z - 102 + Math.floor(i / 2) * 20;
    streetDummy.position.set(center.x + side * 12.4, edgeY + 2.2, z); streetDummy.rotation.set(0, 0, 0); streetDummy.scale.set(1, 1, 1); streetDummy.updateMatrix(); streetLamps.setMatrixAt(i, streetDummy.matrix);
    streetDummy.position.set(center.x + side * 12.4, edgeY + 4.42, z); streetDummy.updateMatrix(); streetLampHeads.setMatrixAt(i, streetDummy.matrix);
  }
  streetLamps.instanceMatrix.needsUpdate = true; streetLampHeads.instanceMatrix.needsUpdate = true;
  streetLamps.castShadow = false; streetLampHeads.castShadow = false; root.add(streetLamps, streetLampHeads);
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1, z = center.z - 73 + Math.floor(i / 2) * 18;
    addBox(`coastline-${region.id}-street-bench-seat-${i + 1}`, center.x + side * 13.1, edgeY + .62, z, 1.8, .14, .52, material(0x876348, .88), false, false);
    addBox(`coastline-${region.id}-street-bench-back-${i + 1}`, center.x + side * 13.1, edgeY + .96, z - .2, 1.8, .5, .12, material(0x876348, .88), false, false);
  }

  // Every island receives a visible natural shoreline rim. Bridge landing gaps
  // remain open; the movement boundary is still enforced by the shared shoreline predicate.
  const perimeterPoints = createIslandShape(THREE, region, 0.985).getPoints(16);
  const perimeterPlacements = perimeterPoints.filter(point => {
    const x = point.x, z = -point.y;
    if (region.id === 'residential' && z < -half * 0.9) return false; // City bridge landing
    if ((region.id === 'residential' || region.id === 'waterfront') && x > half * 0.9 && Math.abs(z) < 10) return false;
    if ((region.id === 'waterfront' || region.id === 'port') && x < -half * 0.9 && Math.abs(z) < 10) return false;
    if (region.id === 'waterfront' && x > half * 0.9 && Math.abs(z) < 10) return false;
    return true;
  });
  const shorelineRockMaterial = material(region.theme === 'working-harbor' ? 0x666c6a : 0x77766c, 0.98);
  const shorelineRockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const shorelineRocks = new THREE.InstancedMesh(shorelineRockGeometry, shorelineRockMaterial, perimeterPlacements.length);
  shorelineRocks.name = `coastline-${region.id}-landscape-boundary-rocks`;
  const shorelineDummy = new THREE.Object3D();
  perimeterPlacements.forEach((point, i) => {
    shorelineDummy.position.set(center.x + point.x, edgeY + 0.12 + (i % 3) * 0.035, center.z - point.y);
    shorelineDummy.scale.set(1.15 + (i % 4) * 0.24, 0.5 + (i % 3) * 0.13, 0.95 + (i % 2) * 0.22);
    shorelineDummy.rotation.set((i % 3) * 0.08, i * 0.73, (i % 4) * 0.06);
    shorelineDummy.updateMatrix(); shorelineRocks.setMatrixAt(i, shorelineDummy.matrix);
  });
  shorelineRocks.instanceMatrix.needsUpdate = true;
  shorelineRocks.castShadow = false; shorelineRocks.receiveShadow = true;
  root.add(shorelineRocks);

  // Decorative boulder samples leave gaps; fill with close-set instanced rocks
  // aligned to the same authored shoreline used by movement collision.
  const visibleBoundarySegments=getCoastlineIslandBoundarySegments(region.id,2.35);
  const visibleBoundary=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),material(region.theme==='working-harbor'?0x5d6662:0x696c61,.99),visibleBoundarySegments.length);
  visibleBoundary.name='coastline-'+region.id+'-visible-boundary-wall';
  const boundaryDummy=new THREE.Object3D();
  visibleBoundarySegments.forEach((segment,i)=>{
    const height=1.95+(i%4)*.28,depth=1.75+(i%3)*.18;
    boundaryDummy.position.set(segment.x,edgeY+height/2-.04,segment.z);
    boundaryDummy.scale.set((segment.length+.38)/2,height/2,depth/2);
    boundaryDummy.rotation.set((i%3-1)*.035,segment.rotationY,(i%2?1:-1)*.025);
    boundaryDummy.updateMatrix();visibleBoundary.setMatrixAt(i,boundaryDummy.matrix);
  });
  visibleBoundary.instanceMatrix.needsUpdate=true;visibleBoundary.castShadow=false;visibleBoundary.receiveShadow=true;
  root.add(visibleBoundary);

  // Sparse regions still need a live collision perimeter. Keep gaps centered on
  // the side-bridge landings so the route remains traversable between worlds.
  if (region.contentDensity === 'sparse') {
    const edge = region.bounds.halfWidth * 0.94;
    const wall = 2;
    const segmentLength = Math.max(24, edge - 14);
    for (const side of [-1, 1]) {
      for (const offset of [-1, 1]) {
        colliders.push({
          name: `coastline-${region.id}-${side < 0 ? 'west' : 'east'}-shore-boundary-${offset < 0 ? 'south' : 'north'}`,
          x: center.x + side * edge,
          z: center.z + offset * (segmentLength / 2 + 7),
          w: wall,
          d: segmentLength,
        });
      }
    }
    // Waterfront links east and west; Port links west only. The north/south
    // shoreline is closed for these current sparse layouts.
    for (const side of [-1, 1]) {
      for (const offset of [-1, 1]) {
        colliders.push({
          name: `coastline-${region.id}-${side < 0 ? 'south' : 'north'}-shore-boundary-${offset < 0 ? 'west' : 'east'}`,
          x: center.x + offset * (segmentLength / 2 + 7),
          z: center.z + side * edge,
          w: segmentLength,
          d: wall,
        });
      }
    }
  }

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
    // Patchy American beachgrass, bayberry-style shrubs and driftwood on the backshore.
    const duneGrassMat = material(0x6c8d48, 0.98), duneGrassTipMat = material(0x9caa61, 0.98);
    const duneGrass = new THREE.InstancedMesh(new THREE.ConeGeometry(.075, 1.35, 3), duneGrassMat, 108);
    duneGrass.name = 'coastline-residential-backshore-beachgrass';
    const duneTip = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .38, 3), duneGrassTipMat, 108);
    duneTip.name = 'coastline-residential-backshore-beachgrass-tips';
    const grassDummy = new THREE.Object3D();
    const patchCenters = [[-78,77],[-60,86],[-42,78],[-24,91],[-4,82],[17,90],[38,78],[58,87],[77,76]];
    patchCenters.forEach(([px,pz],patch) => {
      for (let blade = 0; blade < 12; blade++) {
        const x = center.x + px + Math.sin(blade * 2.1 + patch) * 2.4;
        const z = center.z + pz + Math.cos(blade * 1.7 + patch) * 2.0;
        const height = .72 + ((blade + patch) % 5) * .14;
        grassDummy.position.set(x, edgeY + height * .48, z);
        grassDummy.rotation.set(.08 * Math.sin(blade), (blade * 2.4 + patch) % (Math.PI * 2), .12 * Math.cos(blade * 1.3));
        grassDummy.scale.set(.72 + (blade % 3) * .16, height / 1.35, .72 + ((blade + 1) % 3) * .13);
        grassDummy.updateMatrix(); duneGrass.setMatrixAt(patch * 12 + blade, grassDummy.matrix);
        grassDummy.position.y += height * .48; grassDummy.scale.set(.8,.65,.8);
        grassDummy.updateMatrix(); duneTip.setMatrixAt(patch * 12 + blade, grassDummy.matrix);
      }
    });
    duneGrass.instanceMatrix.needsUpdate = true; duneTip.instanceMatrix.needsUpdate = true;
    duneGrass.castShadow = false; duneTip.castShadow = false; root.add(duneGrass, duneTip);
    const backshoreShrubs = new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5), material(0x557044,.98), 12);
    backshoreShrubs.name = 'coastline-residential-backshore-bayberry';
    for (let i = 0; i < 12; i++) {
      const [px,pz] = patchCenters[(i * 5) % patchCenters.length];
      grassDummy.position.set(center.x + px + (i % 2 ? 3.2 : -3.2), edgeY + .52, center.z + pz + (i % 3) * 1.5);
      grassDummy.scale.set(1.1 + (i % 3) * .25,.65 + (i % 2) * .18,.9 + (i % 4) * .12);
      grassDummy.rotation.set(0,i * .73,0); grassDummy.updateMatrix(); backshoreShrubs.setMatrixAt(i,grassDummy.matrix);
    }
    backshoreShrubs.instanceMatrix.needsUpdate = true; backshoreShrubs.castShadow = false; root.add(backshoreShrubs);
    const driftwoodMat = material(0x74543b,.96);
    for (const [id,px,pz,angle] of [[1,-68,70,.45],[2,52,72,-.65],[3,4,96,.22]]) {
      const driftwood = new THREE.Mesh(new THREE.CylinderGeometry(.13,.2,3.8,6),driftwoodMat);
      driftwood.name = 'coastline-residential-backshore-driftwood-' + id;
      driftwood.position.set(center.x + px,edgeY + .18,center.z + pz);
      driftwood.rotation.set(.08,angle,Math.PI/2); driftwood.castShadow = true; root.add(driftwood);
    }
    // Individual driveway lanterns can fall on impact and reset after leaving the area.
    const drivewayLights = [];
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

    // Keep the small path-light design only, but give every lamp its own transform so it can be tipped and reset.
    const lampPostMat = material(0x393c3a, 0.72, 0.18);
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffdf9b, emissive: 0xffbd63, emissiveIntensity: 1.35, roughness: 0.4 });
    const lampBaseMat = material(0x343c3d, 0.7, 0.18);
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        const index = i * 2 + (side === 1 ? 1 : 0);
        const x = center.x - 17 + side * 5.5;
        const z = center.z - 17 - i * 7.5;
        const group = new THREE.Group();
        group.name = `coastline-villa-path-light-${index + 1}`;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.17, .2, .12, 8), lampBaseMat);
        base.position.y = .06; group.add(base);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(.075, .11, 1.3, 6), lampPostMat);
        post.position.y = .72; group.add(post);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.19, 6, 5), lampGlowMat);
        bulb.position.set(0, 1.43, 0); group.add(bulb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(.18, .2, .08, 6), lampBaseMat);
        cap.position.y = 1.61; group.add(cap);
        const practical = new THREE.PointLight(0xffd28a, .28, 5.5, 2);
        practical.position.set(0, 1.35, 0); group.add(practical);
        group.position.set(x, edgeY, z);
        group.traverse(node => { if (node.isMesh) { node.castShadow = false; node.receiveShadow = true; } });
        root.add(group);
        drivewayLights.push({
          group, x, z, baseY: edgeY, fallen: false,
          fall() { if (this.fallen) return; this.fallen = true; this.group.rotation.z = side < 0 ? -Math.PI / 2 : Math.PI / 2; },
          reset() { this.fallen = false; this.group.rotation.set(0, 0, 0); this.group.position.y = this.baseY; },
        });
      }
    }
    root.userData.coastlineHomeyDrivewayLights = drivewayLights;
    // Additional Homey polish: layered ground-cover beds, shrubs and stepping stones.
    // All pieces are static, non-collidable and grouped into a small number of meshes.
    const groundCoverMat = material(0x3e6b3f, .99);
    const gardenSoilMat = material(0x69543d, .99);
    const steppingStoneMat = material(0xb4b0a2, .95);
    const homeyGroundcover = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), groundCoverMat, 28);
    homeyGroundcover.name = 'coastline-residential-garden-groundcover';
    const homeyShrubs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), bushMat, 16);
    homeyShrubs.name = 'coastline-residential-neighborhood-shrubs';
    const homeyDummy = new THREE.Object3D();
    for (let i = 0; i < 28; i++) {
      const side = i % 2 ? 1 : -1;
      const x = center.x + 28 + side * (8 + (i % 4) * 1.5);
      const z = center.z - 48 + Math.floor(i / 2) * 3.2;
      homeyDummy.position.set(x, edgeY + .11, z);
      homeyDummy.scale.set(1.4 + (i % 3) * .3, .16 + (i % 2) * .06, .85 + (i % 4) * .12);
      homeyDummy.rotation.set(0, (i % 7) * .42, 0); homeyDummy.updateMatrix();
      homeyGroundcover.setMatrixAt(i, homeyDummy.matrix);
    }
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      homeyDummy.position.set(center.x + 30 + side * (10 + (i % 3) * 2.5), edgeY + .52, center.z - 42 + Math.floor(i / 2) * 5.2);
      homeyDummy.scale.set(.95 + (i % 3) * .2, .72 + (i % 2) * .2, .85 + (i % 4) * .12);
      homeyDummy.rotation.set(0, i * .57, 0); homeyDummy.updateMatrix();
      homeyShrubs.setMatrixAt(i, homeyDummy.matrix);
    }
    homeyGroundcover.instanceMatrix.needsUpdate = true; homeyShrubs.instanceMatrix.needsUpdate = true;
    homeyGroundcover.castShadow = false; homeyShrubs.castShadow = false;
    root.add(homeyGroundcover, homeyShrubs);
    addBox('coastline-residential-garden-soil-bed', center.x + 30, edgeY + .045, center.z - 43, 28, .07, 42, gardenSoilMat, false, false);
    for (let i = 0; i < 7; i++) {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(1.25, .12, 1.05), steppingStoneMat);
      stone.name = `coastline-residential-garden-stepping-stone-${i + 1}`;
      stone.position.set(center.x + 5 + (i % 2) * .18, edgeY + .09, center.z - 20 - i * 2.6);
      stone.rotation.y = (i % 3 - 1) * .08; stone.receiveShadow = true; root.add(stone);
    }
    // The garden is deliberately modest so the mobile scene remains inexpensive.
    addBox('coastline-residential-park', center.x + 42, edgeY + 0.03, center.z - 51, 24, 0.08, 18, lawn, false, false);
    // Marked turnout lets on-foot arrivals find and re-enter a vehicle.
    addBox('coastline-residential-homey-parking-approach',center.x,edgeY+.025,center.z-72,12,.08,22,roadMat,false,false);
    addBox('coastline-residential-homey-parking-apron',center.x,edgeY+.045,center.z-60,42,.10,11,roadMat,false,false);
    const parkingLineMat=material(0xe4dfca,.85);
    for(const x of [center.x-21,center.x-7,center.x+7,center.x+21])addBox('coastline-residential-homey-parking-bay-line',x,edgeY+.103,center.z-60,.11,.025,8.4,parkingLineMat,false,false);
  } else if (region.theme === 'resort-marina') {
    const boardwalk = material(0x92765a, 0.92);
    const water = material(0x438c9a, 0.36, 0.08);
    // The old boardwalk passed beneath the cave approach; move it beside the marina docks.
    addBox('coastline-waterfront-boardwalk',center.x+5,edgeY+.04,center.z+64,120,.2,10,boardwalk);
    addBox('coastline-waterfront-marina-water', center.x + 42, edgeY - 0.02, center.z + 65, 48, 0.08, 30, water, false, false);
    for (let i = 0; i < 4; i++) addBox(`coastline-waterfront-dock-${i + 1}`, center.x + 20 + i * 12, edgeY + 0.1, center.z + 65, 2.4, 0.25, 32, boardwalk);
    // The former large resort was removed to preserve a natural mountain/cave island.
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

  if (region.contentDensity === 'developed') {
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
      // Sparse regions still need physical collision metadata for their bridge
      // guardrails; their low scenery density must not mean an empty collider set.
      colliders.push(
        { name: `${region.id}-west-bridge-north-rail`, x: center.x - half - 50, z: center.z + 2.48, w: 100, d: 0.2 },
        { name: `${region.id}-west-bridge-south-rail`, x: center.x - half - 50, z: center.z - 2.48, w: 100, d: 0.2 }
      );
    }
    if (region.id === 'residential' || region.id === 'waterfront') {
      addSideBridge(THREE, root, { edgeX: center.x + half, z: center.z, y: edgeY, length: 100, direction: 1, name: `${region.id}-east` });
      if (region.id === 'waterfront') colliders.push(
        { name: `${region.id}-east-bridge-north-rail`, x: center.x + half + 50, z: center.z + 2.48, w: 100, d: 0.2 },
        { name: `${region.id}-east-bridge-south-rail`, x: center.x + half + 50, z: center.z - 2.48, w: 100, d: 0.2 }
      );
    }
  }
  if (region.id === 'waterfront') {
    // Electric Lemonade stand and cave sit on the already-connected Waterfront Island.
    // The cave mouth stays open; side colliders protect the rock face without sealing the entrance.
    const standX = center.x + 20, standZ = center.z + 30;
    const caveX = center.x + 48, caveZ = center.z + 38;
    const standWood = material(0x76503a, .92), canopyMat = material(0x247c84, .76);
    const signMat = material(0x163a3d, .65);
    const stand = new THREE.Group(); stand.name = 'coastline-electric-lemonade-stand';
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 1.65), standWood);
    counter.name = 'coastline-waterfront-lemonade-counter';
    counter.position.set(standX, edgeY + .72, standZ); counter.castShadow = true; counter.receiveShadow = true; stand.add(counter);
    // Narrow plank seams add a visible handmade timber finish without extra simulation.
    const plankSeamMat = material(0x493326, .98);
    for (let i = 0; i < 5; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(.035, 1.02, 1.67), plankSeamMat);
      seam.position.set(standX - 1.9 + i * .95, edgeY + .72, standZ); seam.castShadow = false; stand.add(seam);
    }
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.05, .16, 1.85), material(0xe1c99a, .65));
    counterTop.position.set(standX, edgeY + 1.36, standZ); stand.add(counterTop);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.5, .22, 2.4), canopyMat);
    canopy.position.set(standX, edgeY + 3.15, standZ - .05); canopy.castShadow = true; stand.add(canopy);
    for (const dx of [-2.35, 2.35]) for (const dz of [-.9, .9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 3.05, 8), standWood);
      post.position.set(standX + dx, edgeY + 1.62, standZ + dz); stand.add(post);
    }
    const signCanvas = document.createElement('canvas'); signCanvas.width = 768; signCanvas.height = 192;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#12373b'; ctx.fillRect(0, 0, signCanvas.width, signCanvas.height);
    ctx.strokeStyle = '#f4d889'; ctx.lineWidth = 12; ctx.strokeRect(8, 8, signCanvas.width - 16, signCanvas.height - 16);
    ctx.fillStyle = '#fff0b8'; ctx.font = '900 58px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ELECTRIC LEMONADE', signCanvas.width / 2, signCanvas.height / 2);
    const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace;
    // A small freestanding price sign is easier to read than a banner across the stand.
    const priceSign = new THREE.Group(); priceSign.name = 'coastline-waterfront-lemonade-price-sign';
    const priceBoard = new THREE.Mesh(new THREE.BoxGeometry(1.15, .8, .12), material(0x153c30, .78));
    priceBoard.position.set(standX + 3.5, edgeY + 1.15, standZ + .65); priceSign.add(priceBoard);
    const pricePost = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 1.5, 6), standWood);
    pricePost.position.set(standX + 3.5, edgeY + .55, standZ + .65); priceSign.add(pricePost);
    const priceCanvas = document.createElement('canvas'); priceCanvas.width = 256; priceCanvas.height = 192;
    const priceCtx = priceCanvas.getContext('2d'); priceCtx.fillStyle = '#153c30'; priceCtx.fillRect(0,0,256,192);
    priceCtx.strokeStyle = '#d8f99a'; priceCtx.lineWidth = 8; priceCtx.strokeRect(5,5,246,182);
    priceCtx.fillStyle = '#d8ff6c'; priceCtx.textAlign = 'center'; priceCtx.font = '900 48px system-ui'; priceCtx.fillText('10 CB',128,112);
    const priceTexture = new THREE.CanvasTexture(priceCanvas); priceTexture.colorSpace = THREE.SRGBColorSpace;
    const priceFace = new THREE.Mesh(new THREE.PlaneGeometry(1.03,.68), new THREE.MeshBasicMaterial({map:priceTexture,transparent:false}));
    priceFace.position.set(standX + 3.5, edgeY + 1.15, standZ + .585); priceFace.rotation.y = Math.PI; priceSign.add(priceFace);
    stand.add(priceSign);
    const lemonadeGlow = new THREE.MeshStandardMaterial({ color: 0xd9ff45, emissive: 0x9dff00, emissiveIntensity: 2.6, roughness: .22 });
    const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,.62,10), new THREE.MeshStandardMaterial({color:0xb6dce0,roughness:.22,metalness:.05,transparent:true,opacity:.7}));
    pitcher.name = 'coastline-waterfront-lemonade-pitcher'; pitcher.position.set(standX - 1.2, edgeY + 1.78, standZ + .05); stand.add(pitcher);
    const pitcherLiquid = new THREE.Mesh(new THREE.CylinderGeometry(.205,.25,.42,10), lemonadeGlow);
    pitcherLiquid.position.set(standX - 1.2, edgeY + 1.76, standZ + .05); stand.add(pitcherLiquid);
    for (let i = 0; i < 3; i++) {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(.12,.095,.28,8), new THREE.MeshStandardMaterial({color:0xc8e6e8,roughness:.2,transparent:true,opacity:.62}));
      glass.name = `coastline-waterfront-lemonade-glass-${i + 1}`;
      glass.position.set(standX - .45 + i * .48, edgeY + 1.59, standZ + .35); stand.add(glass);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(.09,.075,.16,8), lemonadeGlow);
      liquid.position.set(standX - .45 + i * .48, edgeY + 1.62, standZ + .35); stand.add(liquid);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: signTexture, roughness: .75, emissive: 0x132c20, emissiveIntensity: .3 }));
    sign.name = 'coastline-electric-lemonade-sign'; sign.position.set(standX, edgeY + 2.55, standZ + 1.02); sign.rotation.y = Math.PI; stand.add(sign);
    // Keep a recognizable temporary attendant; runtime can replace this group with the approved GLB when its loader is ready.
    const vendor = new THREE.Group(); vendor.name = 'coastline-electric-lemonade-vendor';
    const skin = material(0xb98260, .92), shirt = material(0xd8e7dc, .9), trousers = material(0x344a5b, .9);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .7, 3, 7), shirt); torso.position.set(standX, edgeY + 1.55, standZ - 1.2); vendor.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 10, 8), skin); head.position.set(standX, edgeY + 2.25, standZ - 1.2); vendor.add(head);
    for (const dx of [-.17, .17]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .68, 7), trousers); leg.position.set(standX + dx, edgeY + .68, standZ - 1.2); vendor.add(leg); }
    for (const dx of [-.42, .42]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .62, 7), shirt); arm.position.set(standX + dx, edgeY + 1.62, standZ - 1.12); arm.rotation.z = dx < 0 ? -.28 : .28; vendor.add(arm); }
    stand.add(vendor); root.add(stand);
    colliders.push({ name: 'coastline-electric-lemonade-counter', x: standX, z: standZ, w: 4.7, d: 1.5 });
    // A low, broad mountain silhouette surrounds the cave; the cave mouth remains an open corridor.
    const mountain = new THREE.Group(); mountain.name = 'coastline-waterfront-cave-mountain';
    const mountainMat = material(0x4d5147, .99), mountainLight = material(0x696b5d, .99);
    const mountainChunks = [
      [-15,3.0,-7.0,13,7,11],[-10,6.0,-9.0,16,12,15],[-2,8.2,-12.0,19,15,17],
      [8,6.0,-10.0,16,12,15],[15,3.5,-7.0,12,7.2,11],[-8,4.5,-15.0,14,9,13],[7,5.0,-16.0,15,10,14]
    ];
    mountainChunks.forEach(([dx,y,dz,sx,sy,sz],i)=>{
      const chunk=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),i%3?mountainMat:mountainLight);
      chunk.name='coastline-waterfront-cave-mountain-ridge-'+(i+1);
      chunk.position.set(caveX+dx,edgeY+y,caveZ+dz);chunk.scale.set(sx/2,sy/2,sz/2);
      chunk.rotation.set(i*.17,i*.39,i*.09);chunk.castShadow=true;chunk.receiveShadow=true;mountain.add(chunk);
    });
    const mountainPeakSpecs=[{dx:-9,y:7.2,dz:-12,radius:9.5,height:15.5},{dx:0,y:9,dz:-15,radius:11.5,height:19},{dx:9,y:7,dz:-12,radius:8.8,height:14.5}];
    mountainPeakSpecs.forEach((peak,i)=>{
      const mesh=new THREE.Mesh(new THREE.ConeGeometry(peak.radius,peak.height,7,2),i===1?mountainMat:mountainLight);
      mesh.name='coastline-waterfront-cave-mountain-peak-'+(i+1);
      mesh.position.set(caveX+peak.dx,edgeY+peak.y,caveZ+peak.dz);
      mesh.rotation.z=(i-1)*.08;mesh.castShadow=true;mesh.receiveShadow=true;mountain.add(mesh);
    });
    root.add(mountain);
    // An irregular stone path blends into the landscape. The old flat rectangular
    // plane looked like the bottom of a missing building, so vary the edges to
    // follow a natural footpath that widens toward shore and narrows at the cave.
    const caveApproachShape = new THREE.Shape();
    caveApproachShape.moveTo(-3.9, -5.8);
    caveApproachShape.quadraticCurveTo(-5.6, -4.2, -4.8, -2.3);
    caveApproachShape.quadraticCurveTo(-5.1, -.8, -4.2, .9);
    caveApproachShape.quadraticCurveTo(-3.6, 2.6, -4.6, 4.3);
    caveApproachShape.lineTo(-3.2, 5.7);
    caveApproachShape.quadraticCurveTo(-1.1, 6.2, .5, 5.6);
    caveApproachShape.quadraticCurveTo(2.2, 6.0, 4.1, 4.7);
    caveApproachShape.lineTo(3.5, 3.0);
    caveApproachShape.quadraticCurveTo(4.6, 1.0, 4.1, -.9);
    caveApproachShape.quadraticCurveTo(5.2, -2.8, 4.1, -4.3);
    caveApproachShape.lineTo(3.2, -5.9);
    caveApproachShape.quadraticCurveTo(.7, -6.4, -1.4, -5.7);
    caveApproachShape.closePath();
    const caveApproach = new THREE.Mesh(
      new THREE.ShapeGeometry(caveApproachShape, 2),
      material(0x817b69, .98)
    );
    caveApproach.name = 'coastline-waterfront-cave-approach-path';
    caveApproach.rotation.x = -Math.PI / 2;
    caveApproach.position.set(caveX, edgeY + .025, caveZ + 8.5);
    caveApproach.receiveShadow = true;
    root.add(caveApproach);
    // Smaller loose stones and hardy coastal plants frame the route, never the doorway.
    const caveRubble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0), material(0x77766a,.99), 22);
    caveRubble.name = 'coastline-waterfront-cave-rubble';
    const cavePlants = new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4), material(0x496b43,.99), 14);
    cavePlants.name = 'coastline-waterfront-cave-coastal-plants';
    const caveDummy = new THREE.Object3D();
    for(let i=0;i<22;i++){
      const side=i%2?-1:1, x=caveX+side*(7.2+(i%4)*1.25), z=caveZ+2+(Math.floor(i/2)%5)*2.6;
      caveDummy.position.set(x,edgeY+.22+(i%3)*.06,z); caveDummy.scale.set(.45+(i%3)*.18,.32+(i%2)*.14,.38+(i%4)*.1);
      caveDummy.rotation.set(i*.1,i*.37,i*.08); caveDummy.updateMatrix(); caveRubble.setMatrixAt(i,caveDummy.matrix);
    }
    for(let i=0;i<14;i++){
      const side=i%2?-1:1;
      caveDummy.position.set(caveX+side*(10+(i%3)*1.8),edgeY+.42,caveZ-1+Math.floor(i/2)*3.4);
      caveDummy.scale.set(.85+(i%3)*.25,.5+(i%2)*.16,.72+(i%4)*.12);
      caveDummy.rotation.set(0,i*.61,0); caveDummy.updateMatrix(); cavePlants.setMatrixAt(i,caveDummy.matrix);
    }
    caveRubble.instanceMatrix.needsUpdate=true; cavePlants.instanceMatrix.needsUpdate=true;
    caveRubble.castShadow=false; cavePlants.castShadow=false; root.add(caveRubble,cavePlants);
    // Rough boulder shoulders form a cave opening with enough clear width to walk through.
    const cave = new THREE.Group(); cave.name = 'coastline-electric-lemonade-cave-mouth';
    const rockMat = material(0x292c2b, .99), rockLight = material(0x41413a, .99), caveBlack = new THREE.MeshBasicMaterial({ color: 0x010203 });
    const boulders = [
      [-7, 1.4, -1.4, 5.6, 4.2, 4.2], [-5.5, 4.4, -1.8, 4.7, 3.5, 4.0],
      [7, 1.4, -1.4, 5.6, 4.2, 4.2], [5.5, 4.4, -1.8, 4.7, 3.5, 4.0],
      [0, 6.3, -1.6, 9.4, 3.2, 4.5], [-9.2, 3.0, -3.2, 3.4, 5.6, 4.2],
      [9.2, 3.0, -3.2, 3.4, 5.6, 4.2]
    ];
    for (let i = 0; i < boulders.length; i++) {
      const [dx, y, dz, sx, sy, sz] = boulders[i];
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), i % 3 ? rockMat : rockLight);
      rock.position.set(caveX + dx, edgeY + y, caveZ + dz); rock.scale.set(sx / 2, sy / 2, sz / 2); rock.rotation.set(i * .11, i * .37, i * .08); rock.castShadow = true; rock.receiveShadow = true; cave.add(rock);
    }
    const darkness = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 5.8), caveBlack);
    darkness.name = 'coastline-electric-lemonade-cave-dark-opening'; darkness.position.set(caveX, edgeY + 2.7, caveZ + 1.1); cave.add(darkness);
    root.add(cave);
    // The same explicit cave collider contract is used by foot and vehicle collision.
    // Only the doorway corridor remains traversable; mountain sides and rear are solid.
    colliders.push(...getCoastlineCaveColliders(caveX, caveZ));
    root.userData.coastlineElectricLemonade = {
      stand: { x: standX, z: standZ + 2.4, radius: 3.2 },
      cave: { x: caveX, z: caveZ + 2.5, radius: 3.0 },
    };
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
