import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * Replaces procedural traffic-car visuals with the licensed Range Rover model.
 * Keeps each vehicle's gameplay root intact. For the player hero car, the
 * imported model stays inside the named hero visual shell and its damage-part
 * references are rebound to meshes in the imported model (the GLB loads async).
 */
function bindHeroParts(THREE, vehicle, visual, model, heroInfo) {
  const meshes = [];
  model.traverse(node => {
    if (node.isMesh) meshes.push(node);
  });
  if (!meshes.length) return;

  const named = pattern => meshes.find(mesh => pattern.test(String(mesh.name || '')));
  const paintable = meshes.find(mesh =>
    mesh.material && !Array.isArray(mesh.material) && mesh.material.color
  );
  const first = paintable || meshes[0];
  const last = meshes[meshes.length - 1];
  const body = named(/body|chassis|exterior|paint|shell/i) || first;
  const cab = named(/glass|window|windshield|windscreen|cabin|interior/i) || body;
  const hood = named(/hood|bonnet/i) || body;
  const trunk = named(/trunk|boot|tailgate/i) || body;
  const roof = named(/roof/i) || cab;
  const frontBumper = named(/front.*bumper|bumper.*front/i) || body;
  const rearBumper = named(/rear.*bumper|bumper.*rear/i) || last;
  let wheels = meshes.filter(mesh => /wheel|tire|tyre|rim/i.test(String(mesh.name || '')));
  if (wheels.length < 4) {
    const fallback = meshes.filter(mesh => mesh !== body && mesh !== cab);
    wheels = [...wheels, ...fallback.filter(mesh => !wheels.includes(mesh))];
  }
  if (wheels.length < 4) wheels = [...wheels, ...meshes.filter(mesh => !wheels.includes(mesh))];
  wheels = wheels.slice(0, 4);
  while (wheels.length > 0 && wheels.length < 4) wheels.push(wheels[wheels.length - 1]);

  visual.name = 'coastline-hero-white-single-shell';
  const parts = {
    body, cab, hood, trunk, roof, frontBumper, rearBumper, wheels, visualRoot: visual
  };
  heroInfo.parts = parts;
  vehicle.g.userData.coastlineHeroVehicle = heroInfo;
  vehicle.damageParts = parts;
  if (body.material && !Array.isArray(body.material) && body.material.color) {
    vehicle.basePaint = body.material.color.clone();
  }
  // Keep the metadata's requested default paint consistent with the imported hero.
  heroInfo.paintColor = 'white';
}

export async function applyRangeRoverFleet(THREE, vehicles, onStatus = () => {}) {
  const url = './assets/vehicles/Range%20Rover%20by%20IvOfficial%20-%208zk4o6nALW.glb';
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch (error) {
    console.error('[Coastline] Range Rover model failed to load; retaining fallback vehicles.', error);
    onStatus({ ok: false, reason: 'load-failed', error });
    return { ok: false, replaced: 0 };
  }

  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
      Math.max(size.x, size.y, size.z) <= 0) {
    onStatus({ ok: false, reason: 'invalid-model-bounds' });
    return { ok: false, replaced: 0 };
  }

  // Normalize model to a consistent road-car footprint while preserving its proportions.
  const targetWidth = 2.05;
  const targetLength = 4.25;
  const scale = Math.min(targetWidth / size.x, targetLength / size.z, 1.9 / size.y);
  let replaced = 0;
  for (const vehicle of vehicles) {
    if (!vehicle || vehicle.kind !== 'car' || !vehicle.g) continue;
    const heroInfo = vehicle.g.userData?.coastlineHeroVehicle;
    const visual = new THREE.Group();
    if (heroInfo?.singleShell) visual.name = 'coastline-hero-white-single-shell';
    const model = source.clone(true);
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    // Center the footprint and put the tires/model base on the vehicle's ground plane.
    model.position.x -= (scaledBounds.min.x + scaledBounds.max.x) / 2;
    model.position.z -= (scaledBounds.min.z + scaledBounds.max.z) / 2;
    model.position.y -= scaledBounds.min.y;
    visual.add(model);

    // Preserve the gameplay root and replace only its visual children.
    const oldChildren = [...vehicle.g.children];
    for (const child of oldChildren) {
      vehicle.g.remove(child);
      child.traverse?.(node => {
        if (node.geometry && node.geometry.dispose) node.geometry.dispose();
        // Shared procedural materials may be used by other vehicles; don't dispose them here.
      });
    }
    vehicle.g.add(visual);
    vehicle.rangeRoverVisual = visual;
    vehicle.rangeRoverModel = model;
    vehicle.rangeRoverScale = scale;
    if (heroInfo?.singleShell) bindHeroParts(THREE, vehicle, visual, model, heroInfo);
    replaced++;
  }
  onStatus({ ok: true, replaced, sourceSize: { x: size.x, y: size.y, z: size.z }, scale });
  console.info('[Coastline] Range Rover fleet visuals loaded:', replaced);
  return { ok: true, replaced, sourceSize: { x: size.x, y: size.y, z: size.z }, scale };
}
