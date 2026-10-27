const PARTS = [
  { url: './assets/vehicles/coastline_home_interior_part_1.bin', bytes: 20_000_000 },
  { url: './assets/vehicles/coastline_home_interior_part_2.bin', bytes: 20_000_000 },
  { url: './assets/vehicles/coastline_home_interior_part_3.bin', bytes: 7_528_304 },
];
const EXPECTED_BYTES = 47_528_304;
const EXPECTED_SHA256 = 'bfa1fd41d535d1cb5f8ad93e3a0902280e0595083d653c3483c187b8d4e1351b';

function report(message) {
  window.__coastlineHomeInteriorAssetStatus = message;
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__coastlineHomeInteriorToastTimer);
    window.__coastlineHomeInteriorToastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }
}

async function fetchAndReconstructGlb() {
  // Assemble sequentially into one target buffer to limit peak mobile memory.
  const bytes = new Uint8Array(EXPECTED_BYTES);
  let offset = 0;
  for (const part of PARTS) {
    const response = await fetch(part.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Asset chunk request failed (' + response.status + '): ' + part.url);
    const data = await response.arrayBuffer();
    if (data.byteLength !== part.bytes) throw new Error('Asset chunk length mismatch: ' + part.url + ' (' + data.byteLength + ' bytes)');
    bytes.set(new Uint8Array(data), offset);
    offset += data.byteLength;
  }
  if (offset !== EXPECTED_BYTES) throw new Error('Reconstructed GLB size mismatch: ' + offset);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  if (sha256 !== EXPECTED_SHA256) throw new Error('Reconstructed house GLB checksum mismatch; refusing to display incomplete/corrupt asset');
  const view = new DataView(bytes.buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== EXPECTED_BYTES) {
    throw new Error('Reconstructed asset is not a valid GLB v2 file');
  }
  return bytes.buffer;
}

function normalizeInteriorModel(THREE, model, { centerX, centerZ, floorY }) {
  // Keep the asset's proportions. This is a replacement interior world, not a
  // room insert: choose a realistic overall house footprint from the model's
  // own bounds, rather than stretching it to match the old procedural room.
  model.rotation.y = Math.PI / 2;
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(sourceSize.x + sourceSize.y + sourceSize.z) || sourceSize.x < 1 || sourceSize.z < 1 || sourceSize.y < 0.5) {
    throw new Error('House GLB has implausible dimensions');
  }
  // Uniform scale: make the longer horizontal axis about 23 world units while
  // preserving height and furniture proportions. The previous per-axis fit
  // could distort the apartment and force it into the old room footprint.
  const horizontalSpan = Math.max(sourceSize.x, sourceSize.z);
  const uniformScale = 23 / horizontalSpan;
  model.scale.setScalar(uniformScale);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x += centerX - center.x;
  model.position.y += floorY - bounds.min.y;
  model.position.z += centerZ - center.z;
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ('envMapIntensity' in material) material.envMapIntensity = Math.min(material.envMapIntensity || 1, 0.8);
      }
    }
  });
  return { size, bounds, uniformScale };
}

function hideSupersededProceduralFurniture(root) {
  // The imported model is the complete replacement interior. Hide every old
  // procedural visual (shell, floor, ceiling, and furniture) so no room remains
  // nested around it; the separate exterior house world is not modified.
  const structuralCollision = /^(house-left-wall|house-right-wall|house-back-wall|house-entry-wall-left|house-entry-wall-right)$/;
  root.userData.coastlineColliders = (root.userData.coastlineColliders || []).filter(collider => structuralCollision.test(collider.name));
  for (const child of root.children) {
    if (child.name?.startsWith('house-')) child.visible = false;
  }
}

export async function attachOptimizedHomeInterior(THREE, root, placement) {
  if (root.userData.coastlineOptimizedHomeInteriorLoading || root.userData.coastlineOptimizedHomeInteriorLoaded) return;
  root.userData.coastlineOptimizedHomeInteriorLoading = true;
  report('Loading furnished home interior…');
  try {
    const buffer = await fetchAndReconstructGlb();
    // Load the parser only on house entry so a CDN hiccup cannot prevent the city/game from starting.
    const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().parseAsync(buffer, './assets/vehicles/');
    const model = gltf.scene;
    const { size, uniformScale } = normalizeInteriorModel(THREE, model, placement);
    hideSupersededProceduralFurniture(root);
    model.name = 'coastline-optimized-home-interior';
    root.add(model);
    root.userData.coastlineOptimizedHomeInteriorRoot = model;
    root.userData.coastlineOptimizedHomeInteriorLoaded = true;
    root.userData.coastlineOptimizedHomeInterior = {
      bytes: EXPECTED_BYTES,
      sha256: EXPECTED_SHA256,
      meshes: 241,
      dimensions: { x: size.x, y: size.y, z: size.z },
      uniformScale,
      license: 'Visthétique, CC BY 4.0'
    };
    report('Furnished home interior loaded');
  } catch (error) {
    root.userData.coastlineOptimizedHomeInteriorError = String(error?.message || error);
    console.error('[Coastline] Optimized home interior failed; procedural interior retained.', error);
    report('Home interior model failed to load; using built-in interior');
  } finally {
    root.userData.coastlineOptimizedHomeInteriorLoading = false;
  }
}
