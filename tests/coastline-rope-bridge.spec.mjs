import test from 'node:test';
import assert from 'node:assert/strict';
import { COASTLINE_ROPE_BRIDGE_CONFIG, coastlineRopeBridgeDeckY } from '../coastline-world-transitions.js';
import { COASTLINE_ISLAND_ELEVATION, COASTLINE_ISLAND_WATER_DROP } from '../coastline-island-regions.js';

test('CTM bridges are configured as narrow single-lane rope bridges', () => {
  assert.equal(COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth, 5.2);
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth < 6);
  assert.equal(COASTLINE_ROPE_BRIDGE_CONFIG.plankCountPer100Units, 40);
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.plankGap > 0);
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.ropeRadius > 0);
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.deckSag >= 2);
});

test('rope bridge posts are close enough to support sagging ropes', () => {
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.postSpacing <= 5);
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.railHeight > 1.4 && COASTLINE_ROPE_BRIDGE_CONFIG.railHeight < 1.8);
});

test('island terrain and bridge approaches are raised above the sea surface', () => {
  assert.equal(COASTLINE_ISLAND_ELEVATION, 6);
  assert.ok(COASTLINE_ISLAND_WATER_DROP > COASTLINE_ROPE_BRIDGE_CONFIG.deckSag + 0.17 / 2 + 0.7,
    'water must stay below the lowest plank by a visible clearance margin');
});

test('island top surfaces use upward-facing geometry and city water sits below the sagging approach deck', async () => {
  const fs = await import('node:fs/promises');
  const islandSource = await fs.readFile(new URL('../coastline-island-regions.js', import.meta.url), 'utf8');
  const gameSource = await fs.readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(islandSource, /shore\.rotation\.x = -Math\.PI \/ 2/);
  assert.match(islandSource, /land\.rotation\.x = -Math\.PI \/ 2/);
  assert.match(gameSource, /water\.position\.set\(0,\.2,-900\)/);
  assert.ok(.2 < 3 - COASTLINE_ROPE_BRIDGE_CONFIG.deckSag + .02 - .17 / 2,
    'city waterline must sit below the lowest bridge plank');
});


test('vehicle bridge surface follows the same sag profile as the visible plank deck', () => {
  const base = 3.04;
  assert.ok(Math.abs(coastlineRopeBridgeDeckY(base, 0) - (base + .02)) < 1e-9);
  assert.ok(Math.abs(coastlineRopeBridgeDeckY(base, 1) - (base + .02)) < 1e-9);
  assert.ok(Math.abs(coastlineRopeBridgeDeckY(base, .5) - (base + .02 - COASTLINE_ROPE_BRIDGE_CONFIG.deckSag)) < 1e-9);
  assert.ok(coastlineRopeBridgeDeckY(base, .5) < coastlineRopeBridgeDeckY(base, .1));
});

test('City boundary scenery leaves the north bridge corridor open and vehicle grounding is bridge-aware', async () => {
  const fs = await import('node:fs/promises');
  const transitions = await fs.readFile(new URL('../coastline-world-transitions.js', import.meta.url), 'utf8');
  const game = await fs.readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(transitions, /coastline-city-map-edge-boundary/);
  assert.match(transitions, /p\.edge==='north'&&Math\.abs\(p\.x\)<=13/);
  assert.match(transitions, /window\.__coastlineBridgeGroundY=bridgeGroundY/);
  assert.match(game, /function vehicleGroundY\(x,z\)/);
  assert.match(game, /vehicleGroundY\(v\.x,v\.z\)/);
  assert.ok(game.includes('Math.abs(x)+r>=710||Math.abs(z)+r>=710'));
});
