import test from 'node:test';
import assert from 'node:assert/strict';
import { COASTLINE_ROPE_BRIDGE_CONFIG } from '../coastline-world-transitions.js';

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
  assert.ok(COASTLINE_ROPE_BRIDGE_CONFIG.railHeight > 2);
});
