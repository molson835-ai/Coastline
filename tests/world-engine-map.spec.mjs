import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
const worldModel = await readFile(new URL('../world-model.js', import.meta.url), 'utf8');

test('foundation build omits the interactive minimap and waypoint UI', () => {
  assert.doesNotMatch(html, /id="coastMap"/);
  assert.doesNotMatch(html, /id="mapCanvas"/);
  assert.doesNotMatch(html, /id="mapLabel"/);
  assert.doesNotMatch(html, /TAP MAP · SET DESTINATION/);
});

test('foundation build omits waypoint selection and route drawing', () => {
  assert.doesNotMatch(html, /function waypointRoute\(/);
  assert.doesNotMatch(html, /function drawCoastMap\(/);
  assert.doesNotMatch(html, /TO DESTINATION/);
  assert.doesNotMatch(html, /Waypoint set — follow the cyan route on your map/);
});

test('removing the map leaves the shared world street grid intact', () => {
  assert.match(worldModel, /roadSpacing = 200/);
  assert.match(worldModel, /Math\.round\(x\/roadSpacing\)\*roadSpacing/);
  assert.match(worldModel, /Math\.round\(z\/roadSpacing\)\*roadSpacing/);
});

test('foundation phase keeps courier missions and landmark discovery inactive', () => {
  assert.match(html, /const ENABLE_COURIER_MISSION=false/);
  assert.match(html, /function startMission\(\)\{if\(!ENABLE_COURIER_MISSION\|\|missionState==='deliver'\)return false/);
  assert.doesNotMatch(html, /function checkLandmarkDiscovery\(/);
  assert.doesNotMatch(html, /Landmark discovered:/);
});
