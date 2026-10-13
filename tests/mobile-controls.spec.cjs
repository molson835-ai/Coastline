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

  // Place the player vehicle on clear ground so the test measures controls, not spawn placement.
  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(-650, -500, 0));
  const before = await page.evaluate(() => window.__coastlineTest.state());

  await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });
  await left.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0 });
  await page.waitForTimeout(700);
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
