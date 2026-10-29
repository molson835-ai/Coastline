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
  let caveTransitionInFlight = false;

  const patchVehicleVisuals = () => {
    const vehicles = window.__coastlineVehicleRegistry;
    const THREE = window.__coastlineThree;
    if (!Array.isArray(vehicles) || !THREE?.Group) return;
    for (const vehicle of vehicles) {
      if (!vehicle?.g || vehicle.kind !== 'car' || !vehicle.rgsdevModelName || vehicle.g.userData.coastlineRgsdevForwardCorrection) continue;
      const children = [...vehicle.g.children];
      if (!children.length) continue;
      const visual = new THREE.Group();
      visual.name = 'coastline-rgsdev-forward-axis-correction';
      visual.rotation.y = Math.PI;
      for (const child of children) visual.add(child);
      vehicle.g.add(visual);
      vehicle.g.userData.coastlineRgsdevForwardCorrection = true;
      vehicle.g.userData.coastlineRgsdevForwardAxis = '-Z-authored-to-+Z-runtime';
    }
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
      node.scale.x *= 1.08;
      node.scale.z *= 1.08;
      node.scale.y *= 1.04;
      node.userData.coastlineAuthoredHairCorrected = true;
      node.userData.coastlineHairCorrection = { authored: true, xz: 1.08, y: 1.04 };
    });
  };

  const patchCaveAndVendor = () => {
    const root = window.__coastlineRegionRoot;
    if (!root || window.__coastlineActiveWorldId !== 'waterfront') return;

    const cave = root.userData?.coastlineCaveGLB || root.getObjectByName?.('coastline-waterfront-cave-entrance-glb');
    if (cave && !cave.userData.coastlineReplacementOrientationApplied) {
      // The packaged cave's doorway is opposite the old loader assumption. Keep
      // position/scale and reverse only yaw so the opening faces the -Z approach.
      cave.rotation.y = 0;
      cave.userData.coastlineReplacementOrientationApplied = true;
      cave.userData.coastlineDoorwayFacing = '-Z';
    }

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

    // Use the existing Electric Lemonade interaction, which delegates to the
    // existing CTM manager. This makes the actual entrance itself the trigger,
    // while the in-flight guard guarantees one transition per arrival.
    const player = window.__coastlinePlayer;
    if (!caveTransitionInFlight && player?.mode === 'walk' && typeof window.__coastlineElectricLemonade?.canUse === 'function' && window.__coastlineElectricLemonade.canUse()) {
      if (Math.hypot(player.x - 520, player.z - 542.5) <= 2.25) {
        caveTransitionInFlight = true;
        Promise.resolve(window.__coastlineElectricLemonade.interact()).finally(() => setTimeout(() => { caveTransitionInFlight = false; }, 250));
      }
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
      caveOrientationCorrected: Boolean(window.__coastlineRegionRoot?.userData?.coastlineCaveGLB?.userData?.coastlineReplacementOrientationApplied),
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
