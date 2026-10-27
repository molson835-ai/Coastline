import { test, expect } from '@playwright/test';

test('game v3 boots with proximity camera wired into outdoor and interior modes', async ({ page }) => {
  await page.goto('/game-v3.html?beta=proximity-camera', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  const source = await page.locator('body').evaluate(() => document.documentElement.outerHTML);
  expect(source).toContain('COASTLINE_DYNAMIC_PROXIMITY_CAMERA_V1');
  expect(source).toContain('coastlineCameraSafeDesired(target,camYaw,5,1.0)');
  expect(source).toContain('now-coastlineCameraLastRayAt>=45');
  expect(source).toContain('0.65/wantedDistance');
  expect(source).toContain('steer=(keys.d?1:0)-(keys.a?1:0)');
  const occlusion = await page.evaluate(() => window.__coastlineTest.cameraOcclusionProbe());
  expect(occlusion.desiredZ).toBeGreaterThan(occlusion.targetZ - 7);
  expect(occlusion.desiredZ).toBeLessThan(occlusion.targetZ - 1.65);
  expect(occlusion.distance).toBeLessThan(4);
});

test('vehicle left and right inputs turn toward the matching side', async ({ page }) => {
  await page.goto('/game-v3.html?beta=steering-regression', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.__coastlineTest?.steeringProbe === 'function', null, { timeout: 30000 });
  const headings = await page.evaluate(() => ({
    left: window.__coastlineTest.steeringProbe('a'),
    right: window.__coastlineTest.steeringProbe('d'),
  }));
  expect(headings.left).toBeLessThan(0);
  expect(headings.right).toBeGreaterThan(0);
});
