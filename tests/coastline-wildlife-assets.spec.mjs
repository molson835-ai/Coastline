import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COASTLINE_WILDLIFE_ASSETS,
  getCoastlineTargetScale,
  getCoastlineWildlifePlacementPlan,
} from '../coastline-wildlife-assets.js';

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

test('animal scales normalize to plausible world-unit heights', () => {
  assert.ok(Math.abs(getCoastlineTargetScale('horse', 2.12) * 2.12 - 2.05) < 1e-9);
  assert.ok(Math.abs(getCoastlineTargetScale('ostrich', 2.4) * 2.4 - 2.25) < 1e-9);
  assert.equal(getCoastlineTargetScale('horse', 0), 1);
});

test('legacy cave collision helper and oversized invisible boundary contract are retired', async () => {
  const regions = await read('coastline-island-regions.js');
  const caveRuntime = await read('coastline-three-cave-system.js');
  assert.doesNotMatch(regions, /getCoastlineCaveColliders|isCoastlineCavePointBlocked/);
  assert.doesNotMatch(regions, /coastline-waterfront-cave-mountain|coastline-electric-lemonade-cave-dark-opening/);
  assert.match(caveRuntime, /-left-wall/);
  assert.match(caveRuntime, /left-rock-wall/);
  assert.match(caveRuntime, /right-rock-wall/);
  assert.match(caveRuntime, /electric-dungeon-left-cavern-divider/);
  assert.match(caveRuntime, /electric-dungeon-right-cavern-divider/);
  assert.match(caveRuntime, /-right-wall/);
  assert.match(caveRuntime, /front-left-jamb/);
  assert.match(caveRuntime, /front-right-jamb/);
  assert.match(caveRuntime, /removeLegacyCaveColliders/);
});

test('wildlife loader uses GLB animation, rider socket, source paths, and CTM-owned root lifecycle', async () => {
  const [loader, transitions, game, packageBuilder, regions] = await Promise.all([
    read('coastline-wildlife-assets.js'),
    read('coastline-world-transitions.js'),
    read('game-v3.html'),
    read('scripts/build-itch.mjs'),
    read('coastline-island-regions.js'),
  ]);
  assert.match(loader, /GLTFLoader/);
  assert.match(loader, /AnimationMixer/);
  assert.match(loader, /Do not apply Warhorse clips to the ostrich/);
  assert.match(loader, /coastlineProceduralBaseRotation/);
  assert.match(loader, /key\.includes\('canter'\) \|\| key\.includes\('run'\)/);
  assert.match(loader, /saddle_socket/);
  assert.match(loader, /skeletonUtils\?\.clone/);
  assert.match(loader, /coastline-ostrich-normalized|model\.rotation\.y \+= -Math\.PI \/ 2/);
  assert.doesNotMatch(loader, /loadCaveIntoRoot|cave-entrance\.glb/);
  assert.doesNotMatch(regions, /coastline-waterfront-cave-mountain|coastline-waterfront-cave-approach-path/);
  assert.match(loader, /assets\/animals\/warhorse-lite\.glb/);
  assert.match(loader, /window\.__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true/);
  assert.match(loader, /if \(horseAssetAvailable\)[\s\S]*?fetch\(config\.local/);
  assert.doesNotMatch(loader, /loadWarhorseFromArchive|Warhorse_Lite_v1\.0\.0\.zip/);
  assert.match(loader, /__COASTLINE_WARHORSE_ASSET_AVAILABLE__ === true/);
  assert.match(packageBuilder, /window\.__COASTLINE_PACKAGED_ASSETS__=true/);
  assert.equal(COASTLINE_WILDLIFE_ASSETS.ostrich.license, 'CC0');
  assert.equal(COASTLINE_WILDLIFE_ASSETS.cave, undefined, 'retired cave is not part of the wildlife asset catalog');
  assert.match(transitions, /coastlineWildlifeAssets\?\.attachWorld/);
  assert.match(transitions, /coastlineWildlifeAssets\?\.detachWorld/);
  assert.match(transitions, /electric-dungeon-maze-west-first/);
  assert.match(transitions, /electric-dungeon-maze-east-first/);
  assert.match(transitions, /electric-dungeon-maze-dead-end-marker/);
  assert.match(transitions, /const addNaturalBarrier=/);
  assert.match(transitions, /electric-dungeon-ceiling-rocks/);
  assert.match(transitions, /electric-dungeon-natural-stalactites-stalagmites/);
  assert.match(transitions, /new THREE\.DodecahedronGeometry\(1,1\)/);
  assert.match(transitions, /electric-dungeon-landmark-/);
  assert.match(transitions, /destinationSpawn:\{x:520,y:islandGroundY\(\),z:537\.5,rotationY:Math\.PI\}/, 'dungeon return points outside facing away from the portal at island height');
  assert.match(transitions, /id:'homey-garage-to-island'[\s\S]*?z:484,rotationY:Math\.PI/, 'Homey vehicle arrival points out of the garage');
  assert.match(transitions, /id:'homey-garage-to-house'[\s\S]*?z:508\.5,rotationY:Math\.PI/, 'house interior arrival faces into the room, away from its door');
  assert.doesNotMatch(game, /isCoastlineCaveThreshold|electricLemonadePoints\.cave|electricLemonadePoints\.exit/);
  assert.match(game, /steer=THREE\.MathUtils\.clamp\(\(keys\.a\?1:0\)-\(keys\.d\?1:0\),-1,1\)/, 'D-pad controls follow the behind-car screen-space convention');
  assert.doesNotMatch(game, /driveStick|touchSteer|driveControls/, 'joystick is removed in favor of the D-pad');
  assert.match(game, /document\.addEventListener\('visibilitychange'/, 'touch input clears when the app is backgrounded');
  assert.match(game, /document\.querySelectorAll\('\.touch \[data-k\]'\)/, 'D-pad buttons share pointer-safe input handling');
  assert.match(game, /data-steer-button/, 'button steering remains available outside driving mode');
  assert.match(game, /roadster|convertible|open\.?top/i, 'open-top vehicle can show a seated driver');
  assert.match(game, /coastlineOpenTopDriver&&avatar\.parent===v\.g/, 'open-top driver is restored to the world when exiting');
  assert.match(game, /boots:\{x:524,z:568,radius:2\.8\}/, 'rocket-boot pickup remains inside the center cavern');
  assert.doesNotMatch(game, /electricLemonadePoints\.exit|electricLemonadePoints\.cave/, 'all cave entrances and exits are owned by automatic three-cave CTMs');
  assert.doesNotMatch(loader, /cave-entrance\.glb|loadCaveIntoRoot|isCoastlineCaveThreshold/, 'wildlife runtime no longer contains the retired single-cave system');
  assert.match(game, /wildlifeAssetState/);
  assert.match(packageBuilder, /coastline-wildlife-assets\.js/);
  assert.doesNotMatch(packageBuilder, /assets\/cave-entrance\.glb/);
  assert.match(packageBuilder, /assets\/3_evil_rock_mountains_with_cave_stylized\.glb/);
  assert.match(packageBuilder, /assets\/animals\/ostrich\.glb/);
  assert.doesNotMatch(packageBuilder, /Warhorse_Lite_v1\.0\.0\.zip|extractZipEntry/);
  assert.match(packageBuilder, /assets\/animals\/warhorse-lite\.glb/);
  assert.match(packageBuilder, /horseAssetAvailable/);
  assert.match(packageBuilder, /runtime fallback enabled/);
});

test('repository GLBs are valid binary glTF; licensed Warhorse Lite is optional and never tracked', async () => {
  const [cave, ostrich, loader, builder, credits, ignore] = await Promise.all([
    readFile(new URL('../assets/3_evil_rock_mountains_with_cave_stylized.glb', import.meta.url)),
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
  assert.ok(readGlbJson(cave).meshes?.length, 'approved three-cave asset has mesh geometry');
  assert.ok(readGlbJson(ostrich).meshes?.length, 'ostrich asset has mesh geometry');
  await assert.rejects(
    readFile(new URL('../assets/cave-entrance.glb', import.meta.url)),
    error => error?.code === 'ENOENT',
    'retired single-cave asset is absent from the repository',
  );
  assert.match(ignore, /assets\/animals\/warhorse-lite\.glb/);
  assert.doesNotMatch(loader, /Warhorse_Lite_v1\.0\.0\.zip|loadWarhorseFromArchive/);
  assert.doesNotMatch(builder, /Warhorse_Lite_v1\.0\.0\.zip|extractZipEntry/);
  assert.match(builder, /existsSync\(localHorsePath\)/);
  assert.match(builder, /horseAssetAvailable/);
  assert.match(credits, /Jungle Jim — 3 Evil Rock Mountains with Cave/);
  assert.doesNotMatch(credits, /Grab3D — Cave Entrance/);
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
  assert.match(source, /if\s*\(!shouldUpdateCoastlineWildlife\(v\.worldId, activeWorldId, mountedInActiveWorld\)\)\s*\{\s*skippedInactive\+\+;\s*continue/);
  assert.match(source, /diagnostics\.activeWorldId\s*=\s*activeWorldId/);
  assert.match(source, /diagnostics\.lastUpdated\s*=\s*updated/);
  assert.match(source, /diagnostics\.skippedInactive\s*=\s*skippedInactive/);
  assert.match(source, /lastUpdated:\s*diagnostics\.lastUpdated/);
});

test('retired procedural car visuals and neutral fallback cannot flash before the RGSDev fleet loads', async () => {
  const [gameSource, assetSwap] = await Promise.all([read('game-v3.html'), read('coastline-asset-swap.js')]);
  const makeVehicleBody = gameSource.slice(gameSource.indexOf('function makeVehicle('), gameSource.indexOf('let vi=0;'));
  assert.match(makeVehicleBody, /g\.visible=false/);
  assert.match(makeVehicleBody, /coastlineAssetPending=true/);
  assert.doesNotMatch(makeVehicleBody, /new THREE\.Mesh|BoxGeometry|SphereGeometry|MeshPhysicalMaterial/);
  assert.doesNotMatch(assetSwap, /makeNeutralVehiclePlaceholder|neutral-fallback/);
  assert.match(assetSwap, /vehicle\.g\.visible=false/);
  assert.match(assetSwap, /vehicle\.rgsdevModelName='unavailable'/);
});
