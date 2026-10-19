const { test, expect } = require('@playwright/test');

test('core beta preserves the interactive map while keeping ordinary building interiors deferred', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const snapshot = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const building = api.buildingState();
    api.exitVehicle();
    const ordinaryEnter = api.enterBuildingByName('Harbor Hotel');
    api.exitBuilding?.();
    const garageEnter = api.enterBuildingByName('Auto Works');
    return {
      mapPresent: Boolean(document.getElementById('coastMap')),
      missionVisible: (() => {
        const el = document.querySelector('.mission');
        return Boolean(el && getComputedStyle(el).display !== 'none' && el.offsetParent !== null);
      })(),
      building,
      ordinaryEnter,
      garageEnter,
      inside: api.buildingState().inside,
      errors: api.state().errors
    };
  });

  expect(snapshot.mapPresent).toBe(true);
  expect(snapshot.building.enterable).toBeLessThan(snapshot.building.count);
  expect(snapshot.ordinaryEnter).toBe(false);
  expect(snapshot.garageEnter).toBe(true);
  expect(snapshot.inside).toBe('Auto Works');
  expect(snapshot.errors).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
