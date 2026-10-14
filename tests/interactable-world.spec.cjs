const { test, expect } = require('@playwright/test');

test('buildings, benches, low walls, bicycles, motorcycles and aircraft are interactable', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      buildings: api.buildingState(),
      rideables: api.rideableState().map(v => v.kind),
      errors: api.state().errors
    };
  });
  expect(initial.buildings.count).toBeGreaterThan(10);
  expect(initial.buildings.enterable).toBe(initial.buildings.count);
  expect(initial.buildings.benchCount).toBeGreaterThanOrEqual(4);
  expect(initial.buildings.lowWallCount).toBeGreaterThanOrEqual(4);
  expect(initial.rideables).toEqual(expect.arrayContaining(['bicycle', 'motorcycle', 'aircraft']));
  expect(initial.errors).toEqual([]);

  const entered = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.exitVehicle();
    return api.enterBuildingByName('Harbor Hotel');
  });
  expect(entered).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.buildingState().inside)).toBe('Harbor Hotel');
  const stairHeight = await page.evaluate(() => window.__coastlineTest.interiorElevationAt(-497, -505.2));
  expect(stairHeight).toBeGreaterThan(0);

  await page.evaluate(() => window.__coastlineTest.exitBuilding());
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.state().mode)).toBe('walk');
  await page.evaluate(() => { const api = window.__coastlineTest; const s = api.state(); api.setWalkPosition(s.x, s.z, s.heading); });

  await page.evaluate(() => window.__coastlineTest.keyDown('space'));
  await page.waitForTimeout(250);
  const jumpHeight = await page.evaluate(() => window.__coastlineTest.state().jumpHeight);
  await page.evaluate(() => window.__coastlineTest.keyUp('space'));
  expect(jumpHeight).toBeGreaterThan(0);

  await page.evaluate(() => window.__coastlineTest.enterRideable('aircraft'));
  await page.evaluate(() => window.__coastlineTest.keyDown('space'));
  await page.waitForTimeout(450);
  const flightHeight = await page.evaluate(() => window.__coastlineTest.rideableState().find(v => v.kind === 'aircraft').flightHeight);
  await page.evaluate(() => window.__coastlineTest.keyUp('space'));
  expect(flightHeight).toBeGreaterThan(0);

  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
