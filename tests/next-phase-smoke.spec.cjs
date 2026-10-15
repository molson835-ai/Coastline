const { test, expect } = require('@playwright/test');

test('public beta reaches the playable game and exposes loading progress and Live World', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/coastline-cinematic-v2\.html/);
  await expect(page.locator('#loadPct')).toBeAttached({ timeout: 10000 });
  await expect(page.locator('#bar')).toBeAttached();
  await expect(page.locator('#loadStall')).toBeAttached();
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.locator('#loadPct')).toContainText(/%/);
  await page.waitForTimeout(2500);
  await page.keyboard.press('j');
  const board = page.locator('#coastLiveOps');
  await expect(board).toHaveClass(/open/);
  await expect(board.locator('.lo-title')).toContainText('LIVE WORLD');
  await page.evaluate(() => localStorage.setItem('coastline-live-ops-v1', JSON.stringify({version:1,credits:777,xp:123,completed:[]})));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.keyboard.press('j');
  await expect(page.locator('#loStats')).toContainText('777');
  await expect(page.locator('#loStats')).toContainText('123');
  expect(errors).toEqual([]);
});
