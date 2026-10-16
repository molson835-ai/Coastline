(() => {
  const B = window.BABYLON;
  const canvas = document.getElementById('renderCanvas');
  const status = document.getElementById('status');
  const fps = document.getElementById('fps');
  const keys = new Set();
  const mobile = innerWidth <= 760;
  const lowPower = mobile || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  const setStatus = text => { status.textContent = text; };
  const press = key => keys.add(key);
  const release = key => keys.delete(key);
  addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key === ' ') keys.add('space'); });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (e.key === ' ') keys.delete('space'); });
  document.querySelectorAll('[data-key]').forEach(button => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', e => { e.preventDefault(); press(key); button.setPointerCapture(e.pointerId); });
    button.addEventListener('pointerup', e => { e.preventDefault(); release(key); });
    button.addEventListener('pointercancel', () => release(key));
  });

  const engineOptions = { antialias: !lowPower, adaptToDeviceRatio: true, powerPreference: 'high-performance' };
  const engine = new B.Engine(canvas, true, engineOptions);
  engine.setHardwareScalingLevel(lowPower ? 1.25 : 1);
  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.025, 0.055, 0.075, 1);

  const camera = new B.FollowCamera('playerCamera', new B.Vector3(0, 5, -11), scene);
  camera.radius = 11; camera.heightOffset = 4.5; camera.rotationOffset = 180; camera.cameraAcceleration = 0.08; camera.maxCameraSpeed = 2;

  const hemi = new B.HemisphericLight('skyLight', new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  const sun = new B.DirectionalLight('sun', new B.Vector3(-0.35, -1, 0.25), scene);
  sun.position = new B.Vector3(80, 120, -80); sun.intensity = 1.25;

  const ground = B.MeshBuilder.CreateGround('ground', { width: 240, height: 240, subdivisions: lowPower ? 8 : 24 }, scene);
  const grass = new B.StandardMaterial('grass', scene); grass.diffuseColor = new B.Color3(0.13, 0.27, 0.16); grass.roughness = 1; ground.material = grass;

  const roadMat = new B.StandardMaterial('road', scene); roadMat.diffuseColor = new B.Color3(0.045, 0.052, 0.058); roadMat.roughness = 0.88;
  const sidewalkMat = new B.StandardMaterial('sidewalk', scene); sidewalkMat.diffuseColor = new B.Color3(0.29, 0.31, 0.30); sidewalkMat.roughness = 0.92;
  const buildingMats = [0.24, 0.31, 0.38, 0.46].map((v, i) => { const m = new B.StandardMaterial('building' + i, scene); m.diffuseColor = new B.Color3(v, v * 1.03, v * 1.08); m.roughness = 0.82; return m; });

  function box(name, w, h, d, x, y, z, mat) {
    const m = B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = mat; return m;
  }
  for (let x = -90; x <= 90; x += 30) {
    box('road-x', 22, .08, 7, x, .04, 0, roadMat);
    box('sidewalk-x', 22, .14, 1.8, x, .07, 4.4, sidewalkMat);
    box('sidewalk-x', 22, .14, 1.8, x, .07, -4.4, sidewalkMat);
  }
  for (let z = -90; z <= 90; z += 30) {
    box('road-z', 7, .09, 22, 0, .05, z, roadMat);
    box('sidewalk-z', 1.8, .14, 22, 4.4, .07, z, sidewalkMat);
    box('sidewalk-z', 1.8, .14, 22, -4.4, .07, z, sidewalkMat);
  }

  // Repeated modular blocks: cheap to build now, ready to be replaced by streamed GLB districts later.
  let seed = 17;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let bx = -105; bx <= 105; bx += 30) for (let bz = -105; bz <= 105; bz += 30) {
    if (Math.abs(bx) < 16 || Math.abs(bz) < 16) continue;
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const w = 7 + rand() * 7, d = 7 + rand() * 7, h = 6 + rand() * 20;
      const x = bx + (rand() - .5) * 20, z = bz + (rand() - .5) * 20;
      box('building', w, h, d, x, h / 2, z, buildingMats[Math.floor(rand() * buildingMats.length)]);
    }
  }

  // Lightweight vegetation scatter; instances keep draw calls bounded.
  const trunk = new B.StandardMaterial('trunk', scene); trunk.diffuseColor = new B.Color3(.18, .11, .06);
  const leaves = new B.StandardMaterial('leaves', scene); leaves.diffuseColor = new B.Color3(.08, .28, .12);
  for (let i = 0; i < (lowPower ? 80 : 220); i++) {
    const x = (rand() - .5) * 220, z = (rand() - .5) * 220;
    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;
    const trunkMesh = B.MeshBuilder.CreateCylinder('tree', { height: 1.6, diameter: .25, tessellation: 6 }, scene);
    trunkMesh.position.set(x, .8, z); trunkMesh.material = trunk;
    const crown = B.MeshBuilder.CreateIcoSphere('crown', { radius: 1.25 + rand() * .7, subdivisions: 1 }, scene);
    crown.position.set(x, 2.3, z); crown.material = leaves;
  }

  // Car prototype uses simple PBR materials so the next pass can swap in a GLB without rewriting gameplay.
  const car = new B.TransformNode('playerCar', scene);
  const bodyMat = new B.PBRMaterial('carPaint', scene); bodyMat.albedoColor = new B.Color3(.045, .09, .12); bodyMat.metallic = .72; bodyMat.roughness = .22;
  const body = box('carBody', 2.2, .65, 4.2, 0, .75, 0, bodyMat); body.parent = car; body.position.set(0, .75, 0);
  const cabin = box('carCabin', 1.65, .62, 1.9, 0, 1.34, -.15, bodyMat); cabin.parent = car;
  const wheelMat = new B.PBRMaterial('rubber', scene); wheelMat.albedoColor = new B.Color3(.012, .014, .016); wheelMat.roughness = .88;
  for (const x of [-1.02, 1.02]) for (const z of [-1.45, 1.45]) { const w = B.MeshBuilder.CreateCylinder('wheel', { diameter: .62, height: .24, tessellation: 16 }, scene); w.rotation.z = Math.PI / 2; w.position.set(x, .48, z); w.parent = car; w.material = wheelMat; }
  car.position.set(0, 0, 12);
  camera.lockedTarget = car;

  const speed = { value: 0 }, heading = { value: 0 };
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, .05);
    const throttle = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
    const steer = (keys.has('a') ? -1 : 0) + (keys.has('d') ? 1 : 0);
    speed.value += throttle * 14 * dt;
    speed.value *= Math.pow(.985, dt * 60);
    speed.value = Math.max(-7, Math.min(24, speed.value));
    heading.value += steer * Math.min(1, Math.abs(speed.value) / 6) * 1.65 * dt;
    car.rotation.y = heading.value;
    car.position.x += Math.sin(heading.value) * speed.value * dt;
    car.position.z += Math.cos(heading.value) * speed.value * dt;
    car.position.x = Math.max(-112, Math.min(112, car.position.x));
    car.position.z = Math.max(-112, Math.min(112, car.position.z));
    if (keys.has('space') && car.position.y < .02) car.position.y = .35;
    car.position.y = Math.max(0, car.position.y - 10 * dt);
    camera.radius = lowPower ? 10.5 : 11.5;
    fps.textContent = `FPS ${engine.getFps().toFixed(0)}`;
  });

  addEventListener('resize', () => engine.resize());
  setStatus('Babylon foundation ready · WebGL baseline · drive with WASD / touch');
  engine.runRenderLoop(() => scene.render());
})();
