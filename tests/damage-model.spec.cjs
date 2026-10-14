const { test, expect } = require('@playwright/test');

test('collision damage scales with impact energy and can detach a bumper', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const moderate = api.applyVehicleImpact(15, 'front');
    const afterModerate = api.damageState();
    const severe = api.applyVehicleImpact(80, 'front');
    const afterSevere = api.damageState();
    return { moderate, afterModerate, severe, afterSevere, runtimeErrors: api.state().errors };
  });

  expect(result.moderate.damaged).toBe(true);
  expect(result.moderate.energy).toBeGreaterThan(0);
  expect(result.afterModerate.vehicle.damage.total).toBeGreaterThan(0);
  expect(result.severe.damaged).toBe(true);
  expect(result.severe.energy).toBeGreaterThan(result.moderate.energy * 20);
  expect(result.severe.detached).toBe(true);
  expect(result.afterSevere.vehicle.damage.panelsDetached.length).toBeGreaterThan(0);
  expect(result.afterSevere.debris).toBeGreaterThan(0);
  expect(result.afterSevere.log.length).toBeGreaterThanOrEqual(2);
  expect(result.runtimeErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
