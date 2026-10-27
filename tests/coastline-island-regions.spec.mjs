import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COASTLINE_ISLAND_REGIONS,
  COASTLINE_WORLD_POPULATION_LIMITS,
  getCoastlineIslandRegion,
  validateCoastlineIslandManifest,
  isCoastlineIslandPointInside,
} from '../coastline-island-regions.js';

test('four-island manifest defines four distinct, named coastal regions', () => {
  assert.equal(COASTLINE_ISLAND_REGIONS.length, 4);
  assert.deepEqual(COASTLINE_ISLAND_REGIONS.map(region => region.id), [
    'downtown', 'residential', 'waterfront', 'port',
  ]);
  assert.equal(new Set(COASTLINE_ISLAND_REGIONS.map(region => region.id)).size, 4);
  assert.equal(validateCoastlineIslandManifest(), true);
});

test('each island has a bounded simulation budget and a valid neighboring route', () => {
  for (const region of COASTLINE_ISLAND_REGIONS) {
    assert.ok(region.population.traffic >= 0 && region.population.traffic <= 12);
    assert.ok(region.population.pedestrians >= 0 && region.population.pedestrians <= 16);
    assert.ok(region.bounds.halfWidth > 0);
    assert.ok(region.bounds.halfDepth > 0);
    assert.ok(getCoastlineIslandRegion(region.bridge.target));
  }
  assert.deepEqual(COASTLINE_WORLD_POPULATION_LIMITS.port, { traffic: 8, pedestrians: 10 });
});

test('manifest validator rejects duplicate ids and invalid population budgets', () => {
  const [first, second, ...rest] = COASTLINE_ISLAND_REGIONS;
  assert.throws(() => validateCoastlineIslandManifest([first, { ...second, id: first.id }, ...rest]), /duplicate/i);
  assert.throws(() => validateCoastlineIslandManifest([
    { ...first, population: { traffic: -1, pedestrians: 2 } }, second, ...rest,
  ]), /invalid traffic budget/i);
});


test('residential island shoreline is irregular while its CTM bridge landings remain connected', () => {
  assert.equal(isCoastlineIslandPointInside(500, 390, 'residential'), true);
  assert.equal(isCoastlineIslandPointInside(610, 500, 'residential'), true);
  assert.equal(isCoastlineIslandPointInside(500, 500, 'residential'), true);
  assert.equal(isCoastlineIslandPointInside(610, 610, 'residential'), false);
  assert.equal(isCoastlineIslandPointInside(390, 610, 'residential'), false);
  assert.equal(isCoastlineIslandPointInside(Number.NaN, 500, 'residential'), false);
});

test('other CTM island regions retain bounded shorelines', () => {
  assert.equal(isCoastlineIslandPointInside(500, 500, 'waterfront'), true);
  assert.equal(isCoastlineIslandPointInside(650, 500, 'waterfront'), false);
  assert.equal(isCoastlineIslandPointInside(500, 500, 'unknown'), false);
});


test('all islands use developed-quality scenery while retaining bounded population budgets', () => {
  for (const region of COASTLINE_ISLAND_REGIONS) {
    assert.equal(region.contentDensity, 'developed', region.id + ' should not be an empty placeholder');
    assert.equal(region.visual.waterline, true);
    assert.ok(region.visual.vegetation && region.visual.vegetation.length > 0);
  }
});

test('Homey driveway keeps individually interactive small lamps and removes duplicate large posts', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../coastline-island-regions.js', import.meta.url), 'utf8');
  assert.match(source, /coastline-homey-driveway-small-lamp-/);
  assert.match(source, /radius:\.42/);
  assert.match(source, /fall\(\)\{if\(this\.fallen\)return/);
  assert.match(source, /reset\(\)\{this\.fallen=false/);
  assert.doesNotMatch(source, /coastline-villa-path-light-posts/);
});
