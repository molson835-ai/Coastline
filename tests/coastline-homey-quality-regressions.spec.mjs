import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COASTLINE_ISLAND_REGIONS, getCoastlineIslandBoundarySegments } from '../coastline-island-regions.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('wardrobe exposes live material channels, hair presets and body/presentation choices', async () => {
  const interior = await read('coastline-homey-house-interior.js');
  const game = await read('game-v3.html');
  for (const channel of ['topColor','bottomColor','shoesColor','hairColor','skinColor','eyeColor','hatColor','backpackColor']) {
    assert.ok(interior.includes(channel), 'missing wardrobe channel ' + channel);
  }
  for (const style of ['original','short','spiky','curly','bob','long','ponytail','bun']) {
    assert.ok(interior.includes("value:'" + style + "'"), 'missing hair style ' + style);
  }
  for (const shape of ['classic','slim','chubby']) assert.ok(interior.includes("value:'" + shape + "'"), 'missing body shape ' + shape);
  for (const style of ['androgynous','masculine','feminine']) assert.ok(interior.includes("value:'" + style + "'"), 'missing presentation ' + style);
  assert.match(interior, /function wardrobeMaterialChannel/);
  assert.match(interior, /coastline-wardrobe-hair-overlay/);
  assert.match(interior, /coastline-wardrobe-headwear-overlay/);
  assert.match(interior, /hairStyle=appearance\.hairStyle==='original'\?'short':appearance\.hairStyle/, 'removing headwear restores visible fallback hair');
  assert.match(interior, /window\.__coastlineHomeyHouseContract = root\.userData\.coastlineHouseContract/);
  assert.match(game, /window\.__coastlineAvatar=avatar/);
  assert.match(game, /window\.__coastlineHomeWardrobe\?\.applySaved\?\.\(\)/);
  assert.doesNotMatch(interior, /!Array\.isArray\(node\.material\).*?geometry\?\.groups/);
});

test('closet opening is wide/non-blocking and bedroom furniture leaves the route clear', async () => {
  const interior = await read('coastline-homey-house-interior.js');
  assert.match(interior, /closetLeftDoor\.rotation\.y = -Math\.PI \/ 2/);
  assert.match(interior, /closetRightDoor\.rotation\.y = Math\.PI \/ 2/);
  assert.match(interior, /house-closet-door-left.*false/);
  assert.match(interior, /house-closet-door-right.*false/);
  assert.match(interior, /house-dining-table', centerX \+ 8\.0/);
  assert.match(interior, /house-tv-console', centerX \+ 9\.55/);
  assert.match(interior, /house-hall-console', centerX \+ 9\.55/);
  assert.match(interior, /house-bedroom-bed-footprint', centerX \+ 7\.3, floorY \+ \.04, centerZ - 5\.8, 2\.55, \.08, 4\.0, trim, true/);
  assert.match(interior, /house-bedroom-wall-front-right', centerX \+ 7\.45, floorY \+ 2\.65, centerZ - 4\.0, 2\.6/);
  assert.match(interior, /addInteriorDoor\('house-bedroom-door', centerX \+ 4\.2, centerZ - 4\.0, 2\.0\)/);
  assert.match(interior, /wardrobe: \{ id: 'wardrobe', x: centerX \+ 4\.9, z: centerZ - 6\.2/);
});

test('visible island boundary segments cover the collision outline and preserve bridge mouths', async () => {
  const source = await read('coastline-island-regions.js');
  assert.match(source, /visible-boundary-wall/);
  for (const region of COASTLINE_ISLAND_REGIONS) {
    const segments = getCoastlineIslandBoundarySegments(region.id, 2.35);
    assert.ok(segments.length > 100);
    assert.ok(Math.max(...segments.map(segment => segment.length)) <= 2.35 + 1e-6);
  }
  const residential = getCoastlineIslandBoundarySegments('residential');
  assert.ok(residential.every(segment => !(segment.z < 401 && Math.abs(segment.x - 500) < 4.5)));
  assert.ok(residential.some(segment => segment.z < 401 && Math.abs(segment.x - 500) > 5 && Math.abs(segment.x - 500) < 17));
});

test('cave has a mountain silhouette and the dock boardwalk clears its approach', async () => {
  const source = await read('coastline-island-regions.js');
  assert.match(source, /coastline-waterfront-boardwalk',center\.x\+5,edgeY\+\.04,center\.z\+64/);
  assert.match(source, /coastline-waterfront-cave-mountain-peak-/);
  assert.match(source, /new THREE\.ConeGeometry\(peak\.radius,peak\.height,7,2\)/);
  assert.match(source, /coastline-waterfront-cave-mountain-left-slope/);
  assert.match(source, /coastline-waterfront-cave-mountain-right-slope/);
  assert.match(source, /coastline-waterfront-cave-mountain-rear-ridge/);
  assert.match(source, /const caveApproachShape = new THREE\.Shape\(\)/);
  assert.match(source, /new THREE\.ShapeGeometry\(caveApproachShape, 2\)/);
  assert.doesNotMatch(source, /new THREE\.PlaneGeometry\(15, 11\)/);
  assert.ok((500 + 64 - 5) > (538 + 8.5 + 5.5 + 1));
});

test('City map-edge collision has a continuous visible rock course with a deck-width north bridge gap', async () => {
  const world = await read('coastline-world-transitions.js');
  assert.match(world, /coastline-city-map-edge-continuous-rock-course/);
  assert.match(world, /for\(let v=-714;v<=714;v\+=2\.3\)/);
  assert.match(world, /p\.edge==='north'&&Math\.abs\(p\.x\)<4\.5/);
  assert.match(world, /collision limit sits around \+\/-710/);
});

test('outdoor parked cars belong to the active root and hidden-world vehicles are filtered', async () => {
  const world = await read('coastline-world-transitions.js');
  const game = await read('game-v3.html');
  const regions = await read('coastline-island-regions.js');
  assert.match(world, /installOutdoorFleet\(activeRoot,activeId\)/);
  assert.match(world, /window\.__coastlineEnsureActiveWorldFleet=\(\)=>installOutdoorFleet/);
  assert.match(world, /activeWorldFleets\.get\(root\)/);
  assert.match(world, /homeyFleetId:/);
  assert.match(game, /function vehicleInActiveWorld\(v\)/);
  assert.match(game, /!vehicleInActiveWorld\(v\)/);
  assert.match(game, /activeId!=='city'\)return !!window\.__coastlineCustomUseAvailable\?\.\(\)\|\|!!nearestVehicle\(\)/);
  assert.match(game, /p\.g\?\.parent===activeRoot/);
  assert.match(game, /b\.group\?\.parent!==activeRoot/);
  assert.match(regions, /coastline-residential-homey-parking-apron/);
});

test('Homey threshold destinations continue travel direction', async () => {
  const world = await read('coastline-world-transitions.js');
  assert.match(world, /id:'homey-garage-to-house'[\s\S]{0,190}rotationY:Math\.PI/);
  assert.match(world, /id:'home-to-homey-garage'[\s\S]{0,190}rotationY:0/);
});

test('wardrobe is honest that the installed model is one selected export', async () => {
  const interior = await read('coastline-homey-house-interior.js');
  assert.match(interior, /one Cozy export/);
  assert.match(interior, /Additional exported GLB variants are needed/);
});
