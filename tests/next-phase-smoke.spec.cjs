const { test, expect } = require('@playwright/test');

test('Next Phase beta creates a visible canvas', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/coastline-next-phase\.html/);
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeAttached({ timeout: 30000 });
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
