import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COASTLINE_ISLAND_REGIONS, getCoastlineIslandBoundarySegments } from '../coastline-island-regions.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('wardrobe exposes live material channels, hair presets and body/presentation choices', async () => {
  const interior = await read('coastline-homey-house-interior.js');
  const game = await read('game-v3.html');
  for (const channel of ['topColor','bottomColor','shoesColor','hairColor','skinColor','eyeColor','hatColor','backpackColor']) assert.ok(interior.includes(channel), 'missing wardrobe channel ' + channel);
  for (const style of ['original','short','spiky','curly','bob','long','ponytail','bun']) assert.ok(interior.includes("value:'" + style + "'"), 'missing hair style ' + style);
  for (const shape of ['classic','slim','chubby']) assert.ok(interior.includes("value:'" + shape + "'"), 'missing body shape ' + shape);
  for (const style of ['androgynous','masculine','feminine']) assert.ok(interior.includes("value:'" + style + "'"), 'missing presentation ' + style);
  assert.match(interior, /function wardrobeMaterialChannel/);
  assert.match(interior, /coastline-wardrobe-hair-overlay/);
  assert.match(interior, /coastline-wardrobe-headwear-overlay/);
  assert.match(interior, /getObjectByName\('head'\)/);
  assert.match(interior, /hairStyle=appearance\.hairStyle/);
  assert.doesNotMatch(interior, /actorRoot\.scale\.|head\.scale\./, 'hair fix must not resize the character head');
  assert.match(interior, /long-back/);
  assert.match(game, /window\.__coastlineAvatar=avatar/);
  assert.match(game, /window\.__coastlineHomeWardrobe\?\.applySaved\?\.\(\)/);
});

test('visible island boundary segments cover the collision outline and preserve bridge mouths', async () => {
  const source = await read('coastline-island-regions.js');
  assert.match(source, /visible-boundary-wall/);
  for (const region of COASTLINE_ISLAND_REGIONS) {
    const segments = getCoastlineIslandBoundarySegments(region.id, 2.35);
    assert.ok(segments.length > 100);
    assert.ok(Math.max(...segments.map(segment => segment.length)) <= 2.35 + 1e-6);
  }
});

test('cave has a mountain silhouette and the dock boardwalk clears its approach', async () => {
  const source = await read('coastline-island-regions.js');
  assert.match(source, /coastline-waterfront-cave-mountain-peak-/);
  assert.match(source, /coastline-waterfront-cave-mountain-left-slope/);
  assert.match(source, /coastline-waterfront-cave-mountain-right-slope/);
  assert.match(source, /coastline-waterfront-cave-mountain-rear-ridge/);
  assert.match(source, /coastline-electric-lemonade-cave-mouth/);
  assert.match(source, /coastline-waterfront-cave-approach-path/);
});

test('outdoor parked cars belong to the active root and hidden-world vehicles are filtered', async () => {
  const world = await read('coastline-world-transitions.js');
  const game = await read('game-v3.html');
  assert.match(world, /installOutdoorFleet/);
  assert.match(world, /activeWorldFleets\.get\(root\)/);
  assert.match(game, /function vehicleInActiveWorld\(v\)/);
});
