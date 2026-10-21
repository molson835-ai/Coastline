import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../coastline-sw.js', import.meta.url), 'utf8');
const livingWorld = await readFile(new URL('../living-world.js', import.meta.url), 'utf8');

test('service worker remains a delivery/cache layer and does not strip the map or gameplay systems', () => {
  assert.doesNotMatch(sw, /applyCoreSandboxTransform/);
  assert.doesNotMatch(sw, /mapCanvas.*1.*1/);
  assert.doesNotMatch(sw, /function startMission\(\)\{return false\}/);
  assert.doesNotMatch(sw, /function missionUpdate\(\)\{\}/);
});

test('ordinary building interiors are deferred while garage creation remains available', () => {
  assert.match(sw, /game-v3\.html/);
  assert.match(livingWorld, /createLivingWorldReplayability/);
});

test('living-world keeps deterministic ambient behavior and event-driven systems enabled', () => {
  assert.doesNotMatch(livingWorld, /coreSandbox:\s*true/);
  assert.match(livingWorld, /residentDecision/);
  assert.match(livingWorld, /wildlifeDecision/);
  assert.match(livingWorld, /localAvoidance/);
  assert.match(livingWorld, /presentationRuntime/);
  assert.match(livingWorld, /activities/);
  assert.match(livingWorld, /wildlifeBehaviors/);
});
