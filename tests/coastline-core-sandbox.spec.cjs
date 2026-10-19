const { test, expect } = require('@playwright/test');

test('core sandbox disables deferred systems while preserving the garage', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const snapshot = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const building = api.buildingState();
    return {
      mapPresent: Boolean(document.getElementById('coastMap')),
      missionVisible: (() => {
        const el = document.querySelector('.mission');
        return Boolean(el && getComputedStyle(el).display !== 'none' && el.offsetParent !== null);
      })(),
      building,
      hasHarborHotelInterior: typeof api.enterBuildingByName === 'function'
        ? api.enterBuildingByName('Harbor Hotel')
        : false,
      errors: api.state().errors
    };
  });

  expect(snapshot.mapPresent).toBe(false);
  expect(snapshot.missionVisible).toBe(false);
  expect(snapshot.building.enterable).toBeLessThan(snapshot.building.count);
  expect(snapshot.hasHarborHotelInterior).toBe(false);
  expect(snapshot.errors).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
