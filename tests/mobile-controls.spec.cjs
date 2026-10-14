const { test, expect } = require('@playwright/test');

test('mobile driving controls are visible and operate the vehicle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const forward = page.getByRole('button', { name: 'Forward' });
  const left = page.getByRole('button', { name: 'Steer left' });
  const action = page.locator('#actionButton');

  await expect(forward).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reverse' })).toBeVisible();
  await expect(left).toBeVisible();
  await expect(page.getByRole('button', { name: 'Steer right' })).toBeVisible();
  await expect(action).toBeVisible();

  // Find an open stretch away from other vehicles and solid world props so this test measures controls, not spawn placement.
  const spawn = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const roster = api.vehicleRoster();
    for (let x = -700; x <= 700; x += 50) {
      for (let z = -700; z <= 700; z += 50) {
        if (roster.some(v => Math.hypot(v.x - x, v.z - z) < 12)) continue;
        let clear = true;
        for (let dx = -6; dx <= 6 && clear; dx += 3) {
          for (let dz = 0; dz <= 24; dz += 3) {
            const px = x + dx, pz = z + dz;
            if (api.obstacleBlocked(px, pz, 1.8) || roster.some(v => Math.hypot(v.x - px, v.z - pz) < 5)) { clear = false; break; }
          }
        }
        if (clear) return { x, z };
      }
    }
    return null;
  });
  expect(spawn, 'a clear test lane should exist').not.toBeNull();
  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), spawn);
  const before = await page.evaluate(() => window.__coastlineTest.state());

  await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });
  await left.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0 });
  await page.waitForTimeout(1000);
  await left.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0 });
  await forward.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });

  const afterDrive = await page.evaluate(() => window.__coastlineTest.state());
  expect(afterDrive.z, 'forward control should move the car').toBeGreaterThan(before.z + 0.5);
  expect(Math.abs(afterDrive.heading - before.heading), 'left control should steer the car').toBeGreaterThan(0.01);

  await action.click();
  await expect(page.locator('#mode')).toHaveText('ON FOOT');
  await expect(action).toHaveText('USE');
  const afterExit = await page.evaluate(() => window.__coastlineTest.state());
  expect(afterExit.avatarVisible, 'mobile exit control should show the player avatar').toBe(true);
});
