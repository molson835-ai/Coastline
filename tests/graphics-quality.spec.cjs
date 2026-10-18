const { test, expect } = require('@playwright/test');

test('world rendering enables detailed terrain, asphalt and soft shadow lighting', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const graphics = await page.evaluate(() => ({
    state: window.__coastlineTest.graphicsState(),
    runtime: window.__coastlineRuntimeSnapshot?.() || null
  }));
  expect(graphics.state.shadows || graphics.runtime?.emergency).toBe(true);
  expect(graphics.state.softShadows).toBe(true);
  expect(graphics.state.terrainTexture).toBe(true);
  expect(graphics.state.asphaltTexture).toBe(true);
  expect(graphics.state.water).toBe(true);
  expect(graphics.state.exposure).toBeGreaterThan(0.5);
  const street = await page.evaluate(() => window.__coastlineTest.streetDetailState());
  expect(street.sidewalkSegments).toBe(168);
  expect(street.curbSegments).toBe(168);
  expect(street.stormDrains).toBe(168);
  expect(errors).toEqual([]);
});
