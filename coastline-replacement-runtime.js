/*
 * Coastline replacement runtime integration.
 *
 * This module is loaded by the existing Electric Lemonade module so the
 * replacement fixes can attach to the already-running game without duplicating
 * vehicle physics, wardrobe, NPC, or CTM systems.
 */
function installReplacementRuntimeCorrections() {
  if (typeof window === 'undefined' || window.__coastlineReplacementRuntimeInstalled) return;
  window.__coastlineReplacementRuntimeInstalled = true;

  const patchVehicleVisuals = () => {
    // Keep the original vehicle model orientation and camera-follow relationship.
    // Steering correction is intentionally out of scope for this replacement PR.
    return;
  };

  const patchAuthoredHair = () => {
    const root = window.__coastlineAvatar?.userData?.cozyActor?.root;
    if (!root?.traverse) return;
    root.traverse(node => {
      if (!node.isMesh || node.userData.coastlineAuthoredHairCorrected) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (!materials.some(material => String(material?.name || '').toLowerCase() === 'hair')) return;
      // Expand the authored hair mesh itself so it covers the measured scalp bounds.
      // No cap/sphere replacement is created, preserving skinning and hair controls.
      node.scale.x *= 1.98;
      node.scale.z *= 1.98;
      node.scale.y *= 1.35;
      node.userData.coastlineAuthoredHairCorrected = true;
      node.userData.coastlineHairCorrection = { authored: true, xz: 1.98, y: 1.35 };
    });
  };

  let caveReplacementPromise = null;
  const loadReplacementCave = async root => {
    if (!root || root.userData?.coastlineReplacementCaveLoaded || root.userData?.coastlineReplacementCaveLoading) return;
    root.userData.coastlineReplacementCaveLoading = true;
    try {
      const mouth = root.getObjectByName('coastline-electric-lemonade-cave-mouth');
      if (!mouth) return;
      // The shared anchor is intentionally empty until the approved three-cave
      // GLB is attached. Legacy mountain/cave visuals are no longer fallbacks.
      for (const child of [...mouth.children]) {
        if (child.name !== 'coastline-waterfront-cave-replacement-glb') child.visible = false;
      }

      if (!caveReplacementPromise) {
        caveReplacementPromise = (async () => {
          const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js');
          const loader = new GLTFLoader();
          // The canonical repository/package location is assets/. Resolve from the
          // document base so the same asset works from game-v3.html, index.html,
          // Vercel subpaths, and the packaged itch build without moving the GLB.
          const assetUrl = new URL('assets/3_evil_rock_mountains_with_cave_stylized.glb', document.baseURI).href;
          const response = await fetch(assetUrl, { mode: 'same-origin', cache: 'force-cache' });
          if (!response.ok) throw new Error('HTTP ' + response.status + ' for replacement cave GLB at ' + assetUrl);
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength < 20 || new DataView(buffer).getUint32(0, true) !== 0x46546c67) throw new Error('Replacement cave is not a binary glTF');
          return new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
        })();
      }
      const gltf = await caveReplacementPromise;
      const cave = gltf?.scene?.clone?.(true);
      if (!cave) throw new Error('Replacement cave GLB has no scene');
      cave.name = 'coastline-waterfront-cave-replacement-glb';
      // glTF is Y-up. Point the authored cave mouth toward the lemonade stand side
      // (-Z), matching the existing CTM threshold at x=520,z=542.5.
      cave.rotation.y = Math.PI;
      const THREE = window.__coastlineThree;
      if (!THREE) throw new Error('Three.js runtime unavailable for cave replacement');
      cave.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(cave);
      const sourceHeight = Math.max(0.001, sourceBounds.max.y - sourceBounds.min.y);
      const targetHeight = 12;
      const scale = targetHeight / sourceHeight;
      cave.scale.multiplyScalar(scale);
      cave.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(cave);
      const centerX = (scaledBounds.min.x + scaledBounds.max.x) / 2;
      const centerZ = (scaledBounds.min.z + scaledBounds.max.z) / 2;
      const floorY = Number.isFinite(root.userData?.coastlineGroundY) ? root.userData.coastlineGroundY : 6;
      cave.position.x += 520 - centerX;
      cave.position.z += 545 - centerZ;
      cave.position.y += floorY - scaledBounds.min.y;
      cave.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.userData.coastlineReplacementCave = true;
      });
      mouth.add(cave);
      root.userData.coastlineReplacementCaveLoaded = true;
      root.userData.coastlineReplacementCave = cave;
    } catch (error) {
      root.userData.coastlineReplacementCaveError = String(error?.message || error);
      console.warn('[Coastline] Approved three-cave GLB unavailable; no legacy cave fallback will be shown.', error);
      caveReplacementPromise = null;
    } finally {
      delete root.userData.coastlineReplacementCaveLoading;
    }
  };

  const patchCaveAndVendor = () => {
    const root = window.__coastlineRegionRoot;
    if (!root || window.__coastlineActiveWorldId !== 'waterfront') return;
    void loadReplacementCave(root);

    const actor = root.userData?.coastlineLemonadeVendorActor || window.__coastlineWaterfrontVendorActor;
    if (actor?.root) {
      actor.root.userData.coastlineLivingWorldVendor = true;
      actor.root.userData.coastlineWorldId = 'waterfront';
      actor.root.userData.coastlineVendorRole = 'electric-lemonade';
      actor.root.visible = true;
      actor.root.position.x = 520;
      actor.root.position.z = 528.8;
      actor.root.rotation.y = Math.PI;
      if (actor.mixer) actor.mixer.update(1 / 60);
      if (actor.root.parent !== root) root.add(actor.root);
      window.__coastlineWaterfrontVendorActor = actor;
    }
  };

  window.__coastlineEnsureReplacementCave = root => loadReplacementCave(root || window.__coastlineRegionRoot);

  window.__coastlineReplacementVisualPatch = () => {
    patchVehicleVisuals();
    patchAuthoredHair();
    patchCaveAndVendor();
    let authoredHairCorrected = false;
    window.__coastlineAvatar?.userData?.cozyActor?.root?.traverse?.(node => { if (node.userData?.coastlineAuthoredHairCorrected) authoredHairCorrected = true; });
    const root = window.__coastlineRegionRoot;
    return {
      vehicles: Array.isArray(window.__coastlineVehicleRegistry) ? window.__coastlineVehicleRegistry.filter(v => v?.g?.userData?.coastlineRgsdevForwardCorrection).length : 0,
      authoredHairCorrected,
      lemonadeVendorLivingWorld: Boolean(window.__coastlineWaterfrontVendorActor?.root?.userData?.coastlineLivingWorldVendor),
      replacementCaveLoaded: Boolean(root?.userData?.coastlineReplacementCaveLoaded),
      replacementCaveError: root?.userData?.coastlineReplacementCaveError || null,
    };
  };

  window.addEventListener('coastline:wardrobe-applied', patchAuthoredHair);
  let attempts = 0;
  const timer = setInterval(() => {
    patchVehicleVisuals();
    patchAuthoredHair();
    patchCaveAndVendor();
    if (++attempts >= 240) clearInterval(timer);
  }, 250);

  // Behavioral probe retained for diagnostics only; it does not alter steering.
  window.__coastlineReplacementSteeringProbe = (key, reverse = false, frames = 30) => {
    const api = window.__coastlineTest;
    const vehicles = window.__coastlineVehicleRegistry;
    const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v?.kind === 'car') : null;
    const THREE = window.__coastlineThree;
    if (!api || !vehicle || !THREE) throw new Error('Coastline runtime steering probe unavailable');
    const player = window.__coastlinePlayer;
    const before = { mode: player?.mode, vehicle: player?.vehicle, x: vehicle.x, z: vehicle.z, heading: vehicle.heading, speed: vehicle.speed, px: player?.x, pz: player?.z };
    try {
      api.setVehiclePosition(0, 0, 0);
      vehicle.speed = reverse ? -12 : 12;
      api.keyDown(key);
      api.advanceTestFrame(1 / 60, frames);
      api.keyUp(key);
      const q = vehicle.g?.getWorldQuaternion?.(new THREE.Quaternion());
      const nose = q ? new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize() : null;
      return { key, reverse, displacement: { x: vehicle.x, z: vehicle.z }, heading: vehicle.heading, visualNose: nose ? { x: nose.x, z: nose.z } : null };
    } finally {
      api.keyUp(key);
      vehicle.x = before.x;
      vehicle.z = before.z;
      vehicle.heading = before.heading;
      vehicle.speed = before.speed;
      if (vehicle.g) vehicle.g.rotation.y = before.heading;
      if (player) { player.mode = before.mode; player.vehicle = before.vehicle; player.x = before.px; player.z = before.pz; }
    }
  };
}

installReplacementRuntimeCorrections();
