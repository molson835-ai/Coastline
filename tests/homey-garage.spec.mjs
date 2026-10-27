import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  HOMEY_GARAGE_PAINT_COLORS,
  canUseGarageKeyBoard,
  didCrossGarageThreshold,
  didCrossHouseDoorThreshold,
} from '../coastline-homey-garage.js';
import { getCoastlineVehicleTarget, getCoastlineVehicleUniformScale, getCoastlineVehicleLengthCorrection } from '../coastline-vehicle-sizing.js';

const threshold = { x: 483, z: 488, halfWidth: 5.8 };

test('Homey garage entry requires a forward vehicle crossing through the open threshold', () => {
  assert.equal(didCrossGarageThreshold({ x: 483, z: 487 }, { x: 483, z: 490, heading: 0 }, { ...threshold, direction: 'in' }), true);
  assert.equal(didCrossGarageThreshold({ x: 483, z: 487 }, { x: 483, z: 490, heading: Math.PI }, { ...threshold, direction: 'in' }), false);
  assert.equal(didCrossGarageThreshold({ x: 493, z: 487 }, { x: 493, z: 490, heading: 0 }, { ...threshold, direction: 'in' }), false);
  assert.equal(didCrossGarageThreshold({ x: 483, z: 489 }, { x: 483, z: 490, heading: 0 }, { ...threshold, direction: 'in' }), false);
});

test('garage exit requires a reverse-direction vehicle crossing through the same threshold', () => {
  assert.equal(didCrossGarageThreshold({ x: 483, z: 489 }, { x: 483, z: 487, heading: Math.PI }, { ...threshold, direction: 'out' }), true);
  assert.equal(didCrossGarageThreshold({ x: 483, z: 489 }, { x: 483, z: 487, heading: 0 }, { ...threshold, direction: 'out' }), false);
  assert.equal(didCrossGarageThreshold({ x: 483, z: 487 }, { x: 483, z: 489, heading: Math.PI }, { ...threshold, direction: 'out' }), false);
});

test('key board is available only on foot inside the garage and within reach', () => {
  const board = { x: 487.7, z: 501 };
  const player = { x: 483, z: 500 };
  assert.equal(canUseGarageKeyBoard({ worldId: 'homey-garage', mode: 'walk', player, board }), true);
  assert.equal(canUseGarageKeyBoard({ worldId: 'homey-garage', mode: 'vehicle', player, board }), false);
  assert.equal(canUseGarageKeyBoard({ worldId: 'island', mode: 'walk', player, board }), false);
  assert.equal(canUseGarageKeyBoard({ worldId: 'homey-garage', mode: 'walk', player: { x: 470, z: 500 }, board }), false);
});

test('garage collision props expose resettable tire and wrench interactions', () => {
  const garageSource = readFileSync(new URL('../coastline-homey-garage.js', import.meta.url), 'utf8');
  const islandSource = readFileSync(new URL('../coastline-island-regions.js', import.meta.url), 'utf8');
  const gameSource = readFileSync(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(garageSource, /coastlineGarageProps/);
  assert.match(garageSource, /kind: 'tire'/);
  assert.match(garageSource, /kind: 'wrench'/);
  assert.doesNotMatch(garageSource, /garage-vehicle-exit-sign|garage-house-entry-sign|addSign\(/, 'garage instructions must be represented by architecture, not banners');
  assert.match(garageSource, /garage-house-door-panel-/);
  assert.match(garageSource, /garage-rollup-door-support-/);
  assert.match(garageSource, /garage-workbench-leg-/);
  assert.match(garageSource, /garage-workbench-lower-shelf/);
  assert.match(garageSource, /garage-parts-shelf-bracket-upper-/);
  assert.match(garageSource, /const shelfX = centerX \+ 4\.0, shelfZ = centerZ \+ 15\.4/);
  assert.match(garageSource, /garage-ceiling-crossbeam-/);
  assert.match(garageSource, /garage-key-board-frame', centerX \+ 9\.05/);
  assert.match(garageSource, /centerX - 9[.]075/);
  assert.match(garageSource, /hoseReel\.rotation\.y = Math\.PI \/ 2/);
  assert.match(garageSource, /clockFace\.rotation\.z = Math\.PI \/ 2/);
  assert.match(garageSource, /brickTexture/);
  assert.match(gameSource, /title="Coast Bucks">CB/);
  assert.match(gameSource, /100 Coast Bucks \(CB\)/);
  assert.match(gameSource, /Custom paint applied for '\+price\+' Coast Bucks \(CB\)/);
  assert.match(islandSource, /coastline-residential-backshore-beachgrass/);
  assert.match(islandSource, /coastline-residential-backshore-bayberry/);
  assert.match(islandSource, /coastline-residential-backshore-driftwood/);
  assert.match(islandSource, /coastline-homey-driveway-light/);
});

test('paint palette offers distinct, named finishes without touching non-paint vehicle roles', () => {
  assert.ok(HOMEY_GARAGE_PAINT_COLORS.length >= 6);
  assert.equal(new Set(HOMEY_GARAGE_PAINT_COLORS.map(color => color.hex)).size, HOMEY_GARAGE_PAINT_COLORS.length);
  assert.ok(HOMEY_GARAGE_PAINT_COLORS.every(color => /^#[0-9a-f]{6}$/i.test(color.hex) && color.name));
});


test('house doorway triggers only on a forward on-foot threshold crossing', () => {
  const doorway = { x: 483, z: 515.3, halfWidth: 1.7 };
  assert.equal(didCrossHouseDoorThreshold({ x: 483, z: 515, heading: 0 }, { x: 483, z: 515.5, heading: 0 }, doorway), true);
  assert.equal(didCrossHouseDoorThreshold({ x: 486, z: 515, heading: 0 }, { x: 486, z: 515.5, heading: 0 }, doorway), false);
  assert.equal(didCrossHouseDoorThreshold({ x: 483, z: 516, heading: Math.PI }, { x: 483, z: 515, heading: Math.PI }, doorway), false);
  assert.equal(didCrossHouseDoorThreshold({ x: 483, z: 515.5, heading: 0 }, { x: 483, z: 516, heading: 0 }, doorway), false);
});


test('limousine keeps passenger-car width and height while using a longer proportional body', () => {
  const sedan = getCoastlineVehicleTarget('Sedan');
  const limousine = getCoastlineVehicleTarget('Limousine');
  const shortNameLimo = getCoastlineVehicleTarget('Limo');
  assert.equal(limousine.width, sedan.width);
  assert.equal(limousine.height, sedan.height);
  assert.ok(limousine.length > sedan.length);
  assert.equal(limousine.length, 5.15);
  assert.equal(shortNameLimo.length, limousine.length);
  assert.equal(shortNameLimo.width, limousine.width);
  assert.equal(shortNameLimo.height, limousine.height);
  const sourceBounds = { x: 2.8, y: 2.1, z: 6.2 };
  const scale = getCoastlineVehicleUniformScale(sourceBounds, limousine, true);
  const fitted = { x: sourceBounds.x * scale, y: sourceBounds.y * scale, z: sourceBounds.z * scale };
  const lengthCorrection = getCoastlineVehicleLengthCorrection(fitted, limousine, true);
  assert.ok(Math.abs(fitted.x - limousine.width) < 0.6);
  assert.ok(Math.abs(fitted.y - limousine.height) < 0.6);
  assert.ok(Math.abs(fitted.z * lengthCorrection - limousine.length) < 1e-6);
});

test('optimized furnished house GLB is wired into runtime and standalone package with safe fallback', async () => {
  const { readFileSync } = await import('node:fs');
  const loader = readFileSync(new URL('../coastline-homey-glb-loader.js', import.meta.url), 'utf8');
  const transitions = readFileSync(new URL('../coastline-world-transitions.js', import.meta.url), 'utf8');
  const build = readFileSync(new URL('../scripts/build-itch.mjs', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../coastline-sw.js', import.meta.url), 'utf8');
  assert.match(loader, /coastline_home_interior_part_1\.bin/);
  assert.match(loader, /coastline_home_interior_part_2\.bin/);
  assert.match(loader, /coastline_home_interior_part_3\.bin/);
  assert.match(loader, /EXPECTED_BYTES = 47_528_304/);
  assert.match(loader, /0x46546c67/);\n  assert.match(loader, /crypto\.subtle\.digest\('SHA-256'/);\n  assert.match(loader, /checksum mismatch/);
  assert.match(loader, /parseAsync\(buffer/);
  assert.match(loader, /procedural interior retained/);
  assert.match(transitions, /attachOptimizedHomeInterior/);
  assert.match(build, /coastline-homey-glb-loader\.js/);
  assert.match(build, /coastline_home_interior_part_3\.bin/);
  assert.match(sw, /coastline-static-v62/);
  assert.match(sw, /coastline_home_interior_part_1\.bin/);
});

test('large optimized house GLB chunks are fetched on demand rather than precached', () => {
  const sw = readFileSync(new URL('../coastline-sw.js', import.meta.url), 'utf8');
  const build = readFileSync(new URL('../scripts/build-itch.mjs', import.meta.url), 'utf8');
  assert.ok(sw.includes("url.pathname.includes('/coastline_home_interior_part_')"));
  assert.ok(sw.includes("cache:'no-store'"));
  assert.ok(build.includes("files.filter(file => !file.includes('coastline_home_interior_part_'))"));
});

test('optimized house GLB uses sequential mobile-memory assembly and verifies integrity', () => {
  const loader = readFileSync(new URL('../coastline-homey-glb-loader.js', import.meta.url), 'utf8');
  assert.ok(loader.includes('for (const part of PARTS)'));
  assert.ok(!loader.includes('Promise.all(PARTS'));
  assert.ok(loader.includes("crypto.subtle.digest('SHA-256'"));
  assert.ok(loader.includes('EXPECTED_SHA256'));
  assert.ok(!loader.startsWith("import { GLTFLoader"));
  assert.ok(loader.includes("await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js')"));
});
