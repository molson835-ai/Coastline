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
  assert.ok(islandSource.includes('coastline-villa-path-light-${'));
  assert.ok(islandSource.includes('root.userData.coastlineHomeyDrivewayLights = drivewayLights'));
  assert.ok(islandSource.includes('new THREE.PointLight(0xffd28a, .28, 5.5, 2)'));
  assert.ok(islandSource.includes('fall() { if (this.fallen) return; this.fallen = true'));
  assert.ok(islandSource.includes('reset() { this.fallen = false'));
  assert.equal(islandSource.includes('coastline-homey-driveway-light'), false);
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


test('Homey house uses the regular procedural interior, not the experimental GLB replacement', async () => {
  const { readFileSync } = await import('node:fs');
  const transitions = readFileSync(new URL('../coastline-world-transitions.js', import.meta.url), 'utf8');
  const build = readFileSync(new URL('../scripts/build-itch.mjs', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../coastline-sw.js', import.meta.url), 'utf8');
  assert.ok(transitions.includes("import { buildHomeyHouseInterior } from './coastline-homey-house-interior.js'"));
  assert.ok(transitions.includes('const createHouseRoot=()=>buildHomeyHouseInterior(THREE,'));
  assert.doesNotMatch(transitions, /attachOptimizedHomeInterior|coastline-homey-glb-loader/);
  assert.doesNotMatch(build, /coastline-homey-glb-loader|coastline_home_interior_part_/);
  assert.doesNotMatch(sw, /coastline-homey-glb-loader|coastline_home_interior_part_/);
});


test('procedural Homey interior includes GLB-inspired functional room zoning', async () => {
  const { readFileSync } = await import('node:fs');
  const interior = readFileSync(new URL('../coastline-homey-house-interior.js', import.meta.url), 'utf8');
  for (const feature of ['house-kitchen-island-base','house-kitchen-upper-cabinet-','house-bathroom-vanity','house-bathroom-shower-tray','house-laundry-washer','house-office-desk','house-bedroom-bed-base','house-closet-rail']) assert.ok(interior.includes(feature), 'missing interior feature: ' + feature);
  assert.match(interior, /zones: \['entry', 'living', 'dining', 'kitchen', 'hall', 'bathroom', 'laundry', 'office', 'bedroom', 'closet'\]/);
});


test('Homey house layout has hardwood, one living carpet, a clear route, and an enclosed rear closet', () => {
  const interior = readFileSync(new URL('../coastline-homey-house-interior.js', import.meta.url), 'utf8');
  assert.match(interior, /floor = mat\(0x9b7a54, \.9\)/);
  assert.match(interior, /house-hardwood-plank-seams/);
  assert.equal((interior.match(/house-living-room-rug/g) || []).length, 1);
  assert.doesNotMatch(interior, /house-dining-rug|house-bedroom-rug|house-hall-runner/);
  assert.match(interior, /house-closet-back/);
  assert.match(interior, /house-closet-side-left/);
  assert.match(interior, /house-closet-side-right/);
  assert.match(interior, /house-closet-door-left/);
  assert.match(interior, /house-closet-door-right/);
  assert.match(interior, /house-coffee-table-top', centerX - 2\.55/);
  assert.match(interior, /house-sofa-base/);
  assert.match(interior, /wardrobe: \{ id: 'wardrobe', x: centerX \+ 5\.7, z: centerZ - 8\.65/);
});
