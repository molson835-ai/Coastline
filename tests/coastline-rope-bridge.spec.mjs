import test from 'node:test';
import assert from 'node:assert/strict';
import { COASTLINE_ROPE_BRIDGE_CONFIG } from '../coastline-world-transitions.js';
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
