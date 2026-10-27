/**
 * Electric Lemonade excursion state.
 *
 * Keeps purchase accounting and timed rocket-boot effects independent from
 * scene construction so expiry, reload and CTM transitions are deterministic.
 */
export const ELECTRIC_LEMONADE_PRICE_CB = 10;
export const ROCKET_BOOTS_DURATION_MS = 5 * 60 * 1000;
export const ROCKET_BOOTS_STORAGE_KEY = 'coastlineRocketBootsExpiresAtV1';

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
