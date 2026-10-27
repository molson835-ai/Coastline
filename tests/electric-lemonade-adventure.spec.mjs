import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createElectricLemonadeState,
  ELECTRIC_LEMONADE_PRICE_CB,
  ROCKET_BOOTS_DURATION_MS,
  ROCKET_BOOTS_STORAGE_KEY,
} from '../coastline-electric-lemonade-adventure.js';

function fixture({ balance = 100, time = 1_000, saved = null } = {}) {
  let cash = balance;
  let clock = time;
  const values = new Map(saved === null ? [] : [[ROCKET_BOOTS_STORAGE_KEY, String(saved)]]);
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const state = createElectricLemonadeState({
    getBalance: () => cash,
    setBalance: value => { cash = value; },
    now: () => clock,
    storage,
  });
  return { state, balance: () => cash, advance: ms => { clock += ms; }, stored: () => values.get(ROCKET_BOOTS_STORAGE_KEY) ?? null };
}

test('Electric Lemonade costs exactly 10 CB and insufficient funds have no effect', () => {
  assert.equal(ELECTRIC_LEMONADE_PRICE_CB, 10);
  const short = fixture({ balance: 9 });
  assert.deepEqual(short.state.buyLemonade(), { ok: false, reason: 'insufficient-funds', balance: 9 });
  assert.equal(short.balance(), 9);
  assert.equal(short.state.snapshot().glowPurchased, false);

  const enough = fixture({ balance: 15 });
  assert.deepEqual(enough.state.buyLemonade(), { ok: true, charged: 10, balance: 5 });
  assert.equal(enough.balance(), 5);
  assert.equal(enough.state.snapshot().glowPurchased, true);
});

test('purchased glow activates for dungeon excursion and is removed on exit', () => {
  const f = fixture();
  f.state.buyLemonade();
  assert.equal(f.state.snapshot().glowActive, true);
  assert.deepEqual(f.state.enterDungeon(), { dungeonActive: true, glowActive: true });
  f.state.exitDungeon();
  assert.equal(f.state.snapshot().glowActive, false);
  assert.equal(f.state.snapshot().dungeonActive, false);
});

test('rocket boots affect a bounded five-minute interval and pickup resets after expiry', () => {
  const f = fixture();
  f.state.enterDungeon();
  const pickup = f.state.collectRocketBoots();
  assert.equal(pickup.ok, true);
  assert.equal(pickup.durationMs, ROCKET_BOOTS_DURATION_MS);
  assert.equal(f.state.isRocketBoostActive(), true);
  assert.equal(f.state.collectRocketBoots().ok, false);
  f.advance(ROCKET_BOOTS_DURATION_MS - 1);
  assert.equal(f.state.isRocketBoostActive(), true);
  f.advance(1);
  assert.equal(f.state.isRocketBoostActive(), false);
  assert.equal(f.state.snapshot().pickupAvailable, true);
  assert.equal(f.stored(), null);
  assert.equal(f.state.collectRocketBoots().ok, true);
});

test('active boost expiry persists across reload but expired storage cannot grant an indefinite boost', () => {
  const f = fixture({ time: 10_000 });
  f.state.enterDungeon();
  f.state.collectRocketBoots();
  const expiry = Number(f.stored());
  const reloaded = createElectricLemonadeState({
    getBalance: f.balance,
    setBalance: () => {},
    now: () => 10_001,
    storage: { getItem: () => String(expiry), setItem: () => {}, removeItem: () => {} },
  });
  assert.equal(reloaded.isRocketBoostActive(), true);
  const expired = createElectricLemonadeState({
    getBalance: f.balance,
    setBalance: () => {},
    now: () => expiry,
    storage: { getItem: () => String(expiry), setItem: () => {}, removeItem: () => {} },
  });
  assert.equal(expired.isRocketBoostActive(), false);
  assert.equal(expired.snapshot().pickupAvailable, true);
});


test('vendor interaction requires close proximity and facing the stand', async () => {
  const { isFacingElectricLemonadeVendor } = await import('../coastline-electric-lemonade-adventure.js');
  assert.equal(isFacingElectricLemonadeVendor({ x: 520, z: 529, heading: 0 }, { x: 520, z: 532 }), true);
  assert.equal(isFacingElectricLemonadeVendor({ x: 520, z: 535, heading: 0 }, { x: 520, z: 532 }), false);
  assert.equal(isFacingElectricLemonadeVendor({ x: 520, z: 529, heading: Math.PI / 2 }, { x: 520, z: 532 }), false);
  assert.equal(isFacingElectricLemonadeVendor({ x: 520, z: 529, heading: 0 }, { x: 520, z: 532 }, { maxDistance: 2 }), false);
  assert.equal(isFacingElectricLemonadeVendor({ x: Number.NaN, z: 529, heading: 0 }, { x: 520, z: 532 }), false);
});
