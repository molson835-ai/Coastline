const { test, expect } = require('@playwright/test');

test('CTM browser bridge returns serializable status and isolates World 2 city collisions', async ({ page }) => {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
  const city = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  const island = await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(island.activeWorldId).toBe('island');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);

  // Drive the actual runtime input path rather than relying on a private test-only keyDown helper.
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - 500, moved.position.z - 500)).toBeGreaterThan(0.1);
  const cityReturn = await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  expect(cityReturn.activeWorldId).toBe('city');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(false);
  const restored = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(restored.position.x).toBeCloseTo(city.position.x, 5);
  expect(restored.position.z).toBeCloseTo(city.position.z, 5);
});
