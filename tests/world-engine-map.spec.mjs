import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../game-v3.html', import.meta.url), 'utf8');

test('game provides an accessible interactive minimap and waypoint label', () => {
  assert.match(html, /id="coastMap"[^>]*aria-label="Interactive city map/);
  assert.match(html, /id="mapCanvas" width="300" height="300"/);
  assert.match(html, /id="mapLabel"/);
  assert.match(html, /@media\(max-width:700px\)\{#coastMap/);
});

test('waypoint navigation draws a route and reports distance from player', () => {
  assert.match(html, /function waypointRoute\(\)/);
  assert.match(html, /function drawCoastMap\(\)/);
  assert.match(html, /c\.strokeStyle='#4de9ff'/);
  assert.match(html, /TO DESTINATION/);
  assert.match(html, /Waypoint set — follow the cyan route on your map/);
});

test('map uses the same 200-metre orthogonal street grid as the world', () => {
  assert.match(html, /for\(let v=-600;v<=600;v\+=200\)/);
  assert.match(html, /Math\.round\(v\/200\)\*200/);
  assert.match(html, /if\(now-lastMapDraw>=100\)\{drawCoastMap\(\);lastMapDraw=now\}/);
  assert.match(html, /pollGpuTimerQueries\(\);const gpuQuery=beginGpuTimer\(\);try\{composer\.render\(\)\}finally\{endGpuTimer\(gpuQuery\)\}/);
});
