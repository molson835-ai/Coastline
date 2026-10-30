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
    // The prior 180-degree visual wrapper made the vehicle's visible nose disagree
    // with the camera's existing behind-the-vehicle placement. Steering correction
    // must be solved independently without rotating the whole vehicle presentation.
    return;
  };

  const patchAuthoredHair = () => {
    const root = window.__coastlineAvatar?.userData?.cozyActor?.root;
    if (!root?.traverse) return;
    root.traverse(node => {
      if (!node.isMesh || node.userData.coastlineAuthoredHairCorrected) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (!materials.some(material => String(material?.name || '').toLowerCase() === 'hair')) return;
      // This is the authored Cozy hair mesh itself. Expand its existing local
      // perimeter modestly so it covers the measured scalp bounds. No cap/sphere
      // replacement is created, so material, skinning and hair-color controls remain intact.
      node.scale.x *= 1.98;
      node.scale.z *= 1.98;
      node.scale.y *= 1.35;
      node.userData.coastlineAuthoredHairCorrected = true;
      node.userData.coastlineHairCorrection = { authored: true, xz: 1.98, y: 1.35 };
    });
  };

  const patchCaveAndVendor = () => {
    const root = window.__coastlineRegionRoot;
    if (!root || window.__coastlineActiveWorldId !== 'waterfront') return;

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

  window.__coastlineReplacementVisualPatch = () => {
    patchVehicleVisuals();
    patchAuthoredHair();
    patchCaveAndVendor();
    let authoredHairCorrected = false;
    window.__coastlineAvatar?.userData?.cozyActor?.root?.traverse?.(node => { if (node.userData?.coastlineAuthoredHairCorrected) authoredHairCorrected = true; });
    return {
      vehicles: Array.isArray(window.__coastlineVehicleRegistry) ? window.__coastlineVehicleRegistry.filter(v => v?.g?.userData?.coastlineRgsdevForwardCorrection).length : 0,
      authoredHairCorrected,
      lemonadeVendorLivingWorld: Boolean(window.__coastlineWaterfrontVendorActor?.root?.userData?.coastlineLivingWorldVendor),
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

  // Behavioral probe: drives the actual game update loop and measures movement,
  // then compares it with the visible vehicle's corrected +Z nose direction.
  window.__coastlineReplacementSteeringProbe = (key, reverse = false, frames = 30) => {
    const api = window.__coastlineTest;
    const vehicles = window.__coastlineVehicleRegistry;
    const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v?.kind === 'car') : null;
    const THREE = window.__coastlineThree;
    if (!api || !vehicle || !THREE) throw new Error('Coastline runtime steering probe unavailable');
    patchVehicleVisuals();
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
