const { test, expect } = require('@playwright/test');

test('the city has distinct architecture, storefronts, trees, residents and terrain', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const world = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const buildings = api.buildingRoster();
    const trees = api.treeRoster();
    const people = api.pedestrianRoster();
    const terrainSamples = [[73,81],[119,173],[337,281],[-327,271],[-411,-367],[527,-249],[615,517]]
      .map(([x,z]) => api.groundY(x,z));
    return {
      buildings,
      trees,
      people,
      terrainSamples,
      runtimeErrors: api.state().errors
    };
  });

  expect(new Set(world.buildings.map(b => b.style)).size).toBeGreaterThanOrEqual(5);
  expect(new Set(world.buildings.map(b => b.sign)).size).toBeGreaterThanOrEqual(10);
  expect(world.buildings.every(b => Boolean(b.sign))).toBe(true);

  expect(new Set(world.trees.map(t => t.variant)).size).toBeGreaterThanOrEqual(3);
  expect(new Set(world.trees.map(t => t.leaf)).size).toBeGreaterThanOrEqual(3);
  expect(new Set(world.trees.map(t => Math.round(t.height * 10))).size).toBeGreaterThan(10);

  expect(world.people.length).toBeGreaterThanOrEqual(40);
  expect(new Set(world.people.map(p => p.name)).size).toBeGreaterThanOrEqual(40);
  expect(new Set(world.people.map(p => p.story)).size).toBeGreaterThanOrEqual(40);
  expect(new Set(world.people.map(p => JSON.stringify(p.look))).size).toBeGreaterThanOrEqual(30);
  expect(new Set(world.people.map(p => p.job)).size).toBeGreaterThanOrEqual(10);
  expect(new Set(world.people.map(p => p.activity)).size).toBeGreaterThanOrEqual(4);

  expect(Math.max(...world.terrainSamples) - Math.min(...world.terrainSamples)).toBeGreaterThan(2);
  expect(world.runtimeErrors).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
