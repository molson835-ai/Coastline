import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * Replaces the procedural car body with the licensed Range Rover model.
 * Keeps each vehicle's existing root Group and gameplay state intact.
 */
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
    const visual = new THREE.Group();
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
    replaced++;
  }
  onStatus({ ok: true, replaced, sourceSize: { x: size.x, y: size.y, z: size.z }, scale });
  console.info('[Coastline] Range Rover fleet visuals loaded:', replaced);
  return { ok: true, replaced, sourceSize: { x: size.x, y: size.y, z: size.z }, scale };
}
