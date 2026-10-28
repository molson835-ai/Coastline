import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COASTLINE_ISLAND_REGIONS,
  COASTLINE_WORLD_POPULATION_LIMITS,
  getCoastlineIslandRegion,
  validateCoastlineIslandManifest,
  isCoastlineIslandPointInside,
  getCoastlineIslandBoundarySegments,
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


test('water depth classification is stable and only shallow water is traversable on foot', async () => {
  const {
    getCoastlineWaterDepthBand,
    canTraverseCoastlineWater,
  } = await import('../coastline-island-regions.js');
  assert.equal(getCoastlineWaterDepthBand(0.2), 'shore');
  assert.equal(getCoastlineWaterDepthBand(0.8), 'shallow');
  assert.equal(getCoastlineWaterDepthBand(2), 'mid');
  assert.equal(getCoastlineWaterDepthBand(8), 'deep');
  assert.equal(getCoastlineWaterDepthBand(Number.NaN), 'deep');
  assert.equal(canTraverseCoastlineWater(0.8, 'on-foot'), true);
  assert.equal(canTraverseCoastlineWater(0.8, 'vehicle'), false);
  assert.equal(canTraverseCoastlineWater(2, 'on-foot'), false);
  assert.equal(canTraverseCoastlineWater(8, 'vehicle'), false);
});

test('Homey and cave island scenery expose named natural-detail contracts', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../coastline-island-regions.js', import.meta.url), 'utf8');
  assert.match(source, /coastline-residential-garden-groundcover/);
  assert.match(source, /coastline-residential-neighborhood-shrubs/);
  assert.match(source, /coastline-waterfront-cave-mountain/);
  assert.match(source, /coastline-waterfront-cave-approach-path/);
  assert.match(source, /coastline-waterfront-lemonade-counter/);
  assert.match(source, /coastline-waterfront-lemonade-price-sign/);
  assert.doesNotMatch(source, /coastline-waterfront-resort-main-building/);
});


test('waterfront shallow-water secret path is foot-only and does not widen the vehicle bridge lane', async () => {
  const { isCoastlineShallowWaterPath } = await import('../coastline-island-regions.js');
  assert.equal(isCoastlineShallowWaterPath(620, 540, 'waterfront', 'on-foot'), true);
  assert.equal(isCoastlineShallowWaterPath(620, 540, 'waterfront', 'vehicle'), false);
  assert.equal(isCoastlineShallowWaterPath(620, 540, 'port', 'on-foot'), false);
  assert.equal(isCoastlineShallowWaterPath(650, 540, 'waterfront', 'on-foot'), false);
  assert.equal(isCoastlineShallowWaterPath(620, 500, 'waterfront', 'on-foot'), false);
  const fs = await import('node:fs/promises');
  const game = await fs.readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(game, /isCoastlineShallowWaterPath\(x,z,regionId,player\.mode==='walk'\?'on-foot':player\.mode\)/);
});

test('active island roots expose their authored ground elevation for vehicle placement', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../coastline-island-regions.js', import.meta.url), 'utf8');
  const transitions = await fs.readFile(new URL('../coastline-world-transitions.js', import.meta.url), 'utf8');
  const game = await fs.readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(source, /root\.userData\.coastlineGroundY = edgeY/);
  assert.match(transitions, /window\.__coastlineIslandRoot=root/);
  assert.match(transitions, /window\.__coastlineRegionRoot=root/);
  assert.match(game, /root\?\.userData\?\.coastlineGroundY/);
});


test('all island shorelines are irregular and retain their bridge landing points', () => {
  for (const id of ['downtown', 'residential', 'waterfront', 'port']) {
    assert.equal(isCoastlineIslandPointInside(500, 500, id), true, id + ' must include its center');
    assert.equal(isCoastlineIslandPointInside(650, 500, id), false, id + ' must reject points beyond its natural edge');
  }
  assert.equal(isCoastlineIslandPointInside(610, 500, 'waterfront'), true, 'east Waterfront bridge landing stays connected');
  assert.equal(isCoastlineIslandPointInside(390, 500, 'waterfront'), true, 'west Waterfront bridge landing stays connected');
  assert.equal(isCoastlineIslandPointInside(390, 500, 'port'), true, 'Port bridge landing stays connected');
  assert.equal(isCoastlineIslandPointInside(500, 390, 'residential'), true, 'Homey bridge landing stays connected');
});


test('visible shoreline barriers follow island collision shapes in short segments and leave bridge landings open', () => {
  for (const region of COASTLINE_ISLAND_REGIONS) {
    const segments = getCoastlineIslandBoundarySegments(region.id, 2.35);
    assert.ok(segments.length > 100, region.id + ' should have continuous visible shoreline coverage');
    assert.ok(segments.every(segment => segment.length <= 2.35 + 1e-6), region.id + ' has an oversized visual barrier gap');
    assert.ok(segments.every(segment => Number.isFinite(segment.x) && Number.isFinite(segment.z) && Number.isFinite(segment.rotationY)));
  }
  const homey = getCoastlineIslandBoundarySegments('residential');
  assert.ok(homey.some(segment => segment.z < 405 && Math.abs(segment.x - 500) > 17));
  assert.ok(!homey.some(segment => segment.z < 401 && Math.abs(segment.x - 500) < 4.5), 'north bridge deck mouth must remain open');
  assert.ok(homey.some(segment => segment.z < 401 && Math.abs(segment.x - 500) > 5 && Math.abs(segment.x - 500) < 17), 'shoreline immediately beside the bridge must still have visible barriers');
});


test('City Island tree generation uses a readable palm silhouette without generic deciduous variants', async () => {
  const fs = await import('node:fs/promises');
  const game = await fs.readFile(new URL('../game-v3.html', import.meta.url), 'utf8');
  assert.match(game, /treePalmFrondGeo/);
  assert.match(game, /treePalmCrownGeo/);
  assert.match(game, /variant:'palm'/);
  assert.doesNotMatch(game, /if\(variant===0\).*?else if\(variant===1\)/s);
  assert.doesNotMatch(game, /treeRoundGeo/);
});
