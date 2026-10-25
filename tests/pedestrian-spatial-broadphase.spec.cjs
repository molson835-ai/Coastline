const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

test('pedestrian population is reduced and spatial-query runtime remains healthy', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html?beta=pedestrian-spatial-broadphase', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 25000 });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 15000 });

  const initial = await page.evaluate(() => ({
    state: window.__coastlineTest.state(),
    engine: window.__coastlineTest.worldEngineState()
  }));
  expect(initial.state.pedestrianCount).toBe(44);
  expect(initial.engine.trackedPedestrians).toBe(44);
  expect(initial.engine.trackedVehicles).toBe(initial.state.vehicleCount);
  expect(initial.state.vehicleCount).toBeGreaterThan(1);

  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 120));
  const after = await page.evaluate(() => ({
    state: window.__coastlineTest.state(),
    engine: window.__coastlineTest.worldEngineState()
  }));
  expect(after.state.pedestrianCount).toBe(44);
  expect(after.engine.trackedPedestrians).toBe(44);
  expect(after.state.performance.systemTimings.pedestrians.samples).toBeGreaterThan(0);
  expect(pageErrors, 'uncaught errors during pedestrian simulation').toEqual([]);
});
