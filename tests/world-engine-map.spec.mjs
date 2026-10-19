import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../coastline-sw.js', import.meta.url), 'utf8');
const livingWorld = await readFile(new URL('../living-world.js', import.meta.url), 'utf8');

test('core sandbox delivery removes the map shell and activity triggers', () => {
  assert.match(sw, /applyCoreSandboxTransform/);
  assert.match(sw, /html\.replace\(\/<div id="coastMap"/);\n  assert.match(sw, /id="mapCanvas"/);
  assert.match(sw, /function startMission\(\)\{return false\}/);
  assert.match(sw, /void 0;/);
  assert.match(sw, /function checkLandmarkDiscovery\(\)\{return 0\}/);
  assert.match(sw, /function startGarageChain\(\)\{return false\}/);
});

test('ordinary building interiors are deferred while garage creation remains available', () => {
  assert.match(sw, /for\(const b of buildings\)b\.interior=null;/);
  assert.match(sw, /garageLocations\.some\(s=>s\.building===b\)/);
  assert.match(sw, /b\.interior=createInterior\(b\)/);
});

test('ambient pedestrians remain visible but their simulation and interaction loops are disabled', () => {
  assert.match(sw, /function pedestrianBlocked\(\)\{return false\}/);
  assert.match(sw, /function updatePedestrians\(\)\{\}/);
  assert.match(sw, /function interact\(\)\{if\(paused\)return;/);
  assert.match(sw, /function missionUpdate\(\)\{\}/);
  assert.match(sw, /function updateMissionPrompt\(\)\{\}/);
});

test('living-world rules explicitly mark deferred systems as disabled', () => {
  assert.match(livingWorld, /coreSandbox: true/);
  assert.match(livingWorld, /pedestrianInteraction: false/);
  assert.match(livingWorld, /missions: false/);
  assert.match(livingWorld, /activities: false/);
  assert.match(livingWorld, /map: false/);
});
