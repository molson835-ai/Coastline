const { test, expect } = require('@playwright/test');

test('QA Lab embeds the real game and exposes focused D-pad scenarios', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/qa-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'COASTLINE QA LAB' })).toBeVisible();
  for (const scenario of ['drive','hair','cave','homey']) {
    await expect(page.locator('[data-scenario="'+scenario+'"]')).toBeVisible();
  }
  await expect.poll(()=>page.evaluate(()=>Boolean(document.querySelector('#game')?.contentWindow?.__coastlineTest)),{timeout:45000}).toBe(true);
  await page.locator('[data-scenario="drive"]').click();
  await expect.poll(()=>page.locator('#note').textContent(),{timeout:45000}).toContain('Driving lane ready');
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#game')?.contentWindow?.__coastlineTest?.state()?.mode),{timeout:45000}).toBe('vehicle');
  const game=page.frameLocator('#game');
  await expect(game.locator('.left-controls button[data-k="w"]')).toBeVisible();
  await expect(game.locator('.right-controls button[data-k="a"]')).toBeVisible();
  await expect(game.locator('.right-controls button[data-k="d"]')).toBeVisible();
  await expect(game.locator('#driveStick')).toHaveCount(0);
});
