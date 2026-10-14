import test from 'node:test';
import assert from 'node:assert/strict';
import { DOUGLASSVILLE_LAYOUT, distanceToPolyline, nearestRegionalRoad } from '../douglassville-layout.js';

test('regional map includes Douglassville highway, arterial, rail, river, and creek corridors', () => {
  const ids = DOUGLASSVILLE_LAYOUT.roads.map(road => road.id);
  assert.ok(ids.includes('us-422'));
  assert.ok(ids.includes('pa-662'));
  assert.ok(ids.includes('old-philadelphia-pike'));
  assert.ok(DOUGLASSVILLE_LAYOUT.rail.points.length >= 4);
  assert.ok(DOUGLASSVILLE_LAYOUT.creek.points.length >= 5);
  assert.ok(DOUGLASSVILLE_LAYOUT.river.points.length >= 5);
});

test('road corridors are curved and have realistic width hierarchy', () => {
  const highway = DOUGLASSVILLE_LAYOUT.roads.find(road => road.id === 'us-422');
  const local = DOUGLASSVILLE_LAYOUT.roads.find(road => road.id === 'geiger-road');
  assert.ok(highway.width > local.width * 2);
  assert.ok(new Set(highway.points.map(point => point[1])).size > 3);
  assert.ok(distanceToPolyline(0, 30, highway.points) < 100);
});

test('nearest regional road returns useful route metadata', () => {
  const road = nearestRegionalRoad(0, 30);
  assert.equal(road.id, 'us-422');
  assert.equal(road.name, 'US 422 / Benjamin Franklin Highway');
  assert.ok(road.distance >= 0);
});

test('local historic and recreational landmarks are represented', () => {
  const names = DOUGLASSVILLE_LAYOUT.landmarks.map(item => item.name);
  assert.ok(names.includes('Morlatton Village'));
  assert.ok(names.includes('White Horse Inn'));
  assert.ok(names.includes('Monocacy Hill woodland'));
  assert.ok(names.includes('Amity Community Park'));
});

test('game renders the regional road network and landmark symbols on the minimap', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(html, /import \{ DOUGLASSVILLE_LAYOUT \} from '\.\/douglassville-layout\.js'/);
  assert.match(html, /function buildRegionalRoads\(\)/);
  assert.match(html, /buildRegionalRoads\(\)/);
  assert.match(html, /DOUGLASSVILLE_LAYOUT\.landmarks/);
  assert.match(html, /'US 422'/);
  assert.match(html, /'PA 662'/);
});
