const { test, expect } = require('@playwright/test');

test('player driving conduct is remembered by region after a collision', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.playerReputationState), null, { timeout: 30000 });

  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, 0, 0));
  await page.evaluate(() => window.__coastlineTest.applyVehicleImpact(36, 'front'));
  const reputation = await page.evaluate(() => window.__coastlineTest.playerReputationState());
  expect(reputation.history.some(event => event.type === 'collision')).toBe(true);
  expect(Object.keys(reputation.regions).length).toBeGreaterThan(0);
});
