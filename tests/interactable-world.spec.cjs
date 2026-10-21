const { test, expect } = require('@playwright/test');
test('starter garage and non-pedestrian rideables remain interactable in the full beta world', async ({ page }) => {
  const runtimeErrors=[];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout:30000 });
  const initial=await page.evaluate(() => {
    const api=window.__coastlineTest;
    return { buildings:api.buildingState(), rideables:api.rideableState().map(v=>v.kind), errors:api.state().errors, mapPresent:Boolean(document.getElementById('coastMap')), living:api.livingWorldState() };
  });
  expect(initial.buildings.count).toBeGreaterThan(10);
  expect(initial.buildings.enterable).toBe(1);
  expect(initial.rideables).toEqual(expect.arrayContaining(['bicycle','motorcycle','aircraft']));
  expect(initial.mapPresent).toBe(true);
  expect(initial.errors).toEqual([]);
  const entered=await page.evaluate(() => {
    const api=window.__coastlineTest;
    api.exitVehicle();
    return { ordinary:api.enterBuildingByName('Harbor Hotel'), garage:api.enterBuildingByName('Auto Works') };
  });
  expect(entered.ordinary).toBe(false);
  expect(entered.garage).toBe(true);
  await expect.poll(async()=>page.evaluate(()=>window.__coastlineTest.buildingState().inside)).toBe('Auto Works');
  await page.evaluate(()=>window.__coastlineTest.exitBuilding());
  await expect.poll(async()=>page.evaluate(()=>window.__coastlineTest.state().mode)).toBe('walk');
  await page.evaluate(()=>window.__coastlineTest.enterRideable('aircraft'));
  await page.evaluate(()=>window.__coastlineTest.keyDown('space'));
  await expect.poll(async()=>page.evaluate(()=>window.__coastlineTest.rideableState().find(v=>v.kind==='aircraft').flightHeight),{timeout:5000,intervals:[100,250,500]}).toBeGreaterThan(0);
  const flightHeight=await page.evaluate(()=>window.__coastlineTest.rideableState().find(v=>v.kind==='aircraft').flightHeight);
  await page.evaluate(()=>window.__coastlineTest.keyUp('space'));
  expect(flightHeight).toBeGreaterThan(0);
  expect(runtimeErrors).toEqual([]);
});
