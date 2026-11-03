/**
 * Geometry-first three-cave interior system.
 *
 * The wall layout is the source of truth: every visible solid wall segment
 * is registered with the same footprint in coastlineColliders. Empty space
 * between those segments is intentionally playable.
 */

const FLOOR_Y = () => Number.isFinite(window.__coastlineElectricDungeonFloorY)
  ? window.__coastlineElectricDungeonFloorY
  : 0;

const CAVE_CENTERS = Object.freeze({ left: 510, right: 530 });
const CAVE_START_Z = 546;
const CAVE_END_Z = 660;

function removeOldInteriorGeometry(root, group, colliders) {
  if (!group) return;
  while (group.children.length) group.remove(group.children[group.children.length - 1]);

  if (!Array.isArray(colliders)) return;
  for (let i = colliders.length - 1; i >= 0; i--) {
    const name = String(colliders[i]?.name || '');
    if (
      name.startsWith('electric-dungeon-left-cavern-') ||
      name.startsWith('electric-dungeon-right-cavern-') ||
      name.startsWith('coastline-three-cave-left-labyrinth') ||
      name.startsWith('coastline-three-cave-right-labyrinth') ||
      name.startsWith('coastline-three-cave-left-open-rib') ||
      name.startsWith('coastline-three-cave-right-open-rib')
    ) colliders.splice(i, 1);
  }
  window.__coastlineActiveWorldColliders = colliders;
}

function addIrregularWall(THREE, parent, segment, material, caveId, index) {
  const { x, z, w, d, height = 6.0, seed = 0 } = segment;
  const geometry = new THREE.BoxGeometry(
    w,
    height,
    d,
    Math.max(1, Math.ceil(w / 2)),
    5,
    Math.max(1, Math.ceil(d / 2)),
  );
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y > 0) {
      const localX = position.getX(i);
      const localZ = position.getZ(i);
      const wave = Math.sin(seed * 1.73 + localX * 0.63 + localZ * 0.91);
      position.setY(i, y + wave * 0.55);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const wall = new THREE.Mesh(geometry, material);
  wall.name = `coastline-three-cave-${caveId}-geology-wall-${index}`;
  wall.position.set(x, FLOOR_Y() + height / 2, z);
  wall.castShadow = wall.receiveShadow = true;
  parent.add(wall);

  // Discontinuous strata shelves follow the same wall footprint and never
  // protrude beyond it, so they remain visually and physically coincident.
  const strataMat = new THREE.MeshStandardMaterial({
    color: 0x66645b,
    roughness: 1,
    flatShading: true,
  });
  const horizontal = w >= d;
  const side = horizontal ? Math.sign(seed % 2 ? 1 : -1) : Math.sign(seed % 2 ? 1 : -1);
  for (let band = 0; band < 3; band++) {
    const bandHeight = 0.16;
    const bandWidth = horizontal ? Math.max(1.2, w * (0.48 + ((seed + band) % 3) * 0.12)) : bandHeight;
    const bandDepth = horizontal ? bandHeight : Math.max(1.2, d * (0.48 + ((seed + band) % 3) * 0.12));
    const bandGeo = new THREE.BoxGeometry(bandWidth, bandHeight, bandDepth);
    const bandMesh = new THREE.Mesh(bandGeo, strataMat);
    bandMesh.name = `cave-${caveId}-strata-${index}-${band}`;
    const y = FLOOR_Y() + 1.25 + band * 1.45 + ((seed + band) % 2) * 0.18;
    bandMesh.position.set(x, y, z);
    bandMesh.scale.set(
      horizontal ? 1 : 0.82,
      1,
      horizontal ? 0.82 : 1,
    );
    bandMesh.rotation.y = horizontal ? 0 : Math.PI / 2;
    bandMesh.position.x += horizontal ? ((seed + band) % 3 - 1) * Math.max(0.2, w * 0.08) : side * (w * 0.18);
    bandMesh.position.z += horizontal ? side * (d * 0.18) : ((seed + band) % 3 - 1) * Math.max(0.2, d * 0.08);
    bandMesh.castShadow = bandMesh.receiveShadow = true;
    parent.add(bandMesh);
  }
}

function addWallSegment(THREE, parent, colliders, caveId, segment, index, material) {
  addIrregularWall(THREE, parent, segment, material, caveId, index);
  colliders.push({
    name: `coastline-three-cave-${caveId}-geometry-wall-${index}-collision`,
    x: segment.x,
    z: segment.z,
    w: segment.w,
    d: segment.d,
  });
}

function buildCaveLayout(caveId, cx) {
  const left = cx - 7;
  const right = cx + 7;
  const segments = [];
  const push = (x, z, w, d, height = 6, seed = segments.length + 1) =>
    segments.push({ x, z, w, d, height, seed });

  // Continuous outer stone envelope: the passage network can never leak
  // through the sides or rear, and the entrance remains open at z=546.
  push(left, (CAVE_START_Z + CAVE_END_Z) / 2, 1.25, CAVE_END_Z - CAVE_START_Z, 6.6, 11);
  push(right, (CAVE_START_Z + CAVE_END_Z) / 2, 1.25, CAVE_END_Z - CAVE_START_Z, 6.2, 17);
  push(cx, CAVE_END_Z, 14, 1.35, 6.4, 23);

  // Alternating transverse shelves create a long serpentine main tunnel.
  const turns = [558, 572, 586, 600, 614, 628, 642];
  turns.forEach((z, i) => {
    const gapOnRight = i % 2 === 0;
    const gapStart = gapOnRight ? cx + 2.6 : left + 1.0;
    const gapEnd = gapOnRight ? right - 1.0 : cx - 2.6;
    const spanStart = gapOnRight ? left + 0.5 : gapEnd + 0.0;
    const spanEnd = gapOnRight ? gapStart : right - 0.5;
    push((spanStart + spanEnd) / 2, z, Math.max(1.2, spanEnd - spanStart), 1.15, 5.8 + (i % 3) * 0.35, 31 + i);
  });

  // Side chambers branch from alternating bends. Their wall pairs and cap
  // are part of the same layout, so the player can explore them but cannot
  // cross their stone.
  const branchSpecs = [
    { side: -1, entryZ: 579, endZ: 596, width: 3.4 },
    { side: 1, entryZ: 607, endZ: 624, width: 3.8 },
    { side: -1, entryZ: 635, endZ: 652, width: 4.1 },
  ];
  branchSpecs.forEach((branch, i) => {
    const outerX = branch.side < 0 ? left + 0.8 : right - 0.8;
    const innerX = branch.side < 0 ? cx - branch.width : cx + branch.width;
    const midX = (outerX + innerX) / 2;
    const wallX = branch.side < 0 ? innerX : innerX;
    push(innerX, (branch.entryZ + branch.endZ) / 2, 1.0, branch.endZ - branch.entryZ, 5.5 + i * 0.25, 50 + i);
    push(outerX, (branch.entryZ + branch.endZ) / 2, 1.0, branch.endZ - branch.entryZ, 5.9, 56 + i);
    push(midX, branch.endZ, branch.width * 2, 1.0, 5.6, 62 + i);
  });

  // A pair of larger alcove walls near the far end creates a chamber-like
  // expansion without blocking the main route.
  push(cx - 4.7, 648, 1.0, 11.5, 6.1, 71);
  push(cx + 4.7, 648, 1.0, 11.5, 6.5, 79);

  return segments;
}

function buildCeiling(THREE, parent, caveId, cx) {
  const material = new THREE.MeshStandardMaterial({ color: 0x42433d, roughness: 1, flatShading: true });
  const geometry = new THREE.BoxGeometry(7, 0.9, 13);
  for (let i = 0; i < 9; i++) {
    const slab = new THREE.Mesh(geometry, material);
    slab.name = `coastline-three-cave-${caveId}-broken-ceiling-${i + 1}`;
    slab.position.set(cx + Math.sin(i * 1.9) * 2.5, FLOOR_Y() + 6.7 + (i % 3) * 0.45, 551 + i * 12.0);
    slab.rotation.y = (i % 2 ? 1 : -1) * 0.08;
    slab.rotation.z = Math.sin(i * 0.8) * 0.06;
    slab.scale.set(0.72 + (i % 3) * 0.16, 0.75 + (i % 2) * 0.2, 0.75 + (i % 4) * 0.08);
    slab.castShadow = slab.receiveShadow = true;
    parent.add(slab);
  }
}

function buildFormations(THREE, parent, caveId, cx) {
  const material = new THREE.MeshStandardMaterial({ color: 0x57564e, roughness: 1, flatShading: true });
  const geo = new THREE.ConeGeometry(0.48, 1.9, 7);
  for (let i = 0; i < 20; i++) {
    const side = i % 2 ? 1 : -1;
    const formation = new THREE.Mesh(geo, material);
    formation.name = `coastline-three-cave-${caveId}-formation-${i + 1}`;
    formation.position.set(
      cx + side * (5.2 + (i % 3) * 0.35),
      FLOOR_Y() + (i % 4 === 0 ? 5.8 : 0.95),
      551 + (i % 10) * 10.2,
    );
    formation.scale.set(0.8 + (i % 3) * 0.16, i % 4 === 0 ? 1.0 : 0.7, 0.8 + (i % 2) * 0.14);
    formation.rotation.x = i % 4 === 0 ? Math.PI : 0;
    formation.castShadow = formation.receiveShadow = true;
    parent.add(formation);
  }
}

function buildGeometryFirstLabyrinth(root, THREE) {
  const group = root?.getObjectByName?.('coastline-three-cave-interiors');
  const colliders = root?.userData?.coastlineColliders || (root.userData.coastlineColliders = []);
  if (!group || !THREE || group.userData?.geometryFirstLabyrinthBuilt) return;

  removeOldInteriorGeometry(root, group, colliders);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x242520, roughness: 1 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x505049, roughness: 1, flatShading: true });

  for (const caveId of ['left', 'right']) {
    const cx = CAVE_CENTERS[caveId];
    const cave = new THREE.Group();
    cave.name = `coastline-three-cave-${caveId}-geometry-first-labyrinth`;
    group.add(cave);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, CAVE_END_Z - CAVE_START_Z), floorMaterial);
    floor.name = `coastline-three-cave-${caveId}-playable-floor`;
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, FLOOR_Y(), (CAVE_START_Z + CAVE_END_Z) / 2);
    floor.receiveShadow = true;
    cave.add(floor);

    const segments = buildCaveLayout(caveId, cx);
    segments.forEach((segment, index) => addWallSegment(THREE, cave, colliders, caveId, segment, index + 1, wallMaterial));
    buildCeiling(THREE, cave, caveId, cx);
    buildFormations(THREE, cave, caveId, cx);
  }

  group.userData.geometryFirstLabyrinthBuilt = true;
  group.userData.geometryFirstWallCount = colliders.filter(c => /geometry-wall-\d+-collision$/.test(String(c?.name || ''))).length;
  group.userData.geometryFirstRule = 'visible wall footprint equals collision footprint; empty passage remains playable';
  window.__coastlineActiveWorldColliders = colliders;
}

function ensureRocketBootsReachable(root, THREE) {
  if (!root?.traverse || !THREE) return;
  if (root.getObjectByName('coastline-rocket-boots-visible-pickup')) return;
  const boots = new THREE.Group();
  boots.name = 'coastline-rocket-boots-visible-pickup';
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .45, metalness: .35 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x55ddff, emissive: 0x55ddff, emissiveIntensity: 2.5, roughness: .35 });
  for (const side of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.8, .55, 1.55), bodyMat);
    boot.position.set(524 + side * .62, 1.0, 568);
    boot.rotation.y = side * .08;
    boots.add(boot);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.16, .24, .55, 10), glowMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(524 + side * .62, .78, 568.72);
    boots.add(nozzle);
  }
  const marker = new THREE.Mesh(new THREE.TorusGeometry(1.15, .08, 8, 32), glowMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(524, .08, 568);
  boots.add(marker);
  root.add(boots);
}

function maintainCavePolish() {
  const root = window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot;
  const THREE = window.__coastlineThree;
  if (!root || !THREE) return;

  const world = window.__coastlineActiveWorldId;
  if (world === 'waterfront') {
    const cave = root.userData?.coastlineReplacementCave;
    if (cave && !cave.userData.coastlineLemonadeFacingFixed) {
      cave.rotation.y += Math.PI;
      cave.userData.coastlineLemonadeFacingFixed = true;
      cave.updateMatrixWorld(true);
    }
  }

  if (world === 'electric-lemonade-dungeon') {
    buildGeometryFirstLabyrinth(root, THREE);
    ensureRocketBootsReachable(root, THREE);
  }
}

if (typeof window !== 'undefined') {
  window.__coastlineThreeCavePolishUpdate = maintainCavePolish;
  const timer = window.setInterval(maintainCavePolish, 100);
  window.addEventListener('beforeunload', () => window.clearInterval(timer), { once: true });
}
