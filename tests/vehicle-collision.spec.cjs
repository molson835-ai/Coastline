const { test, expect } = require('@playwright/test');

test('driving cannot push a vehicle through a building boundary', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  // The generated building at (-500, -500) has a 70-unit depth.
  // Start south of it, facing north, and drive directly toward the wall.
  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(-500, -540, 0));
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));

  const state = await page.evaluate(() => {
    const s = window.__coastlineTest.state();
    return {
      ...s,
      blockedAtFinalPosition: window.__coastlineTest.buildingBlocked(s.x, s.z, 1.65)
    };
  });

  expect(state.mode).toBe('vehicle');
  expect(state.z, 'vehicle should reach the building boundary').toBeLessThanOrEqual(-536.5);
  expect(state.blockedAtFinalPosition, 'vehicle footprint must remain outside the building').toBe(false);
  expect(Number.isFinite(state.vehicleSpeed), 'vehicle speed should remain a valid number').toBe(true);
});
