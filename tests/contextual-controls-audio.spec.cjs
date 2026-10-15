const { test, expect } = require('@playwright/test');

test('mobile controls change with gameplay mode and audio toggle responds', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const footControls = page.locator('[data-foot-only]');
  await expect(footControls).toHaveCount(3);

  await page.evaluate(() => {
    const api = window.__coastlineTest;
    if (api.state().mode !== 'vehicle') api.enterRideable('car');
  });
  await expect(page.locator('[data-foot-only]').first()).toBeHidden();
  await expect(page.locator('#actionButton')).toHaveText('EXIT');

  await page.evaluate(() => window.__coastlineTest.exitVehicle());
  await expect(page.locator('[data-foot-only]').first()).toBeVisible();
  await expect(page.locator('#actionButton')).toHaveText('USE');

  const audioToggle = page.locator('#audioToggle');
  await expect(audioToggle).toBeVisible();
  await audioToggle.click();
  await expect(audioToggle).toHaveText('SOUND OFF');
  await audioToggle.click();
  await expect(audioToggle).toHaveText('SOUND ON');

  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
