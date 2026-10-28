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
  for (const worldId of ['island', 'waterfront', 'port']) {
    const plan = getCoastlineWildlifePlacementPlan(worldId);
    assert.equal(plan.length, 1, worldId + ' gets one ambient mount');
    assert.ok(['horse', 'ostrich'].includes(plan[0].kind));
  }
  assert.deepEqual(getCoastlineWildlifePlacementPlan('homey-garage'), []);
});

test('animal and cave scales normalize to plausible world-unit heights', () => {
  assert.ok(Math.abs(getCoastlineTargetScale('horse', 2.12) * 2.12 - 2.05) < 1e-9);
  assert.ok(Math.abs(getCoastlineTargetScale('ostrich', 2.4) * 2.4 - 2.25) < 1e-9);
  assert.ok(Math.abs(getCoastlineTargetScale('cave', 3.96) * 3.96 - 5.35) < 1e-9);
  assert.equal(getCoastlineTargetScale('horse', 0), 1);
});

test('cave threshold triggers only on foot inside Waterfront portal radius', () => {
  const onThreshold = { worldId: 'waterfront', mode: 'walk', ...COASTLINE_CAVE_THRESHOLD };
  assert.equal(isCoastlineCaveThreshold(onThreshold), true);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, x: onThreshold.x + 1.05 }), false);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, worldId: 'city' }), false);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, mode: 'vehicle' }), false);
  assert.equal(isCoastlineCaveThreshold({ ...onThreshold, mode: 'interior' }), false);
});

test('cave rock collision leaves a walkable doorway and blocks the mountain sides and rear', () => {
  const colliders = getCoastlineCaveColliders();
  assert.ok(colliders.length >= 9);
  assert.ok(colliders.some(c => c.name.includes('portal-jamb')));
  assert.equal(COASTLINE_CAVE_PORTAL_CLEAR_WIDTH, 6);
  assert.equal(isCoastlineCavePointBlocked(548, 537.2, 0.45), false, 'character fits through centered portal');
  assert.equal(isCoastlineCavePointBlocked(548, 537.2, 1.8), false, 'vehicle envelope fits through portal corridor');
  assert.equal(isCoastlineCavePointBlocked(542, 537.2, 0.45), true, 'left rock face blocks foot movement');
  assert.equal(isCoastlineCavePointBlocked(554, 537.2, 1.8), true, 'right rock face blocks a vehicle');
  assert.equal(isCoastlineCavePointBlocked(548, 527, 0.45), true, 'rear of mountain is solid');
  assert.equal(isCoastlineCavePointBlocked(536, 528, 0.45), true, 'side/rear mountain is solid');
});

test('wildlife loader uses GLB animation, rider socket, source paths, and CTM-owned root lifecycle', async () => {
  const [loader, transitions, game, packageBuilder] = await Promise.all([
    read('coastline-wildlife-assets.js'),
    read('coastline-world-transitions.js'),
    read('game-v3.html'),
    read('scripts/build-itch.mjs'),
  ]);
  assert.match(loader, /GLTFLoader/);
  assert.match(loader, /AnimationMixer/);
  assert.match(loader, /saddle_socket/);
  assert.match(loader, /skeletonUtils\?\.clone/);
  assert.match(loader, /coastline-ostrich-normalized|model\.rotation\.y \+= -Math\.PI \/ 2/);
  assert.match(loader, /loadCaveIntoRoot/);
  assert.match(loader, /assets\/cave-entrance\.glb/);
  assert.match(loader, /assets\/animals\/warhorse-lite\.glb/);
  assert.match(loader, /window\.__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true/);
  assert.match(loader, /if \(horseAssetAvailable\)[\s\S]*?fetch\(config\.local/);
  assert.doesNotMatch(loader, /loadWarhorseFromArchive|Warhorse_Lite_v1\.0\.0\.zip/);
  assert.match(loader, /__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true/);
  assert.match(packageBuilder, /window\.__COASTLINE_PACKAGED_ASSETS__=true/);
  assert.equal(COASTLINE_WILDLIFE_ASSETS.ostrich.license, 'CC0');
  assert.match(transitions, /coastlineWildlifeAssets\?\.attachWorld/);
  assert.match(transitions, /coastlineWildlifeAssets\?\.detachWorld/);
  assert.match(game, /isCoastlineCaveThreshold/);
  assert.match(game, /wildlifeAssetState/);
  assert.match(packageBuilder, /coastline-wildlife-assets\.js/);
  assert.match(packageBuilder, /assets\/cave-entrance\.glb/);
  assert.match(packageBuilder, /assets\/animals\/ostrich\.glb/);
  assert.doesNotMatch(packageBuilder, /Warhorse_Lite_v1\.0\.0\.zip|extractZipEntry/);
  assert.match(packageBuilder, /assets\/animals\/warhorse-lite\.glb/);
  assert.match(packageBuilder, /horseAssetAvailable/);
  assert.match(packageBuilder, /runtime fallback enabled/);
});

test('repository GLBs are valid binary glTF; licensed Warhorse Lite is optional and never tracked', async () => {
  const [cave, ostrich, loader, builder, credits, ignore] = await Promise.all([
    readFile(new URL('../assets/cave-entrance.glb', import.meta.url)),
    readFile(new URL('../assets/animals/ostrich.glb', import.meta.url)),
    read('coastline-wildlife-assets.js'),
    read('scripts/build-itch.mjs'),
    read('ASSET_CREDITS.md'),
    read('.gitignore'),
  ]);
  const readGlbJson = buffer => {
    assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
    assert.equal(buffer.readUInt32LE(4), 2, 'GLB must be version 2');
    assert.equal(buffer.readUInt32LE(8), buffer.length, 'GLB declared length must match file length');
    const chunkLength = buffer.readUInt32LE(12);
    assert.equal(buffer.toString('ascii', 16, 20), 'JSON');
    return JSON.parse(buffer.toString('utf8', 20, 20 + chunkLength).trim());
  };
  assert.ok(readGlbJson(cave).meshes?.length, 'cave asset has mesh geometry');
  assert.ok(readGlbJson(ostrich).meshes?.length, 'ostrich asset has mesh geometry');
  assert.match(ignore, /assets\/animals\/warhorse-lite\.glb/);
  assert.doesNotMatch(loader, /Warhorse_Lite_v1\.0\.0\.zip|loadWarhorseFromArchive/);
  assert.doesNotMatch(builder, /Warhorse_Lite_v1\.0\.0\.zip|extractZipEntry/);
  assert.match(builder, /existsSync\(localHorsePath\)/);
  assert.match(builder, /horseAssetAvailable/);
  assert.match(credits, /not committed to the public repository/i);
});

test('active wildlife replaces legacy procedural deer and bird flock placeholders', async () => {
  const game = await read('game-v3.html');
  assert.match(game, /createCoastlineWildlifeAssets/);
  assert.doesNotMatch(game, /function makeDeer\(/);
  assert.doesNotMatch(game, /const birdMat=M\(0x302b42/);
  assert.match(game, /deer:0/);
});


test('wildlife simulation is gated to the active world while preserving a mount attached to the active root', async () => {
  const { shouldUpdateCoastlineWildlife } = await import('../coastline-wildlife-assets.js');
  assert.equal(shouldUpdateCoastlineWildlife('city', 'city'), true);
  assert.equal(shouldUpdateCoastlineWildlife('city', 'island'), false);
  assert.equal(shouldUpdateCoastlineWildlife('waterfront', 'port'), false);
  assert.equal(shouldUpdateCoastlineWildlife('island', 'home-interior', true), true);
  assert.equal(shouldUpdateCoastlineWildlife('island', 'home-interior', false), false);
  const source = await readFile(new URL('../coastline-wildlife-assets.js', import.meta.url), 'utf8');
  assert.match(source, /if\s*\(!shouldUpdateCoastlineWildlife\(v\.worldId, activeWorldId, mountedInActiveWorld\)\)\s*continue/);
});
