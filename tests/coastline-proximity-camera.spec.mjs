import { test, expect } from '@playwright/test';

test('game v3 boots with proximity camera wired into outdoor and interior modes', async ({ page }) => {
  await page.goto('/game-v3.html?beta=proximity-camera', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  const source = await page.locator('body').evaluate(() => document.documentElement.outerHTML);
  expect(source).toContain('COASTLINE_DYNAMIC_PROXIMITY_CAMERA_V1');
  expect(source).toContain('coastlineCameraSafeDesired(target,camYaw,5,1.0)');
  expect(source).toContain('now-coastlineCameraLastRayAt>=45');
  expect(source).toContain('0.65/wantedDistance');
  const occlusion = await page.evaluate(() => window.__coastlineTest.cameraOcclusionProbe());
  expect(occlusion.desiredZ).toBeGreaterThan(occlusion.targetZ - 7);
  expect(occlusion.desiredZ).toBeLessThan(occlusion.targetZ - 1.65);
  expect(occlusion.distance).toBeLessThan(4);
});

test('vehicle steering follows perceived left/right trajectory in forward and reverse', async ({ page }) => {
  await page.goto('/game-v3.html?beta=steering-regression', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.__coastlineTest?.steeringTrajectoryProbe === 'function', null, { timeout: 30000 });
  const trajectory = await page.evaluate(() => ({
    forwardLeft: window.__coastlineTest.steeringTrajectoryProbe('a'),
    forwardRight: window.__coastlineTest.steeringTrajectoryProbe('d'),
    reverseLeft: window.__coastlineTest.steeringTrajectoryProbe('a', true),
    reverseRight: window.__coastlineTest.steeringTrajectoryProbe('d', true),
  }));
  expect(trajectory.forwardLeft.dx, 'A should move the car toward screen-left when driving forward').toBeLessThan(0);
  expect(trajectory.forwardRight.dx, 'D should move the car toward screen-right when driving forward').toBeGreaterThan(0);
  expect(trajectory.reverseLeft.dx, 'A should move the car toward screen-left while reversing').toBeLessThan(0);
  expect(trajectory.reverseRight.dx, 'D should move the car toward screen-right while reversing').toBeGreaterThan(0);
  expect(trajectory.reverseLeft.headingDelta, 'reverse left-wheel input should rotate the nose opposite the forward-steering direction').toBeGreaterThan(0);
  expect(trajectory.reverseRight.headingDelta, 'reverse right-wheel input should rotate the nose opposite the forward-steering direction').toBeLessThan(0);
});
