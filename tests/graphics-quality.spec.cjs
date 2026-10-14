const { test, expect } = require('@playwright/test');

test('world rendering enables detailed terrain, asphalt and soft shadow lighting', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const graphics = await page.evaluate(() => window.__coastlineTest.graphicsState());
  expect(graphics.shadows).toBe(true);
  expect(graphics.softShadows).toBe(true);
  expect(graphics.terrainTexture).toBe(true);
  expect(graphics.asphaltTexture).toBe(true);
  expect(graphics.water).toBe(true);
  expect(graphics.exposure).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});
