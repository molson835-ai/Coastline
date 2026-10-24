const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('island start keeps the active vehicle visible and movable after CTM activation', async ({ page }) => {
  await openGame(page);
  const island = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeVehicleVisible())).toBe(true);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 400, Math.PI);
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
  });

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - island.position.x, moved.position.z - island.position.z)).toBeGreaterThan(0.1);
  expect(moved.vehicleIndex).toBe(island.vehicleIndex);
});

test('the physical bridge end zones automatically transition island to City and back', async ({ page }) => {
  await openGame(page);
  const zones = await page.evaluate(() => window.__coastlineTransitionTest.bridgeZones());

  await page.evaluate(({ x, z, heading }) => {
    window.__coastlineTest.setVehiclePosition(x, z, heading);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.islandApproach);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.autoTriggerState())).toMatchObject({ eligible: true, reason: 'ready', world: 'island', transitionId: 'island-to-city' });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000, message: 'island-to-City auto trigger diagnostic: ' + JSON.stringify(await page.evaluate(() => window.__coastlineTransitionTest.autoTriggerState())) }).toBe('city');
  // A fixed City arrival faces back into the City and must not immediately bounce to the island.
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');

  await page.evaluate(({ x, z, heading }) => {
    window.__coastlineTest.setVehiclePosition(x, z, heading);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.cityApproach);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.autoTriggerState())).toMatchObject({ eligible: true, reason: 'ready', world: 'city', transitionId: 'city-to-island' });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000, message: 'City-to-island auto trigger diagnostic: ' + JSON.stringify(await page.evaluate(() => window.__coastlineTransitionTest.autoTriggerState())) }).toBe('island');
});
