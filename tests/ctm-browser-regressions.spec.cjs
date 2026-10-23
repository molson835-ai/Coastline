const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('World 2 keeps the active vehicle visible and movable after CTM activation', async ({ page }) => {
  await openGame(page);
  const city = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeVehicleVisible())).toBe(true);

  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - 500, moved.position.z - 500)).toBeGreaterThan(0.1);
  expect(moved.vehicleIndex).toBe(city.vehicleIndex);
});

test('the physical bridge end zones automatically transition City to World 2 and back', async ({ page }) => {
  await openGame(page);
  const zones = await page.evaluate(() => window.__coastlineTransitionTest.bridgeZones());

  await page.evaluate(({ x, z, heading }) => {
    window.__coastlineTest.setVehiclePosition(x, z, heading);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.cityApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('island');

  await page.evaluate(({ x, z, heading }) => {
    window.__coastlineTest.setVehiclePosition(x, z, heading);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.islandApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('city');
});
