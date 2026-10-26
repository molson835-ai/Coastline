import test from 'node:test';
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
  assert.equal(limousine.width, sedan.width);
  assert.equal(limousine.height, sedan.height);
  assert.ok(limousine.length > sedan.length);
  assert.equal(limousine.length, 5.15);
  const sourceBounds = { x: 2.8, y: 2.1, z: 6.2 };
  const scale = getCoastlineVehicleUniformScale(sourceBounds, limousine, true);
  const fitted = { x: sourceBounds.x * scale, y: sourceBounds.y * scale, z: sourceBounds.z * scale };
  const lengthCorrection = getCoastlineVehicleLengthCorrection(fitted, limousine, true);
  assert.ok(Math.abs(fitted.x - limousine.width) < 0.6);
  assert.ok(Math.abs(fitted.y - limousine.height) < 0.6);
  assert.ok(Math.abs(fitted.z * lengthCorrection - limousine.length) < 1e-6);
});
