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
  // The source is a long, narrow furnished apartment. Rotate its long axis into
  // the house depth and keep its proportions instead of stretching the furniture.
  model.rotation.y = Math.PI / 2;
  model.scale.setScalar(0.96);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x + size.y + size.z) || size.x < 1 || size.z < 1 || size.y < 0.5) {
    throw new Error('House GLB has implausible dimensions');
  }
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
  return { size, bounds };
}

function hideSupersededProceduralFurniture(root) {
  const keepPrefixes = [
    'house-interior-floor', 'house-left-wall', 'house-right-wall', 'house-back-wall',
    'house-entry-', 'house-ceiling', 'house-window-'
  ];
  for (const child of root.children) {
    if (!child.name?.startsWith('house-')) continue;
    if (keepPrefixes.some(prefix => child.name.startsWith(prefix))) continue;
    child.visible = false;
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
    const { size } = normalizeInteriorModel(THREE, model, placement);
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
