import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COASTLINE_ISLAND_REGIONS,
  COASTLINE_WORLD_POPULATION_LIMITS,
  getCoastlineIslandRegion,
  validateCoastlineIslandManifest,
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
