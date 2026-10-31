import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COASTLINE_THREE_CAVE_ENTRANCES,
  COASTLINE_THREE_CAVE_TRANSITIONS,
  getCoastlineThreeCaveAt,
} from '../coastline-three-cave-system.js';

test('three cave entrances are ordered left, center, right with center tied to rocket-boots cavern', () => {
  assert.deepEqual(COASTLINE_THREE_CAVE_ENTRANCES.map(cave => cave.id), [
    'left', 'center', 'right',
  ]);
  assert.equal(COASTLINE_THREE_CAVE_ENTRANCES.find(cave => cave.id === 'center').interior, 'rocket-boots');
  assert.equal(COASTLINE_THREE_CAVE_ENTRANCES.find(cave => cave.id === 'left').interior, 'cavern-left');
  assert.equal(COASTLINE_THREE_CAVE_ENTRANCES.find(cave => cave.id === 'right').interior, 'cavern-right');
});

test('three cave entrance zones do not overlap and use the shared waterfront cave approach', () => {
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES) {
    assert.equal(cave.world, 'waterfront');
    assert.ok(cave.radius > 0 && cave.radius <= 2.5);
    assert.equal(cave.z, 542.5);
  }
  assert.ok(COASTLINE_THREE_CAVE_ENTRANCES[0].x < COASTLINE_THREE_CAVE_ENTRANCES[1].x);
  assert.ok(COASTLINE_THREE_CAVE_ENTRANCES[1].x < COASTLINE_THREE_CAVE_ENTRANCES[2].x);
});

test('left and right caves get dedicated CTM entry/return pairs while center preserves the existing transition', () => {
  assert.deepEqual(COASTLINE_THREE_CAVE_TRANSITIONS.map(t => t.entry), [
    'waterfront-to-electric-dungeon-left',
    'waterfront-to-electric-dungeon',
    'waterfront-to-electric-dungeon-right',
  ]);
  assert.deepEqual(COASTLINE_THREE_CAVE_TRANSITIONS.map(t => t.returnTransition), [
    'electric-dungeon-left-to-waterfront',
    'electric-dungeon-to-waterfront',
    'electric-dungeon-right-to-waterfront',
  ]);
  assert.ok(COASTLINE_THREE_CAVE_TRANSITIONS.every(t => t.toWorld === 'electric-lemonade-dungeon'));
});

test('cave lookup is distance-based and deterministic', () => {
  assert.equal(getCoastlineThreeCaveAt(520, 542.5)?.id, 'center');
  assert.equal(getCoastlineThreeCaveAt(510, 542.5)?.id, 'left');
  assert.equal(getCoastlineThreeCaveAt(530, 542.5)?.id, 'right');
  assert.equal(getCoastlineThreeCaveAt(500, 500), null);
});
