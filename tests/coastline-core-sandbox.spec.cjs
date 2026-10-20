const { test, expect } = require('@playwright/test');
test('beta preserves the full interactive map while deferring ordinary building interiors to the starter garage', async ({ page }) => {
  const runtimeErrors=[];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout:30000 });
  const snapshot=await page.evaluate(() => {
    const api=window.__coastlineTest;
    api.exitVehicle();
    const ordinaryEnter=api.enterBuildingByName('Harbor Hotel');
    const garageEnter=api.enterBuildingByName('Auto Works');
    return { mapPresent:Boolean(document.getElementById('coastMap')), building:api.buildingState(), ordinaryEnter, garageEnter, inside:api.buildingState().inside, errors:api.state().errors };
  });
  expect(snapshot.mapPresent).toBe(true);
  expect(snapshot.building.enterable).toBe(1);
  expect(snapshot.building.count).toBeGreaterThan(10);
  expect(snapshot.ordinaryEnter).toBe(false);
  expect(snapshot.garageEnter).toBe(true);
  expect(snapshot.inside).toBe('Auto Works');
  expect(snapshot.errors).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});
