import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../coastline-sw.js', import.meta.url), 'utf8');
const livingWorld = await readFile(new URL('../living-world.js', import.meta.url), 'utf8');

test('core sandbox delivery removes the map and mission shell', () => {
  assert.match(sw, /applyCoreSandboxTransform/);
  assert.match(sw, /id=\\"coastMap\\"/);
  assert.match(sw, /startMission\(\);/);
  assert.match(sw, /void 0;/);
});

test('ordinary building interiors are deferred while garage creation remains available', () => {
  assert.match(sw, /for\(const b of buildings\)b\.interior=null;/);
  assert.match(sw, /garageLocations\.some\(s=>s\.building===b\)/);
  assert.match(sw, /b\.interior=createInterior\(b\)/);
});

test('living-world rules explicitly mark deferred systems as disabled', () => {
  assert.match(livingWorld, /coreSandbox: true/);
  assert.match(livingWorld, /pedestrianInteraction: false/);
  assert.match(livingWorld, /missions: false/);
  assert.match(livingWorld, /activities: false/);
  assert.match(livingWorld, /map: false/);
});
