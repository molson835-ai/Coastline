/**
 * Electric Lemonade excursion state.
 *
 * Keeps purchase accounting and timed rocket-boot effects independent from
 * scene construction so expiry, reload and CTM transitions are deterministic.
 */
export const ELECTRIC_LEMONADE_PRICE_CB = 10;
export const ROCKET_BOOTS_DURATION_MS = 5 * 60 * 1000;
export const ROCKET_BOOTS_STORAGE_KEY = 'coastlineRocketBootsExpiresAtV1';

/**
 * True only when an on-foot player is close enough to the vendor and looking
 * generally toward the target. Heading follows Coastline's sin(x)/cos(z) convention.
 */
export function isFacingElectricLemonadeVendor(
  player,
  target,
  { maxDistance = 3.2, minimumFacingDot = 0.45 } = {},
) {
  if (![player?.x, player?.z, player?.heading, target?.x, target?.z, maxDistance, minimumFacingDot].every(Number.isFinite)) return false;
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance > maxDistance || distance < 1e-6) return false;
  const facingDot = (dx * Math.sin(player.heading) + dz * Math.cos(player.heading)) / distance;
  return facingDot >= minimumFacingDot;
}

export function createElectricLemonadeState({
  getBalance,
  setBalance,
  now = () => Date.now(),
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  boostDurationMs = ROCKET_BOOTS_DURATION_MS,
} = {}) {
  if (typeof getBalance !== 'function' || typeof setBalance !== 'function') {
    throw new TypeError('getBalance and setBalance callbacks are required');
  }

  let glowPurchased = false;
  let dungeonActive = false;
  let glowActive = false;
  let boostExpiresAt = 0;
  let pickupAvailable = true;

  try {
    const saved = Number(storage?.getItem(ROCKET_BOOTS_STORAGE_KEY) || 0);
    if (Number.isFinite(saved) && saved > now()) {
      boostExpiresAt = saved;
      pickupAvailable = false;
    } else {
      storage?.removeItem(ROCKET_BOOTS_STORAGE_KEY);
    }
  } catch {}

  const update = () => {
    if (boostExpiresAt && now() >= boostExpiresAt) {
      boostExpiresAt = 0;
      pickupAvailable = true;
      try { storage?.removeItem(ROCKET_BOOTS_STORAGE_KEY); } catch {}
      return { expired: true };
    }
    return { expired: false };
  };

  return {
    buyLemonade() {
      const balance = Number(getBalance());
      if (!Number.isFinite(balance) || balance < ELECTRIC_LEMONADE_PRICE_CB) {
        return { ok: false, reason: 'insufficient-funds', balance: Number.isFinite(balance) ? balance : 0 };
      }
      const nextBalance = balance - ELECTRIC_LEMONADE_PRICE_CB;
      setBalance(nextBalance);
      glowPurchased = true;
      glowActive = true;
      return { ok: true, charged: ELECTRIC_LEMONADE_PRICE_CB, balance: nextBalance };
    },
    enterDungeon() {
      dungeonActive = true;
      glowActive = glowPurchased || glowActive;
      glowPurchased = false;
      return { dungeonActive, glowActive };
    },
    exitDungeon() {
      dungeonActive = false;
      glowActive = false;
      glowPurchased = false;
      return { dungeonActive, glowActive };
    },
    collectRocketBoots() {
      update();
      if (!dungeonActive || !pickupAvailable) return { ok: false, reason: 'unavailable' };
      pickupAvailable = false;
      boostExpiresAt = now() + boostDurationMs;
      try { storage?.setItem(ROCKET_BOOTS_STORAGE_KEY, String(boostExpiresAt)); } catch {}
      return { ok: true, expiresAt: boostExpiresAt, durationMs: boostDurationMs };
    },
    update,
    isRocketBoostActive() {
      update();
      return boostExpiresAt > now();
    },
    snapshot() {
      update();
      return {
        dungeonActive,
        glowPurchased,
        glowActive,
        rocketBootsActive: boostExpiresAt > now(),
        rocketBootsExpiresAt: boostExpiresAt || null,
        pickupAvailable,
        balance: Number(getBalance()),
      };
    },
  };
}

/*
 * Replacement-PR runtime corrections.
 *
 * These are deliberately installed from a small module already loaded by
 * game-v3.html so the correction does not duplicate the vehicle physics or CTM.
 * The vehicle physics already interprets A/left as negative steering and D/right
 * as positive steering. The observed inversion was in the authored RGSDev vehicle
 * presentation: its forward-facing geometry is opposite Coastline's +Z travel axis.
 * Correct the visual hierarchy once, leaving movement/heading physics untouched.
 */
function installReplacementRuntimeCorrections() {
  if (typeof window === 'undefined' || window.__coastlineReplacementRuntimeInstalled) return;
  window.__coastlineReplacementRuntimeInstalled = true;

  const patchVehicleVisuals = () => {
    const vehicles = window.__coastlineVehicleRegistry;
    if (!Array.isArray(vehicles)) return;
    for (const vehicle of vehicles) {
      if (!vehicle?.g || vehicle.kind !== 'car' || !vehicle.rgsdevModelName) continue;
      if (vehicle.g.userData.coastlineRgsdevForwardCorrection) continue;
      // Keep the vehicle root's heading authoritative for movement/camera. Rotate
      // the complete authored visual hierarchy 180° around the vehicle pivot.
      const THREE = window.__coastlineThree;
      if (!THREE?.Group) continue;
      const visual = new THREE.Group();
      visual.name = 'coastline-rgsdev-forward-axis-correction';
      visual.rotation.y = Math.PI;
      const children = [...vehicle.g.children];
      if (!children.length) continue;
      for (const child of children) visual.add(child);
      vehicle.g.add(visual);
      vehicle.g.userData.coastlineRgsdevForwardCorrection = true;
      vehicle.g.userData.coastlineRgsdevForwardAxis = '-Z-authored-to-+Z-runtime';
    }
  };

  const patchAuthoredHair = () => {
    const avatar = window.__coastlineAvatar;
    const root = avatar?.userData?.cozyActor?.root;
    if (!root?.traverse) return;
    root.traverse(node => {
      if (!node.isMesh || node.userData.coastlineAuthoredHairCorrected) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      const isHair = materials.some(material => String(material?.name || '').toLowerCase() === 'hair');
      if (!isHair) return;
      // This is the authored Cozy hair mesh, not a replacement cap/sphere. A small
      // local X/Z expansion brings the authored perimeter over the measured scalp
      // bounds while preserving its material, skinning and hair-color controls.
      node.scale.x *= 1.08;
      node.scale.z *= 1.08;
      node.scale.y *= 1.04;
      node.userData.coastlineAuthoredHairCorrected = true;
      node.userData.coastlineHairCorrection = { xz: 1.08, y: 1.04, authored: true };
    });
  };

  window.__coastlineReplacementVisualPatch = () => {
    patchVehicleVisuals();
    patchAuthoredHair();
    return {
      vehicles: Array.isArray(window.__coastlineVehicleRegistry)
        ? window.__coastlineVehicleRegistry.filter(v => v?.g?.userData?.coastlineRgsdevForwardCorrection).length
        : 0,
      authoredHairCorrected: Boolean(window.__coastlineAvatar?.userData?.cozyActor?.root?.getObjectByName?.('coastline-wardrobe-hair-overlay') || (() => {
        let found = false;
        window.__coastlineAvatar?.userData?.cozyActor?.root?.traverse?.(node => { if (node.userData?.coastlineAuthoredHairCorrected) found = true; });
        return found;
      })()),
    };
  };

  window.addEventListener('coastline:wardrobe-applied', patchAuthoredHair);
  let attempts = 0;
  const timer = setInterval(() => {
    patchVehicleVisuals();
    patchAuthoredHair();
    if (++attempts >= 240) clearInterval(timer);
  }, 250);

  // Behavioral probe: uses the real game update loop rather than reproducing the
  // steering equation in a test. It measures displacement for forward and reverse
  // input and reports the visible vehicle's corrected +Z nose vector.
  window.__coastlineReplacementSteeringProbe = async (key, reverse = false, frames = 30) => {
    const api = window.__coastlineTest;
    const vehicles = window.__coastlineVehicleRegistry;
    const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v?.kind === 'car') : null;
    if (!api || !vehicle) throw new Error('Coastline runtime steering probe unavailable');
    patchVehicleVisuals();
    const before = {
      mode: window.__coastlinePlayer?.mode,
      vehicle: window.__coastlinePlayer?.vehicle,
      x: vehicle.x, z: vehicle.z, heading: vehicle.heading, speed: vehicle.speed,
      playerX: window.__coastlinePlayer?.x, playerZ: window.__coastlinePlayer?.z,
    };
    try {
      api.setVehiclePosition(0, 0, 0);
      vehicle.speed = reverse ? -12 : 12;
      api.keyDown(key);
      api.advanceTestFrame(1 / 60, frames);
      api.keyUp(key);
      const dx = vehicle.x;
      const dz = vehicle.z;
      const q = vehicle.g?.getWorldQuaternion?.(new (window.__coastlineThree?.Quaternion || Object)());
      const nose = q && window.__coastlineThree?.Vector3
        ? new window.__coastlineThree.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        : null;
      return { key, reverse, displacement: { x: dx, z: dz }, heading: vehicle.heading, visualNose: nose ? { x: nose.x, z: nose.z } : null };
    } finally {
      api.keyUp(key);
      vehicle.x = before.x; vehicle.z = before.z; vehicle.heading = before.heading; vehicle.speed = before.speed;
      if (vehicle.g) vehicle.g.rotation.y = before.heading;
      const player = window.__coastlinePlayer;
      if (player) { player.mode = before.mode; player.vehicle = before.vehicle; player.x = before.playerX; player.z = before.playerZ; }
    }
  };
}

installReplacementRuntimeCorrections();
