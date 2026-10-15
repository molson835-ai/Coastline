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
  await page.keyboard.press('j');
  const board = page.locator('#coastLiveOps');
  await expect(board).toHaveClass(/open/);
  await expect(board.locator('.lo-title')).toContainText('LIVE WORLD');
  await page.evaluate(() => localStorage.setItem('coastline-live-ops-v1', JSON.stringify({
    version: 1, credits: 777, xp: 123, completed: []
  })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.keyboard.press('j');
  await expect(page.locator('#loStats')).toContainText('777');
  await expect(page.locator('#loStats')).toContainText('123');
  expect(errors).toEqual([]);
});
