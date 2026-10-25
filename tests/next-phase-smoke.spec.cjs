const { test, expect } = require('@playwright/test');

test('public beta boots the full Coastline world without map-only UI', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/game-v3\.html\?beta=202610\d+/);
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.locator('#mode')).toHaveText('DRIVING');
  await expect(page.locator('#coastMap')).toHaveCount(0);
  await expect(page.getByText('TAP MAP · SET DESTINATION')).toHaveCount(0);

  const systems = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      state: api.state(),
      world: api.worldEngineState(),
      sky: api.skyState(),
      graphics: api.graphicsState(),
      buildings: api.buildingState()
    };
  });
  expect(systems.state.errors).toEqual([]);
  expect(systems.state.mode).toBe('vehicle');
  expect(systems.state.vehicleCount).toBeGreaterThan(10);
  expect(systems.state.pedestrianCount).toBeGreaterThan(50);
  expect(systems.world.trackedEntities).toBeGreaterThan(50);
  expect(systems.world.trackedVehicles).toBeGreaterThan(10);
  expect(systems.buildings.enterable).toBeGreaterThan(0);
  expect(systems.graphics.shadows).toBe(true);
  expect(systems.sky.weather).toBeTruthy();
  expect(errors).toEqual([]);
});
