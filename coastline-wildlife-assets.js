import { COASTLINE_CAVE_THRESHOLD } from './coastline-island-regions.js';

/**
 * Lazy animal/cave visual assets for Coastline.
 *
 * The movement/collision system remains authoritative. Animal roots are registered
 * as rideable vehicles so the existing proximity Use action, steering, safe-exit,
 * world ownership and vehicle policy continue to apply.
 */
export const COASTLINE_WILDLIFE_COUNTS = Object.freeze({
  cityHorse: 3,
  cityOstrich: 3,
  perIsland: 1,
});

export const COASTLINE_WILDLIFE_ASSETS = Object.freeze({
  cave: Object.freeze({
    local: './assets/cave-entrance.glb',
    source: 'https://grab3d.com/dl/cave-entrance/cave-entrance.glb',
    license: 'CC0',
  }),
  horse: Object.freeze({
    local: './assets/animals/warhorse-lite.glb',
    license: 'Warhorse Lite Free Licence — embedded in the game product, not redistributed as a standalone model',
  }),
  ostrich: Object.freeze({
    local: './assets/animals/ostrich.glb',
    source: 'https://www.innerscene.com/api/library/ostrich-a92752fd/download',
    license: 'CC0',
  }),
});

export function shouldUpdateCoastlineWildlife(instanceWorldId, activeWorldId, mountedInActiveWorld = false) {
  if (!activeWorldId) return true;
  return instanceWorldId === activeWorldId || mountedInActiveWorld === true;
}

export function getCoastlineWildlifePlacementPlan(worldId) {
  if (worldId === 'city') {
    return [
      { kind: 'horse', x: -645, z: -642, key: 'city-horse-1' },
      { kind: 'horse', x: -520, z: 642, key: 'city-horse-2' },
      { kind: 'horse', x: 646, z: 642, key: 'city-horse-3' },
      { kind: 'ostrich', x: -645, z: 635, key: 'city-ostrich-1' },
      { kind: 'ostrich', x: 645, z: -642, key: 'city-ostrich-2' },
      { kind: 'ostrich', x: 530, z: -640, key: 'city-ostrich-3' },
    ];
  }
  if (worldId === 'island') return [{ kind: 'ostrich', x: 552, z: 555, key: 'residential-ostrich-1' }];
  if (worldId === 'waterfront') return [{ kind: 'horse', x: 546, z: 465, key: 'waterfront-horse-1' }];
  if (worldId === 'port') return [{ kind: 'ostrich', x: 550, z: 550, key: 'port-ostrich-1' }];
  return [];
}

export function getCoastlineTargetScale(kind, modelHeight) {
  if (!Number.isFinite(modelHeight) || modelHeight <= 0) return 1;
  const targetHeight = kind === 'cave' ? 5.35 : kind === 'horse' ? 2.05 : 2.25;
  return targetHeight / modelHeight;
}

export function isCoastlineCaveThreshold({ worldId, mode, x, z, threshold = COASTLINE_CAVE_THRESHOLD }) {
  if (worldId !== 'waterfront' || mode !== 'walk' || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  return Math.hypot(x - threshold.x, z - threshold.z) <= threshold.radius;
}

const LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';
const BUFFER_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js';

async function loadGLTF(THREE, kind) {
  const [{ GLTFLoader }, skeletonUtils, geometryUtils] = await Promise.all([
    import(LOADER_URL),
    import(SKELETON_UTILS_URL).catch(() => ({})),
    import(BUFFER_UTILS_URL).catch(() => ({})),
  ]);
  const loader = new GLTFLoader();
  const parse = buffer => new Promise((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });
  const config = COASTLINE_WILDLIFE_ASSETS[kind];
  const packagedAssets = typeof window !== 'undefined' && window.__COASTLINE_PACKAGED_ASSETS__ === true;

  // The itch builder extracts this licensed model to a standalone GLB. Development
  // and Vercel preview use the committed archive instead, so never probe a path
  // that is intentionally absent from those environments (the 404 pollutes console checks).
  if (kind === 'horse') {
    // The licensed GLB is supplied only by a local/release build. Public repository
    // previews and CI deliberately use the procedural fallback and never request a missing URL.
    const horseAssetAvailable = typeof window !== 'undefined'
      && window.__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true;
    if (horseAssetAvailable) {
      try {
        const response = await fetch(config.local, { mode: 'same-origin', cache: 'force-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + config.local);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 20 || new DataView(buffer).getUint32(0, true) !== 0x46546c67) {
          throw new Error('Not a binary glTF: ' + config.local);
        }
        return { gltf: await parse(buffer), skeletonUtils, geometryUtils, source: config.local };
      } catch (error) {
        console.warn('[Coastline] Local Warhorse GLB unavailable; keeping the lightweight visual fallback.', error);
      }
    }
    return { gltf: null, skeletonUtils, geometryUtils, source: 'fallback' };
  }

  const urls = config.source ? [config.local, config.source] : [config.local];
  for (const url of urls) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 20 || new DataView(buffer).getUint32(0, true) !== 0x46546c67) throw new Error('Not a binary glTF: ' + url);
      return { gltf: await parse(buffer), skeletonUtils, geometryUtils, source: url };
    } catch (error) {
      if (url === urls[urls.length - 1]) console.warn('[Coastline] Optional ' + kind + ' asset unavailable; keeping the lightweight visual fallback.', error);
    }
  }
  return { gltf: null, skeletonUtils, geometryUtils, source: 'fallback' };
}

function makeFallbackHorse(THREE) {
  const g = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x5d3725, roughness: .92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b211d, roughness: .95 });
  const mane = new THREE.MeshStandardMaterial({ color: 0x241915, roughness: .98 });
  const add = (geo, mat, position, scale = null, rotation = null) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  };
  add(new THREE.CapsuleGeometry(.42, .7, 4, 8), brown, [0, 1.08, -.03], [1, 1, 1], [Math.PI / 2, 0, 0]);
  add(new THREE.CapsuleGeometry(.17, .48, 3, 7), brown, [0, 1.52, .42], [1, 1, 1], [.18, 0, -.2]);
  add(new THREE.SphereGeometry(.24, 9, 7), brown, [0, 1.9, .62], [1, .8, 1.15]);
  add(new THREE.ConeGeometry(.12, .56, 6), mane, [0, 1.53, .29], [1, 1, 1], [Math.PI / 2, 0, 0]);
  for (const x of [-.25, .25]) for (const z of [-.29, .28]) {
    add(new THREE.CylinderGeometry(.075, .095, .78, 6), brown, [x, .42, z]);
    add(new THREE.ConeGeometry(.10, .20, 5), dark, [x, .10, z], [1, .65, 1]);
  }
  const seat = new THREE.Group(); seat.name = 'saddle_socket'; seat.position.set(0, 1.55, -.03); g.add(seat);
  g.userData.coastlineFallback = true;
  return { scene: g, animations: [], source: 'procedural-fallback' };
}

function makeFallbackOstrich(THREE) {
  const g = new THREE.Group();
  const plumage = new THREE.MeshStandardMaterial({ color: 0x24252a, roughness: .96 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd5d0c5, roughness: .94 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x96756b, roughness: .9 });
  const beak = new THREE.MeshStandardMaterial({ color: 0xd1a353, roughness: .85 });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  add(new THREE.SphereGeometry(.47, 9, 7), plumage, 0, 1.04, 0, 1.2, .94, .82);
  add(new THREE.CapsuleGeometry(.105, .67, 3, 6), skin, .34, 1.68, .05, 1, 1.25, 1,);
  add(new THREE.SphereGeometry(.14, 8, 6), skin, .40, 2.20, .07, 1.05, .95, 1.12);
  add(new THREE.ConeGeometry(.07, .22, 5), beak, .50, 2.20, .13, 1, 1, 1, [0,0,-Math.PI/2]);
  add(new THREE.SphereGeometry(.035, 6, 4), white, .43, 2.24, .18, 1, 1, 1);
  for (const z of [-.22, .22]) {
    add(new THREE.CylinderGeometry(.045,.065,.77,5), skin, -.02, .42, z);
    add(new THREE.CylinderGeometry(.035,.055,.24,5), skin, .02, .14, z+.04);
    add(new THREE.BoxGeometry(.22,.045,.15), skin, .12, .035, z+.04);
  }
  const seat = new THREE.Group(); seat.name = 'saddle_socket'; seat.position.set(0,1.35,-.03); g.add(seat);
  g.userData.coastlineFallback = true;
  return { scene: g, animations: [], source: 'procedural-fallback' };
}

function cloneAsset(THREE, template, skeletonUtils) {
  if (!template) return null;
  try {
    if (skeletonUtils?.clone) return skeletonUtils.clone(template);
    return template.clone(true);
  } catch { return template.clone(true); }
}

export function createCoastlineWildlifeAssets({ THREE, vehicles, wildlife, worldModel, groundY, avatar = null, isPlaceBlocked = () => false } = {}) {
  if (!THREE || !Array.isArray(vehicles) || !Array.isArray(wildlife)) throw new TypeError('THREE, vehicles and wildlife are required');
  const attached = new Map();
  const templates = { horse: null, ostrich: null, cave: null };
  const diagnostics = {
    initialized: false,
    loaded: { horse: false, ostrich: false, cave: false },
    source: { horse: 'pending', ostrich: 'pending', cave: 'pending' },
    errors: [],
    activeWorldId: null,
    lastUpdated: 0,
    skippedInactive: 0,
  };
  let templatesPromise = null;

  const boundsScale = (model, kind) => {
    const box = new THREE.Box3().setFromObject(model);
    const height = Math.max(.001, box.max.y - box.min.y);
    const scalar = getCoastlineTargetScale(kind, height);
    model.scale.multiplyScalar(scalar);
    model.position.y -= box.min.y * scalar;
    return { scale: scalar, height: height * scalar };
  };

  const makeAnimal = (root, worldId, spec, index) => {
    const g = new THREE.Group();
    g.name = 'coastline-' + spec.key;
    g.position.set(spec.x, Number.isFinite(root.userData?.coastlineGroundY) ? root.userData.coastlineGroundY : groundY(spec.x, spec.z), spec.z);
    g.rotation.y = worldId === 'city' ? (index * 1.17) % (Math.PI * 2) : Math.PI;
    g.userData.coastlineWildlife = true;
    g.userData.coastlineWorldId = worldId;
    const visual = new THREE.Group(); visual.name = 'coastline-' + spec.kind + '-visual';
    const fallback = spec.kind === 'horse' ? makeFallbackHorse(THREE) : makeFallbackOstrich(THREE);
    const fallbackScene = fallback.scene;
    if (spec.kind === 'ostrich') fallbackScene.rotation.y = -Math.PI / 2;
    visual.add(fallbackScene); g.add(visual); root.add(g);
    const seat = fallbackScene.getObjectByName('saddle_socket') || new THREE.Group();
    seat.name = 'saddle_socket';
    if (!seat.parent) { seat.position.set(0, spec.kind === 'horse' ? 1.50 : 1.30, -.03); visual.add(seat); }
    const v = {
      kind: spec.kind,
      mountKind: spec.kind,
      isMount: true,
      mountId: spec.key,
      id: spec.key,
      g, x: spec.x, z: spec.z, heading: g.rotation.y, speed: 0,
      parked: true, occupied: false, drivable: true, ai: false,
      collisionRadius: spec.kind === 'horse' ? 1.15 : 1.0,
      homeX: spec.x, homeZ: spec.z, phase: index * 1.71 + (worldId.length * .3),
      roam: worldId === 'city' ? 6 : 3.8,
      speedFactor: spec.kind === 'horse' ? .75 : 1.0,
      animationMixer: null, animationActions: {}, activeAction: null,
      mountSocket: seat, visual, templateSource: 'fallback',
      worldId, worldRoot: root, ownsGeometry: false,
    };
    vehicles.push(v); wildlife.push(v);
    return v;
  };

  const validPosition = (root, worldId, x, z, radius = 2.0) => {
    const colliders = root.userData?.coastlineColliders || [];
    if (colliders.some(c => Math.abs(x - c.x) <= (c.w || 0) / 2 + radius && Math.abs(z - c.z) <= (c.d || 0) / 2 + radius)) return false;
    if (worldId === 'city') {
      if (Math.abs(x) > 675 || Math.abs(z) > 675) return false;
      if (worldModel?.regionAt?.(x, z) !== 'countryside') return false;
      if (worldModel?.isRoadCorridor?.(x, z, 28)) return false;
    }
    return !isPlaceBlocked(x, z, radius, root, worldId);
  };

  const findOpenCityPosition = (root, spec, index) => {
    if (validPosition(root, 'city', spec.x, spec.z)) return { ...spec };
    const seedX = spec.x, seedZ = spec.z;
    for (let ring = 1; ring <= 8; ring++) {
      for (let a = 0; a < 16; a++) {
        const angle = a * Math.PI / 8 + index * .71;
        const x = seedX + Math.cos(angle) * ring * 11;
        const z = seedZ + Math.sin(angle) * ring * 11;
        if (validPosition(root, 'city', x, z)) return { ...spec, x, z };
      }
    }
    for (let x = -665; x <= 665; x += 37) for (let z = -665; z <= 665; z += 41) {
      if (validPosition(root, 'city', x, z)) return { ...spec, x, z };
    }
    return { ...spec };
  };

  const getTemplate = async kind => {
    if (templates[kind]) return templates[kind];
    if (kind === 'horse' || kind === 'ostrich') {
      const result = await loadGLTF(THREE, kind);
      diagnostics.source[kind] = result.source;
      if (result.gltf?.scene) {
        templates[kind] = { scene: result.gltf.scene, animations: result.gltf.animations || [], skeletonUtils: result.skeletonUtils, geometryUtils: result.geometryUtils, source: result.source };
        diagnostics.loaded[kind] = true;
        return templates[kind];
      }
      const fallback = kind === 'horse' ? makeFallbackHorse(THREE) : makeFallbackOstrich(THREE);
      templates[kind] = { ...fallback, skeletonUtils: result.skeletonUtils };
      diagnostics.source[kind] = fallback.source;
      return templates[kind];
    }
    if (kind === 'cave') {
      const result = await loadGLTF(THREE, 'cave');
      diagnostics.source.cave = result.source;
      if (result.gltf?.scene) {
        templates.cave = { scene: result.gltf.scene, animations: [], skeletonUtils: result.skeletonUtils, source: result.source };
        diagnostics.loaded.cave = true;
      } else templates.cave = null;
      return templates.cave;
    }
    return null;
  };

  const selectAnimation = (v, name) => {
    if (!v.animationMixer || !v.animationActions[name] || v.activeAction === name) return;
    const next = v.animationActions[name];
    next.reset().play();
    if (v.activeAction && v.animationActions[v.activeAction]) v.animationActions[v.activeAction].crossFadeTo(next, .18, true);
    v.activeAction = name;
  };

  const mergeStaticOstrichMeshes = (model, geometryUtils) => {
    if (!geometryUtils?.mergeGeometries || !model) return;
    model.updateMatrixWorld(true);
    const inverseRoot = model.matrixWorld.clone().invert();
    const groups = new Map();
    const removals = [];
    model.traverse(node => {
      if (!node.isMesh || node.isSkinnedMesh || Array.isArray(node.material) || !node.material || !node.geometry?.attributes?.position) return;
      const relative = inverseRoot.clone().multiply(node.matrixWorld);
      const geometry = node.geometry.clone();
      geometry.applyMatrix4(relative);
      // Group by material and attribute layout; keeping groups separate avoids
      // expensive or lossy conversions when a source mesh has unique attributes.
      const layout = Object.keys(geometry.attributes).sort().join(',');
      const key = node.material.uuid + '|' + layout + '|' + Boolean(geometry.index);
      if (!groups.has(key)) groups.set(key, { material: node.material, geometries: [] });
      groups.get(key).geometries.push(geometry);
      removals.push(node);
    });
    if (!removals.length) return;
    const mergedMeshes = [];
    for (const { material, geometries } of groups.values()) {
      if (geometries.length === 1) {
        const mesh = new THREE.Mesh(geometries[0], material);
        mesh.userData.coastlineSharedWildlifeAsset = true;
        mesh.userData.coastlineOwnedGeometry = true;
        mesh.castShadow = true; mesh.receiveShadow = true;
        mergedMeshes.push(mesh);
        continue;
      }
      let merged = null;
      try { merged = geometryUtils.mergeGeometries(geometries, false); } catch {}
      if (!merged) {
        // Preserve geometry if the source format has an unsupported attribute layout.
        for (const geometry of geometries) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.coastlineSharedWildlifeAsset = true;
          mesh.userData.coastlineOwnedGeometry = true;
          mesh.castShadow = true; mesh.receiveShadow = true;
          mergedMeshes.push(mesh);
        }
        continue;
      }
      const mesh = new THREE.Mesh(merged, material);
      mesh.userData.coastlineSharedWildlifeAsset = true;
      mesh.userData.coastlineOwnedGeometry = true;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mergedMeshes.push(mesh);
      for (const geometry of geometries) geometry.dispose();
    }
    for (const node of removals) node.parent?.remove(node);
    for (const mesh of mergedMeshes) model.add(mesh);
    model.updateMatrixWorld(true);
  };

  const installTemplate = (v, template) => {
    if (!template?.scene || !v?.visual) return false;
    const riderWasAttached = Boolean(v.occupied && avatar && v.mountSocket?.children.includes(avatar));
    const model = cloneAsset(THREE, template.scene, template.skeletonUtils);
    if (!model) return false;
    model.name = 'coastline-' + v.kind + '-glb';
    const localBase = new THREE.Group();
    localBase.name = 'coastline-' + v.kind + '-normalized';
    boundsScale(model, v.kind);
    // The uploaded ostrich faces along local +X; align its beak with Coastline's +Z travel axis.
    if (v.kind === 'ostrich') model.rotation.y += -Math.PI / 2;
    if (v.kind === 'ostrich') mergeStaticOstrichMeshes(model, template.geometryUtils);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true; node.receiveShadow = true;
      // Shared template geometry/textures are immutable; do not dispose shared resources on world unload.
      node.userData.coastlineSharedWildlifeAsset = true;
    });
    localBase.add(model);
    for (const child of [...v.visual.children]) v.visual.remove(child);
    v.visual.add(localBase);
    v.mountSocket = model.getObjectByName('saddle_socket') || null;
    if (!v.mountSocket) {
      const seat = new THREE.Group(); seat.name = 'saddle_socket';
      seat.position.set(0, v.kind === 'horse' ? 1.45 : 1.32, -.02);
      localBase.add(seat); v.mountSocket = seat;
    }
    if (riderWasAttached && avatar) { v.mountSocket.add(avatar); avatar.position.set(0,0,0); avatar.rotation.set(0,0,0); }
    if (template.animations?.length) {
      v.animationMixer = new THREE.AnimationMixer(model);
      for (const clip of template.animations) {
        const action = v.animationMixer.clipAction(clip);
        const key = String(clip.name || '').toLowerCase();
        if (key.includes('idle')) v.animationActions.idle = action;
        else if (key.includes('walk')) v.animationActions.walk = action;
        else if (key.includes('canter') || key.includes('run')) v.animationActions.run = action;
        else if (key.includes('rear')) v.animationActions.rear = action;
        else if (!v.animationActions.idle) v.animationActions.idle = action;
      }
      selectAnimation(v, 'idle');
    }
    v.templateSource = template.source;
    return true;
  };

  const loadCaveIntoRoot = async root => {
    if (!root || root.userData?.coastlineCaveGLBAttempted) return false;
    root.userData.coastlineCaveGLBAttempted = true;
    const mouth = root.getObjectByName('coastline-electric-lemonade-cave-mouth');
    if (!mouth) return false;
    const template = await getTemplate('cave');
    if (!template?.scene) return false;
    const cave = cloneAsset(THREE, template.scene, template.skeletonUtils);
    if (!cave) return false;
    cave.name = 'coastline-waterfront-cave-entrance-glb';
    boundsScale(cave, 'cave');
    // The cave's portal faces the approach (+Z); its back nests into the authored mountain.
    cave.position.x = 520;
    cave.position.z = 541.5;
    cave.position.y = Number.isFinite(root.userData?.coastlineGroundY) ? root.userData.coastlineGroundY : groundY(500, 500);
    cave.rotation.y = Math.PI;
    cave.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; node.userData.coastlineSharedWildlifeAsset = true; } });
    for (const child of mouth.children) child.visible = false;
    mouth.add(cave);
    root.userData.coastlineCaveGLB = cave;
    return true;
  };

  const attachWorld = (root, worldId) => {
    if (!root || !['city', 'island', 'waterfront', 'port'].includes(worldId)) return [];
    const previous = attached.get(root);
    if (previous) return previous;
    const basePlan = getCoastlineWildlifePlacementPlan(worldId);
    const placed = worldId === 'city'
      ? basePlan.map((spec, index) => findOpenCityPosition(root, spec, index))
      : basePlan.map((spec, index) => {
          const safe = validPosition(root, worldId, spec.x, spec.z, 2.0);
          if (safe) return { ...spec };
          const candidates = worldId === 'waterfront'
            ? [{ x: 545, z: 465 }, { x: 552, z: 476 }, { x: 540, z: 460 }]
            : worldId === 'port'
              ? [{ x: 550, z: 550 }, { x: 565, z: 540 }, { x: 540, z: 550 }]
              : [{ x: 552, z: 555 }, { x: 545, z: 552 }, { x: 555, z: 545 }];
          const alternative = candidates.find(p => validPosition(root, worldId, p.x, p.z, 2.0));
          return { ...spec, ...(alternative || {}) };
        });
    const records = placed.map((spec, index) => makeAnimal(root, worldId, spec, index));
    attached.set(root, records);
    if (worldId === 'waterfront') void loadCaveIntoRoot(root);
    return records;
  };

  const disposeWildlifeInstance = instanceRoot => instanceRoot?.traverse(node => {
    if (node.geometry && (!node.userData?.coastlineSharedWildlifeAsset || node.userData?.coastlineOwnedGeometry)) node.geometry.dispose();
    if (node.userData?.coastlineSharedWildlifeAsset) return;
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const material of materials) material?.dispose?.();
  });

  const detachWorld = root => {
    const records = attached.get(root);
    if (!records) return;
    for (const v of records) {
      // The CTM may have reparented the currently ridden mount into the next world
      // before the old world unloads. Preserve that mount and re-register its ownership.
      if (v.g?.parent && v.g.parent !== root && v.occupied) {
        const destinationRoot = v.g.parent;
        const destinationId = window.__coastlineActiveWorldId || destinationRoot.userData?.coastlineRegionId || 'city';
        v.worldRoot = destinationRoot;
        v.worldId = destinationId;
        v.homeX = v.x; v.homeZ = v.z;
        const destinationRecords = attached.get(destinationRoot);
        if (destinationRecords && !destinationRecords.includes(v)) destinationRecords.push(v);
        continue;
      }
      disposeWildlifeInstance(v.g);
      if (v.g?.parent) v.g.parent.remove(v.g);
      const vi = vehicles.indexOf(v); if (vi >= 0) vehicles.splice(vi, 1);
      const wi = wildlife.indexOf(v); if (wi >= 0) wildlife.splice(wi, 1);
    }
    attached.delete(root);
  };

  const initialize = async () => {
    if (templatesPromise) return templatesPromise;
    templatesPromise = Promise.allSettled([getTemplate('horse'), getTemplate('ostrich')]).then(() => {
      for (const records of attached.values()) {
        for (const v of records) {
          const template = templates[v.kind];
          if (template) installTemplate(v, template);
        }
      }
      diagnostics.initialized = true;
      for (const [root] of attached) if (root.userData?.coastlineRegionId === 'waterfront') void loadCaveIntoRoot(root);
      return getState();
    }).catch(error => {
      diagnostics.errors.push(String(error?.message || error));
      diagnostics.initialized = true;
      return getState();
    });
    return templatesPromise;
  };

  const update = (dt = 0, now = performance.now()) => {
    const activeWorldId = typeof window !== 'undefined' ? window.__coastlineActiveWorldId : null;
    const activeRoot = typeof window !== 'undefined' ? window.__coastlineActiveWorldRoot : null;
    let updated = 0, skippedInactive = 0;
    for (const v of wildlife) {
      const mountedInActiveWorld = Boolean(v.occupied && activeRoot && v.g?.parent === activeRoot);
      if (!shouldUpdateCoastlineWildlife(v.worldId, activeWorldId, mountedInActiveWorld)) { skippedInactive++; continue; }
      updated++;
      if (v.animationMixer) {
        if (v.occupied) selectAnimation(v, Math.abs(v.speed || 0) > 7 ? 'run' : Math.abs(v.speed || 0) > .4 ? 'walk' : 'idle');
        else selectAnimation(v, 'walk');
        v.animationMixer.update(dt);
      }
      if (v.occupied || v.g?.parent !== v.worldRoot) continue;
      v.phase += dt * (.42 + (v.kind === 'ostrich' ? .16 : 0));
      const tx = v.homeX + Math.sin(v.phase) * v.roam;
      const tz = v.homeZ + Math.cos(v.phase * .73) * v.roam;
      if (validPosition(v.worldRoot, v.worldId, tx, tz, v.collisionRadius || 1)) {
        v.x += (tx - v.x) * dt * .15;
        v.z += (tz - v.z) * dt * .15;
      }
      const floor = Number.isFinite(v.worldRoot?.userData?.coastlineGroundY) && v.worldId !== 'city'
        ? v.worldRoot.userData.coastlineGroundY
        : groundY(v.x, v.z);
      v.g.position.set(v.x, floor + (v.kind === 'ostrich' ? Math.abs(Math.sin(v.phase * 4)) * .035 : 0), v.z);
      v.g.rotation.y = Math.atan2(tx - v.x, tz - v.z);
    }
    diagnostics.activeWorldId = activeWorldId ?? null;
    diagnostics.lastUpdated = updated;
    diagnostics.skippedInactive = skippedInactive;
  };

  const updateMountAnimation = (v, dt) => {
    if (!v) return;
    if (v.animationMixer) {
      selectAnimation(v, Math.abs(v.speed || 0) > 7 ? 'run' : Math.abs(v.speed || 0) > .4 ? 'walk' : 'idle');
      v.animationMixer.update(dt);
      return;
    }
    // Do not apply Warhorse clips to the ostrich: the rigs are unrelated. When the
    // ostrich export has no compatible clips, animate its own named bones procedurally.
    const model = v.visual;
    if (v.kind !== 'ostrich' || !model?.traverse) return;
    v.proceduralGaitPhase = (v.proceduralGaitPhase || 0) + dt * (Math.abs(v.speed || 0) > 7 ? 10 : Math.abs(v.speed || 0) > .4 ? 6 : 1.2);
    const moving = Math.abs(v.speed || 0) > .4;
    model.traverse(node => {
      if (!node.isBone) return;
      const name = String(node.name || '').toLowerCase();
      if (!/(leg|thigh|shin|foot|neck|head)/.test(name)) return;
      const base = node.userData.coastlineProceduralBaseRotation || (node.userData.coastlineProceduralBaseRotation = node.rotation.clone());
      node.rotation.copy(base);
      if (!moving) return;
      const side = /left|\.l\b|_l\b/.test(name) ? 1 : /right|\.r\b|_r\b/.test(name) ? -1 : (name.length % 2 ? 1 : -1);
      const stride = Math.sin(v.proceduralGaitPhase * 2 + side * Math.PI / 2);
      if (/(leg|thigh|shin|foot)/.test(name)) node.rotation.x = base.x + stride * .38;
      else if (/neck/.test(name)) node.rotation.x = base.x + Math.sin(v.proceduralGaitPhase) * .035;
      else if (/head/.test(name)) node.rotation.x = base.x + Math.sin(v.proceduralGaitPhase * .5) * .025;
    });
  };

  const getState = () => ({
    initialized: diagnostics.initialized,
    loaded: { ...diagnostics.loaded },
    source: { ...diagnostics.source },
    errors: [...diagnostics.errors],
    activeWorldId: diagnostics.activeWorldId,
    lastUpdated: diagnostics.lastUpdated,
    skippedInactive: diagnostics.skippedInactive,
    cityCount: attached.get(typeof window !== 'undefined' && window.__coastlineActiveWorldRoot?.name === 'coastline-city-root' ? window.__coastlineActiveWorldRoot : null)?.length || 0,
    totalInstances: wildlife.length,
    instances: wildlife.map(v => ({ kind: v.kind, id: v.id, worldId: v.worldId, source: v.templateSource, x: v.x, z: v.z, rideable: v.drivable !== false })),
  });

  return Object.freeze({ attachWorld, detachWorld, initialize, update, updateMountAnimation, getState });
}
