import { test, expect } from '@playwright/test';

test('game v3 contains bounded dynamic proximity camera', async ({ page }) => {
  await page.goto('/game-v3.html?beta=proximity-camera', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  const source = await page.locator('body').evaluate(() => document.documentElement.outerHTML);
  expect(source).toContain('COASTLINE_DYNAMIC_PROXIMITY_CAMERA_V1');
  expect(source).toContain('coastlineCameraSafeDesired');
});
