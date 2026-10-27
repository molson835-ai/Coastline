import { test, expect } from '@playwright/test';

test('City grid roads and markings stop before the landscape boundary while the bridge corridor remains open', async ({ page }) => {
  await page.goto('/game-v3.html?beta=city-road-edges', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.__coastlineTest?.roadBoundaryState === 'function', null, { timeout: 30000 });
  const state = await page.evaluate(() => window.__coastlineTest.roadBoundaryState());
  expect(state.roadHalfLength).toBe(690);
  expect(state.markingHalfLength).toBe(660);
  expect(Math.max(...state.gridRoadCoordinates.map(Math.abs))).toBe(600);
  expect(state.bridgeApproachOpen).toBe(true);
});
