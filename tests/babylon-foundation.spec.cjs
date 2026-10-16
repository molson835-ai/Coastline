const { test, expect } = require('@playwright/test');

test('Babylon preview boots and exposes a working mobile-safe driving loop', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#renderCanvas')).toBeAttached();
  await expect.poll(() => page.locator('#status').textContent(), { timeout: 20000 })
    .toContain('Ready');

  await page.waitForFunction(() => Boolean(window.__coastlineBabylonTest), null, { timeout: 20000 });
  const before = await page.evaluate(() => window.__coastlineBabylonTest.state());
  await page.evaluate(() => window.__coastlineBabylonTest.keyDown('w'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineBabylonTest.keyUp('w'));
  const forward = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(forward.speed, 'forward input should build usable speed').toBeGreaterThan(2);
  expect(Math.hypot(forward.x - before.x, forward.z - before.z), 'car should move').toBeGreaterThan(0.5);

  await page.evaluate(() => window.__coastlineBabylonTest.keyDown('a'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineBabylonTest.keyUp('a'));
  const left = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(left.heading, 'left input should change heading left').toBeLessThan(forward.heading);

  expect(pageErrors, 'Babylon should not throw runtime errors').toEqual([]);
});

test('touch controls are visible and pointer-safe on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#touch')).toBeVisible();
  await expect(page.locator('[data-key="w"]')).toBeVisible();
  await expect(page.locator('[data-key="a"]')).toBeVisible();
  await page.locator('[data-key="w"]').dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(350);
  await page.locator('[data-key="w"]').dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  const state = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(state.speed).toBeGreaterThan(0);
});
