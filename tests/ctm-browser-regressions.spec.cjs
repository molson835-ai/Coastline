const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('City-first startup keeps the active vehicle visible and movable after CTM activation', async ({ page }) => {
  await openGame(page);
  const city = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(false);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeVehicleVisible())).toBe(true);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 400, Math.PI);
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
  });

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - 500, moved.position.z - 400)).toBeGreaterThan(0.1);
  expect(moved.vehicleIndex).toBe(city.vehicleIndex);
});

test('the physical bridge end zones automatically transition island to City and back', async ({ page }) => {
  await openGame(page);
  const zones = await page.evaluate(() => window.__coastlineTransitionTest.bridgeZones());

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.islandApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('city');
  // A fixed City arrival faces back into the City and must not immediately bounce to the island.
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.cityApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('island');
});
