import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COASTLINE_WILDLIFE_ASSETS,
  getCoastlineTargetScale,
  getCoastlineWildlifePlacementPlan,
  isCoastlineCaveThreshold,
} from '../coastline-wildlife-assets.js';
import {
  COASTLINE_CAVE_PORTAL_CLEAR_WIDTH,
  COASTLINE_CAVE_THRESHOLD,
  getCoastlineCaveColliders,
  isCoastlineCavePointBlocked,
} from '../coastline-island-regions.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('wildlife placement includes six City mounts and one locally-owned mount per outdoor island', () => {
  const city = getCoastlineWildlifePlacementPlan('city');
  assert.equal(city.length, 6);
  assert.equal(city.filter(item => item.kind === 'horse').length, 3);
  assert.equal(city.filter(item => item.kind === 'ostrich').length, 3);
  assert.equal(new Set(city.map(item => item.key)).size, city.length);
  for (const worldId of ['island', 'waterfront', 'port']) assert.equal(getCoastlineWildlifePlacementPlan(worldId).length, 1);
});

test('animal and cave scales normalize to plausible world-unit heights', () => {
  assert.ok(Math.abs(getCoastlineTargetScale('horse', 2.12) * 2.12 - 2.05) < 1e-9);
  assert.ok(Math.abs(getCoastlineTargetScale('ostrich', 2.4) * 2.4 - 2.25) < 1e-9);
  assert.ok(Math.abs(getCoastlineTargetScale('cave', 3.96) * 3.96 - 5.35) < 1e-9);
});

test('cave threshold triggers only on foot inside Waterfront portal radius', () => {
  const onThreshold = { worldId: 'waterfront', mode: 'walk', ...COASTLINE_CAVE_THRESHOLD };
  assert.equal(isCoastlineCaveThreshold(onThreshold), true);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, x: onThreshold.x + 2.5 }), false);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, mode: 'vehicle' }), false);
});

test('cave rock collision leaves a walkable doorway and blocks the mountain sides and rear', () => {
  const colliders = getCoastlineCaveColliders();
  assert.ok(colliders.length >= 9);
  assert.equal(COASTLINE_CAVE_PORTAL_CLEAR_WIDTH, 3);
  assert.equal(isCoastlineCavePointBlocked(COASTLINE_CAVE_THRESHOLD.x, COASTLINE_CAVE_THRESHOLD.z, 0.45), false);
  assert.equal(isCoastlineCavePointBlocked(514, COASTLINE_CAVE_THRESHOLD.z, 0.45), true);
  assert.equal(isCoastlineCavePointBlocked(526, COASTLINE_CAVE_THRESHOLD.z, 0.45), true);
  assert.equal(isCoastlineCavePointBlocked(520, 558, 0.45), true);
});

test('wildlife and cave assets remain CTM-owned and use the approved runtime lifecycle', async () => {
  const [loader, transitions] = await Promise.all([read('coastline-wildlife-assets.js'), read('coastline-world-transitions.js')]);
  assert.match(loader, /GLTFLoader/);
  assert.match(loader, /AnimationMixer/);
  assert.match(loader, /saddle_socket/);
  assert.match(loader, /loadCaveIntoRoot/);
  assert.match(loader, /assets\/cave-entrance\.glb/);
  assert.match(transitions, /coastlineWildlifeAssets\?\.attachWorld/);
  assert.match(transitions, /coastlineWildlifeAssets\?\.detachWorld/);
  assert.match(transitions, /electric-lemonade-dungeon/);
});

test('repository GLBs remain valid runtime assets and the licensed Warhorse stays optional', async () => {
  const [cave, ostrich, loader] = await Promise.all([
    readFile(new URL('../assets/cave-entrance.glb', import.meta.url)),
    readFile(new URL('../assets/animals/ostrich.glb', import.meta.url)),
    read('coastline-wildlife-assets.js'),
  ]);
  for (const buffer of [cave, ostrich]) {
    assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
    assert.equal(buffer.readUInt32LE(4), 2);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
  }
  assert.match(loader, /__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true/);
  assert.equal(COASTLINE_WILDLIFE_ASSETS.ostrich.license, 'CC0');
});

test('wildlife simulation is gated to the active world while preserving a mounted actor', async () => {
  const { shouldUpdateCoastlineWildlife } = await import('../coastline-wildlife-assets.js');
  assert.equal(shouldUpdateCoastlineWildlife('city', 'city'), true);
  assert.equal(shouldUpdateCoastlineWildlife('city', 'island'), false);
  assert.equal(shouldUpdateCoastlineWildlife('island', 'home-interior', true), true);
});
