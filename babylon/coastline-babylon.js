(() => {
  'use strict';
  const B = window.BABYLON;
  const canvas = document.getElementById('renderCanvas');
  const status = document.getElementById('status');
  const fps = document.getElementById('fps');
  const mission = document.getElementById('mission');
  const toast = document.getElementById('toast');
  if (!B || !canvas || !status || !fps) {
    if (status) status.textContent = 'Unable to start: required Babylon components did not load.';
    return;
  }

  const keys = new Set();
  const mobile = matchMedia('(max-width: 760px)').matches;
  const lowPower = mobile || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const setStatus = value => { status.textContent = value; };
  const press = key => keys.add(key);
  const release = key => keys.delete(key);

  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
    keys.add(key === ' ' ? 'space' : key);
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase()));
  document.querySelectorAll('[data-key]').forEach(button => {
    const key = button.dataset.key;
    const down = e => { e.preventDefault(); press(key); };
    const up = e => { e.preventDefault(); release(key); };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);
    button.addEventListener('contextmenu', e => e.preventDefault());
  });

  const engine = new B.Engine(canvas, true, {
    antialias: !lowPower,
    adaptToDeviceRatio: true,
    powerPreference: 'high-performance',
    stencil: true
  });
  engine.setHardwareScalingLevel(lowPower ? 1.25 : 1);
  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.62, 0.78, 0.84, 1);
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = lowPower ? 0.0011 : 0.00075;
  scene.fogColor = new B.Color3(0.62, 0.78, 0.84);
  scene.skipPointerMovePicking = true;

  const camera = new B.FollowCamera('playerCamera', new B.Vector3(0, 5, -11), scene);
  camera.radius = 12;
  camera.heightOffset = 4.7;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.06;
  camera.maxCameraSpeed = 3;

  const hemi = new B.HemisphericLight('skyLight', new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.86;
  const sun = new B.DirectionalLight('sun', new B.Vector3(-0.35, -1, 0.25), scene);
  sun.position = new B.Vector3(80, 120, -80);
  sun.intensity = 1.1;

  const ground = B.MeshBuilder.CreateGround('ground', { width: 240, height: 240, subdivisions: lowPower ? 4 : 12 }, scene);
  const grass = new B.StandardMaterial('grass', scene);
  grass.diffuseColor = new B.Color3(0.20, 0.34, 0.20);
  grass.roughness = 1;
  ground.material = grass;

  const roadMat = new B.StandardMaterial('road', scene);
  roadMat.diffuseColor = new B.Color3(0.055, 0.062, 0.068);
  roadMat.roughness = 0.9;
  const sidewalkMat = new B.StandardMaterial('sidewalk', scene);
  sidewalkMat.diffuseColor = new B.Color3(0.34, 0.35, 0.33);
  sidewalkMat.roughness = 0.95;
  const lineMat = new B.StandardMaterial('roadMarking', scene);
  lineMat.diffuseColor = new B.Color3(0.88, 0.78, 0.42);
  const buildingMats = [0.24, 0.31, 0.38, 0.46].map((v, i) => {
    const m = new B.StandardMaterial('building' + i, scene);
    m.diffuseColor = new B.Color3(v, v * 1.03, v * 1.08);
    m.roughness = 0.82;
    return m;
  });

  const solidBounds = [];
  function box(name, w, h, d, x, y, z, mat, parent) {
    const mesh = B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    mesh.material = mat;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  // A connected street grid: every block has multiple routes and every junction aligns.
  for (let p = -90; p <= 90; p += 30) {
    box('road-east-west', 240, 0.08, 7, 0, 0.04, p, roadMat);
    box('sidewalk-east-west', 240, 0.14, 1.8, 0, 0.07, p + 4.4, sidewalkMat);
    box('sidewalk-east-west', 240, 0.14, 1.8, 0, 0.07, p - 4.4, sidewalkMat);
    box('road-north-south', 7, 0.08, 240, p, 0.04, 0, roadMat);
    box('sidewalk-north-south', 1.8, 0.14, 240, p + 4.4, 0.07, 0, sidewalkMat);
    box('sidewalk-north-south', 1.8, 0.14, 240, p - 4.4, 0.07, 0, sidewalkMat);
    for (let k = -110; k <= 110; k += 10) {
      box('lane-dash', 2.4, 0.018, 0.12, k, 0.09, p, lineMat);
      box('lane-dash', 0.12, 0.018, 2.4, p, 0.09, k, lineMat);
    }
  }

  let seed = 1701;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // Blocks sit between roads rather than on the road centerlines.
  for (let bx = -105; bx <= 105; bx += 30) {
    for (let bz = -105; bz <= 105; bz += 30) {
      const count = 1 + Math.floor(rand() * (lowPower ? 2 : 3));
      for (let i = 0; i < count; i++) {
        const w = 5 + rand() * 6, d = 5 + rand() * 6, h = 5 + rand() * 15;
        const x = bx + (rand() - 0.5) * 12, z = bz + (rand() - 0.5) * 12;
        box('building', w, h, d, x, h / 2, z, buildingMats[Math.floor(rand() * buildingMats.length)]);
        solidBounds.push({ x, z, hw: w / 2 + 0.65, hd: d / 2 + 0.65, kind: 'building' });
      }
    }
  }

  // One source mesh per vegetation type; instances reduce draw calls on phones.
  const trunkMat = new B.StandardMaterial('trunk', scene);
  trunkMat.diffuseColor = new B.Color3(0.20, 0.13, 0.075);
  const leavesMat = new B.StandardMaterial('leaves', scene);
  leavesMat.diffuseColor = new B.Color3(0.08, 0.30, 0.13);
  const trunkBase = B.MeshBuilder.CreateCylinder('treeTrunkSource', { height: 1.5, diameter: 0.22, tessellation: 6 }, scene);
  trunkBase.material = trunkMat;
  trunkBase.isVisible = false;
  const crownBase = B.MeshBuilder.CreateIcoSphere('treeCrownSource', { radius: 1.15, subdivisions: 1 }, scene);
  crownBase.material = leavesMat;
  crownBase.isVisible = false;
  const treeCount = lowPower ? 35 : 100;
  for (let i = 0; i < treeCount; i++) {
    const x = (rand() - 0.5) * 220, z = (rand() - 0.5) * 220;
    if (Math.abs(x - Math.round(x / 30) * 30) < 6 || Math.abs(z - Math.round(z / 30) * 30) < 6) continue;
    if (solidBounds.some(b => Math.abs(x - b.x) < b.hw + 1.4 && Math.abs(z - b.z) < b.hd + 1.4)) continue;
    const scale = 0.7 + rand() * 0.8;
    const trunk = trunkBase.createInstance('treeTrunk' + i);
    trunk.position.set(x, 0.75 * scale, z);
    trunk.scaling.setAll(scale);
    const crown = crownBase.createInstance('treeCrown' + i);
    crown.position.set(x, 2.1 * scale, z);
    crown.scaling.setAll(scale);
    // Tree trunks are world obstacles too; skip street/building zones above to preserve clear routes.
    solidBounds.push({ x, z, hw: 0.42 * scale, hd: 0.42 * scale, kind: 'tree' });
  }

  // Procedural roadside greenery and worn-earth patches add breakup to the large grass planes.
  const bushMat = new B.StandardMaterial('bushGreen', scene);
  bushMat.diffuseColor = new B.Color3(0.12, 0.27, 0.11);
  const bushSource = B.MeshBuilder.CreateIcoSphere('bushSource', { radius: 0.8, subdivisions: 1 }, scene);
  bushSource.material = bushMat;
  bushSource.isVisible = false;
  const dirtMat = new B.StandardMaterial('wornEarth', scene);
  dirtMat.diffuseColor = new B.Color3(0.27, 0.22, 0.15);
  dirtMat.roughness = 1;
  const dirtSource = B.MeshBuilder.CreateSphere('dirtPatchSource', { diameter: 1, segments: 8 }, scene);
  dirtSource.material = dirtMat;
  dirtSource.isVisible = false;
  const clearGround = (x, z, roadClearance = 5.6) => {
    if (Math.abs(x - Math.round(x / 30) * 30) < roadClearance || Math.abs(z - Math.round(z / 30) * 30) < roadClearance) return false;
    return !solidBounds.some(b => Math.abs(x - b.x) < b.hw + 1 && Math.abs(z - b.z) < b.hd + 1);
  };
  const bushCount = lowPower ? 55 : 145;
  for (let i = 0; i < bushCount; i++) {
    const x = (rand() - 0.5) * 220, z = (rand() - 0.5) * 220;
    if (!clearGround(x, z)) continue;
    const bush = bushSource.createInstance('bush' + i);
    const s = 0.55 + rand() * 0.9;
    bush.position.set(x, 0.38 * s, z);
    bush.scaling.set(s * 1.25, s * 0.75, s);
  }
  const dirtCount = lowPower ? 24 : 70;
  for (let i = 0; i < dirtCount; i++) {
    const x = (rand() - 0.5) * 220, z = (rand() - 0.5) * 220;
    if (!clearGround(x, z, 5.1)) continue;
    const patch = dirtSource.createInstance('dirtPatch' + i);
    const s = 0.7 + rand() * 1.9;
    patch.position.set(x, 0.018, z);
    patch.scaling.set(s * 1.7, 0.025, s);
  }

  // Stylized but layered car prototype: body, glass, lamps, wheels and wheel hubs.
  const car = new B.TransformNode('playerCar', scene);
  const bodyMat = new B.PBRMaterial('carPaint', scene);
  bodyMat.albedoColor = new B.Color3(0.035, 0.10, 0.13);
  bodyMat.metallic = 0.62;
  bodyMat.roughness = 0.24;
  const glassMat = new B.PBRMaterial('carGlass', scene);
  glassMat.albedoColor = new B.Color3(0.025, 0.11, 0.15);
  glassMat.metallic = 0.25;
  glassMat.roughness = 0.12;
  const tireMat = new B.PBRMaterial('rubber', scene);
  tireMat.albedoColor = new B.Color3(0.012, 0.014, 0.016);
  tireMat.roughness = 0.9;
  const rimMat = new B.PBRMaterial('wheelMetal', scene);
  rimMat.albedoColor = new B.Color3(0.45, 0.50, 0.52);
  rimMat.metallic = 0.85;
  rimMat.roughness = 0.3;
  const headMat = new B.StandardMaterial('headlights', scene);
  headMat.emissiveColor = new B.Color3(0.95, 0.86, 0.58);
  const tailMat = new B.StandardMaterial('taillights', scene);
  tailMat.emissiveColor = new B.Color3(0.85, 0.035, 0.025);
  box('carBody', 2.05, 0.62, 4.1, 0, 0.72, 0, bodyMat, car);
  box('carHood', 1.9, 0.16, 1.05, 0, 1.02, 1.12, bodyMat, car);
  box('carCabin', 1.55, 0.66, 1.82, 0, 1.30, -0.18, glassMat, car);
  box('carFrontGlass', 1.38, 0.44, 0.08, 0, 1.48, 0.70, glassMat, car);
  box('carRearGlass', 1.34, 0.42, 0.08, 0, 1.46, -1.04, glassMat, car);
  for (const x of [-0.68, 0.68]) {
    box('headlamp', 0.34, 0.12, 0.06, x, 0.84, 2.08, headMat, car);
    box('taillamp', 0.34, 0.13, 0.06, x, 0.84, -2.08, tailMat, car);
  }
  const wheels = [];
  for (const x of [-1.02, 1.02]) for (const z of [-1.40, 1.40]) {
    const wheel = B.MeshBuilder.CreateCylinder('wheel', { diameter: 0.62, height: 0.24, tessellation: 16 }, scene);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.43, z);
    wheel.parent = car;
    wheel.material = tireMat;
    wheels.push(wheel);
    const hub = B.MeshBuilder.CreateCylinder('wheelHub', { diameter: 0.30, height: 0.255, tessellation: 12 }, scene);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x * 1.01, 0.43, z);
    hub.parent = car;
    hub.material = rimMat;
  }
  car.position.set(0, 0, 0);
  camera.lockedTarget = car;

  // Tiny optional free-roam loop proves pickups/objectives without locking the player into a mission.
  const pickupMat = new B.StandardMaterial('discoveryGlow', scene);
  pickupMat.diffuseColor = new B.Color3(0.1, 0.9, 0.95);
  pickupMat.emissiveColor = new B.Color3(0.05, 0.8, 0.95);
  const pickupPositions = [[30, 0, 0], [60, 0, 30], [-30, 0, 60], [-60, 0, 0], [0, 0, -60]];
  const pickups = pickupPositions.map((p, i) => {
    const orb = B.MeshBuilder.CreateSphere('discovery-' + i, { diameter: 1.15, segments: lowPower ? 8 : 12 }, scene);
    orb.position.set(p[0], 1.35, p[2]);
    orb.material = pickupMat;
    return { mesh: orb, x: p[0], z: p[2], found: false, phase: i * 0.9 };
  });
  let discoveries = 0;
  let toastUntil = 0;
  const showToast = message => { toast.textContent = message; toast.classList.add('visible'); toastUntil = performance.now() + 3200; };
  const updateMission = () => { mission.textContent = 'DISCOVERIES  ' + discoveries + ' / ' + pickups.length + '\nExplore the street grid and collect glowing markers'; };
  updateMission();

  const motion = { speed: 0, heading: 0, x: car.position.x, z: car.position.z };
  let jumpVelocity = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.04);
    const throttle = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const steer = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    const maxForward = lowPower ? 19 : 24;
    const maxReverse = 8;
    const accel = throttle === 0 ? 0 : (Math.sign(throttle) === Math.sign(motion.speed) || Math.abs(motion.speed) < 0.1 ? 16 : 21);
    motion.speed += throttle * accel * dt;
    if (throttle === 0) motion.speed *= Math.pow(0.94, dt * 60);
    motion.speed = Math.max(-maxReverse, Math.min(maxForward, motion.speed));

    // Positive steering input is right; negative is left. Reverse steering flips naturally.
    const grip = Math.min(1, Math.abs(motion.speed) / 2.5);
    motion.heading += steer * grip * (motion.speed >= 0 ? 1 : -1) * 1.8 * dt;
    car.rotation.y = motion.heading;
    const nextX = Math.max(-114, Math.min(114, car.position.x + Math.sin(motion.heading) * motion.speed * dt));
    const nextZ = Math.max(-114, Math.min(114, car.position.z + Math.cos(motion.heading) * motion.speed * dt));
    const blocked = solidBounds.some(b => Math.abs(nextX - b.x) < b.hw && Math.abs(nextZ - b.z) < b.hd);
    if (blocked) {
      motion.speed *= -0.14;
      if (performance.now() > toastUntil) showToast('Obstacle hit · steer back onto the road');
    } else {
      car.position.x = nextX;
      car.position.z = nextZ;
    }

    // Discoveries are non-blocking: free driving always remains available.
    const now = performance.now();
    for (const item of pickups) {
      if (item.found) continue;
      item.mesh.rotation.y += dt * 1.2;
      item.mesh.position.y = 1.35 + Math.sin(now * 0.002 + item.phase) * 0.18;
      if (Math.hypot(car.position.x - item.x, car.position.z - item.z) < 3.2) {
        item.found = true;
        item.mesh.dispose();
        discoveries++;
        updateMission();
        showToast(discoveries === pickups.length ? 'All discoveries found · keep exploring!' : 'Discovery found · ' + discoveries + ' / ' + pickups.length);
      }
    }
    if (now > toastUntil) toast.classList.remove('visible');
    if (keys.has('space') && car.position.y <= 0.01 && jumpVelocity <= 0) jumpVelocity = 4.2;
    jumpVelocity -= 11 * dt;
    car.position.y = Math.max(0, car.position.y + jumpVelocity * dt);
    if (car.position.y === 0 && jumpVelocity < 0) jumpVelocity = 0;

    motion.x = car.position.x;
    motion.z = car.position.z;
    fps.textContent = 'FPS ' + engine.getFps().toFixed(0);
  });

  window.__coastlineBabylonTest = {
    state: () => ({ x: motion.x, z: motion.z, speed: motion.speed, heading: motion.heading, meshCount: scene.meshes.length, fps: engine.getFps(), discoveries, remainingDiscoveries: pickups.filter(p => !p.found).length, buildingColliders: solidBounds.filter(b => b.kind === 'building').length, treeColliders: solidBounds.filter(b => b.kind === 'tree').length }),
    keyDown: key => press(String(key).toLowerCase()),
    keyUp: key => release(String(key).toLowerCase()),
    setPosition: (x, z, heading = 0) => { car.position.x = x; car.position.z = z; motion.x = x; motion.z = z; motion.heading = heading; motion.speed = 0; car.rotation.y = heading; },
    colliders: () => solidBounds.map(b => ({ ...b }))
  };
  addEventListener('blur', () => keys.clear());
  addEventListener('resize', () => engine.resize());
  engine.runRenderLoop(() => scene.render());
  setStatus('Ready · WASD / arrows or touch controls · WebGL mobile baseline');
  window.addEventListener('error', event => setStatus('Runtime error: ' + (event.message || 'unknown error')));
})();