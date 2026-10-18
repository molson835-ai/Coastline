// Coastline cinematic world dressing v1.
// Adds inexpensive, instanced environmental detail without changing gameplay,
// collision, world coordinates, or the player's movement/vehicle systems.
export function applyCinematicWorldUpgrade({ THREE, scene, worldModel, groundY, lowPowerDevice = false }) {
  if (!THREE || !scene || !worldModel || typeof groundY !== 'function') {
    throw new Error('Coastline visual upgrade requires THREE, scene, worldModel and groundY');
  }
  if (scene.userData.coastlineCinematicWorldUpgrade) return scene.userData.coastlineCinematicWorldUpgrade;

  const half = Math.min(worldModel.halfSize || 750, 740);
  const block = worldModel.roadSpacing || 200;
  const seeded = (x, z, salt = 0) => worldModel.hash(x, z, salt + 701);
  const inRoad = (x, z, margin = 9) => worldModel.isRoadCorridor(x, z, margin);
  const nearBuildingPad = (x, z, radius = 39) => {
    const bx = Math.round((x - block / 2) / block) * block + block / 2;
    const bz = Math.round((z - block / 2) / block) * block + block / 2;
    return Math.abs(x - bx) < radius && Math.abs(z - bz) < radius;
  };
  const mat = (color, roughness = .9, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const dummy = new THREE.Object3D();
  const setInstance = (mesh, index, x, y, z, yaw, sx, sy, sz, color) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (color !== undefined && mesh.setColorAt) mesh.setColorAt(index, new THREE.Color(color));
  };
  const addInstances = (geometry, material, items, castShadow = false) => {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.name = 'Coastline cinematic instanced dressing';
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      setInstance(mesh, i, p.x, p.y, p.z, p.yaw || 0, p.sx || 1, p.sy || 1, p.sz || 1, p.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  };

  // Ground-cover blades: a single low-poly tuft is instanced hundreds of times.
  const bladeVertices = [], bladeIndices = [];
  const addBlade = (angle, width, height, lean) => {
    const dx = Math.cos(angle), dz = Math.sin(angle), px = -dz * width / 2, pz = dx * width / 2;
    const base = bladeVertices.length / 3;
    bladeVertices.push(px, 0, pz, -px, 0, -pz, dx * lean + px * .12, height, dz * lean + pz * .12, dx * lean - px * .12, height, dz * lean - pz * .12);
    bladeIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  };
  addBlade(.15, .13, .55, .10); addBlade(1.9, .12, .42, .08); addBlade(3.45, .14, .62, .12); addBlade(5.0, .10, .36, .07);
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bladeVertices, 3));
  grassGeometry.setIndex(bladeIndices);
  grassGeometry.computeVertexNormals();
  const grassMaterial = mat(0x73904c, 1, 0, { side: THREE.DoubleSide, vertexColors: false });
  grassMaterial.color.set(0xffffff);
  const grassItems = [];
  const gridStep = lowPowerDevice ? 20 : 16;
  for (let x = -half + 7; x <= half - 7; x += gridStep) {
    for (let z = -half + 7; z <= half - 7; z += gridStep) {
      const roll = seeded(x, z, 3);
      if (roll > (lowPowerDevice ? .13 : .19)) continue;
      const px = x + (seeded(x, z, 7) - .5) * gridStep;
      const pz = z + (seeded(x, z, 11) - .5) * gridStep;
      if (inRoad(px, pz, 14) || nearBuildingPad(px, pz, 31)) continue;
      const region = worldModel.regionAt(px, pz);
      if (region === 'city' && seeded(x, z, 19) > .14) continue;
      const scale = .48 + seeded(x, z, 23) * .82;
      grassItems.push({
        x: px, y: groundY(px, pz) + .035, z: pz, yaw: seeded(x, z, 29) * Math.PI * 2,
        sx: scale, sy: scale * (.7 + seeded(x, z, 31) * .9), sz: scale,
        color: [0x66864a, 0x789653, 0x8a9d5b, 0x526f3d, 0x9a9d61][Math.floor(seeded(x, z, 37) * 5)]
      });
    }
  }
  addInstances(grassGeometry, grassMaterial, grassItems, false);

  // Irregular soil patches break up perfectly uniform lawns; very shallow to avoid z-fighting.
  const dirtGeometry = new THREE.CircleGeometry(1, 7);
  dirtGeometry.rotateX(-Math.PI / 2);
  const dirtItems = [];
  for (let x = -half + 15; x <= half - 15; x += 37) {
    for (let z = -half + 15; z <= half - 15; z += 37) {
      if (seeded(x, z, 41) > .17) continue;
      const px = x + (seeded(x, z, 43) - .5) * 23, pz = z + (seeded(x, z, 47) - .5) * 23;
      if (inRoad(px, pz, 13) || nearBuildingPad(px, pz, 36)) continue;
      dirtItems.push({ x: px, y: groundY(px, pz) + .018, z: pz, yaw: seeded(x, z, 53) * Math.PI, sx: 1.4 + seeded(x, z, 59) * 3.1, sy: 1, sz: .7 + seeded(x, z, 61) * 1.6, color: [0x78664b, 0x8b7958, 0x655c45, 0x9a8763][Math.floor(seeded(x, z, 67) * 4)] });
    }
  }
  const dirtMaterial = mat(0xffffff, 1, 0, { side: THREE.DoubleSide });
  addInstances(dirtGeometry, dirtMaterial, dirtItems, false);

  // Shrub clusters and roadside stones add silhouette variety without individual draw calls.
  const shrubGeometry = new THREE.DodecahedronGeometry(1, 1);
  const shrubItems = [], rockItems = [];
  const attempts = lowPowerDevice ? 210 : 330;
  for (let i = 0; i < attempts; i++) {
    const x = (seeded(i, 101, 71) * 2 - 1) * (half - 18);
    const z = (seeded(i, 211, 73) * 2 - 1) * (half - 18);
    if (inRoad(x, z, 18) || nearBuildingPad(x, z, 42)) continue;
    const region = worldModel.regionAt(x, z);
    if (region === 'city' && seeded(i, 307, 79) < .82) continue;
    const size = .65 + seeded(i, 401, 83) * 1.65;
    shrubItems.push({ x, y: groundY(x, z) + size * .47, z, yaw: seeded(i, 503, 89) * Math.PI, sx: size * (1.1 + seeded(i, 601, 97) * .55), sy: size * .7, sz: size * (1 + seeded(i, 701, 101) * .5), color: [0x355b35, 0x426d3b, 0x597744, 0x6b8146][Math.floor(seeded(i, 809, 103) * 4)] });
    if (i % 3 === 0) rockItems.push({ x: x + 2.4, y: groundY(x + 2.4, z) + .3, z: z - 1.8, yaw: seeded(i, 907, 107), sx: .45 + size * .45, sy: .28 + size * .24, sz: .5 + size * .38, color: [0x77766c, 0x89877b, 0x615f56][i % 3] });
  }
  addInstances(shrubGeometry, mat(0xffffff, 1), shrubItems, false);
  addInstances(new THREE.DodecahedronGeometry(1, 0), mat(0xffffff, 1), rockItems, false);

  // Production-style street lamps along major streets. Separate instanced pole, arm and warm lens.
  const poleGeo = new THREE.CylinderGeometry(.075, .105, 5.8, 7);
  const armGeo = new THREE.BoxGeometry(1.2, .09, .10);
  const lampGeo = new THREE.BoxGeometry(.48, .16, .27);
  const lampMetal = mat(0x3e4748, .48, .72);
  const lampGlass = new THREE.MeshStandardMaterial({ color: 0xffdba0, emissive: 0xffc66e, emissiveIntensity: 1.7, roughness: .25, metalness: .05 });
  const poleItems = [], armItems = [], lampItems = [];
  const stride = lowPowerDevice ? 112 : 82;
  let lampCount = 0;
  for (let road = -600; road <= 600; road += block) {
    for (let along = -620; along <= 620; along += stride) {
      if (Math.abs(along - Math.round(along / block) * block) < 19) continue;
      for (const axis of ['v', 'h']) {
        const x = axis === 'v' ? road + 9.7 : along;
        const z = axis === 'v' ? along : road + 9.7;
        if (inRoad(x, z, 0)) continue;
        const y = groundY(x, z);
        const yaw = axis === 'v' ? Math.PI / 2 : 0;
        poleItems.push({ x, y: y + 2.9, z, yaw, sx: 1, sy: 1, sz: 1 });
        armItems.push({ x: x + (axis === 'v' ? .45 : .45), y: y + 5.55, z, yaw, sx: 1, sy: 1, sz: 1 });
        lampItems.push({ x: x + .95, y: y + 5.47, z, yaw, sx: 1, sy: 1, sz: 1 });
        lampCount++;
      }
    }
  }
  addInstances(poleGeo, lampMetal, poleItems, false);
  addInstances(armGeo, lampMetal, armItems, false);
  addInstances(lampGeo, lampGlass, lampItems, false);

  // Small street furniture: simple benches, placed at selected non-road corners.
  const benchSeatGeo = new THREE.BoxGeometry(1.75, .12, .52);
  const benchLegGeo = new THREE.BoxGeometry(.10, .48, .10);
  const benchBackGeo = new THREE.BoxGeometry(1.75, .62, .10);
  const benchWood = mat(0x8b6848, .86, 0);
  const benchMetal = mat(0x343c40, .62, .58);
  const seats = [], legs = [], backs = [];
  for (let x = -500; x <= 500; x += 200) {
    for (let z = -500; z <= 500; z += 200) {
      for (const side of [-1, 1]) {
        const px = x + side * 13.4, pz = z + 14;
        if (inRoad(px, pz, 0)) continue;
        const y = groundY(px, pz);
        seats.push({ x: px, y: y + .58, z: pz, yaw: 0 });
        backs.push({ x: px, y: y + .94, z: pz - .22, yaw: 0 });
        for (const dx of [-.7, .7]) legs.push({ x: px + dx, y: y + .28, z: pz, yaw: 0 });
      }
    }
  }
  addInstances(benchSeatGeo, benchWood, seats, false);
  addInstances(benchLegGeo, benchMetal, legs, false);
  addInstances(benchBackGeo, benchWood, backs, false);

  const result = Object.freeze({
    version: 1,
    grassClumps: grassItems.length,
    dirtPatches: dirtItems.length,
    shrubs: shrubItems.length,
    rocks: rockItems.length,
    streetLamps: lampCount,
    benches: seats.length,
    renderObjectsAdded: 11
  });
  scene.userData.coastlineCinematicWorldUpgrade = result;
  window.__coastlineCinematicWorldUpgrade = result;
  return result;
}
