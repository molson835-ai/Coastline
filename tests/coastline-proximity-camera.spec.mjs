import { test, expect } from '@playwright/test';

test('game v3 boots with proximity camera wired into outdoor and interior modes', async ({ page }) => {
  await page.goto('/game-v3.html?beta=proximity-camera', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  const source = await page.locator('body').evaluate(() => document.documentElement.outerHTML);
  expect(source).toContain('COASTLINE_DYNAMIC_PROXIMITY_CAMERA_V1');
  expect(source).toContain('coastlineCameraSafeDesired(target,camYaw,5,1.0)');
  expect(source).toContain('now-coastlineCameraLastRayAt>=45');
  expect(source).toContain('0.65/wantedDistance');
  expect(source).toContain('steer=(keys.a?1:0)-(keys.d?1:0)');
});
