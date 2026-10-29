import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('replacement PR keeps gameplay regressions behavioral rather than sign-only', async () => {
  const source = await read('game-v3.html');
  assert.match(source, /steeringKeyState/);
  assert.match(source, /advanceTestFrame/);
  assert.match(source, /setVehiclePosition/);
  assert.match(source, /setWalkPosition/);
  assert.match(source, /data-steer-button/);
  assert.match(source, /isCoastlineCaveThreshold/);
});

test('replacement PR uses the authored Cozy hair path and does not enlarge the head', async () => {
  const interior = await read('coastline-homey-house-interior.js');
  assert.match(interior, /getObjectByName\('head'\)/);
  assert.match(interior, /hairStyle=appearance\.hairStyle/);
  assert.doesNotMatch(interior, /head\.scale\./);
});

test('replacement PR retains CTM as the transition authority and cave vendor world', async () => {
  const transitions = await read('coastline-world-transitions.js');
  const wildlife = await read('coastline-wildlife-assets.js');
  assert.match(transitions, /createTransitionManager/);
  assert.match(transitions, /waterfront-to-electric-dungeon/);
  assert.match(transitions, /electric-lemonade-dungeon/);
  assert.match(wildlife, /loadCaveIntoRoot/);
  assert.match(wildlife, /attachWorld/);
  assert.match(wildlife, /detachWorld/);
});

test('replacement PR keeps the exact Electric Lemonade purchase contract', async () => {
  const source = await read('coastline-electric-lemonade-adventure.js');
  assert.match(source, /ELECTRIC_LEMONADE_PRICE_CB = 10/);
  assert.match(source, /ROCKET_BOOTS_DURATION_MS = 5 \* 60 \* 1000/);
  assert.match(source, /isFacingElectricLemonadeVendor/);
});
