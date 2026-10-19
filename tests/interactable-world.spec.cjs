const { test, expect } = require('@playwright/test');

test('core sandbox keeps the garage and non-pedestrian rideables interactable', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      buildings: api.buildingState(),
      rideables: api.rideableState().map(v => v.kind),
      errors: api.state().errors,
      sandbox: window.__coastlineCoreSandbox || null,
      mapPresent: Boolean(document.getElementById('coastMap'))
    };
  });

  expect(initial.buildings.count).toBeGreaterThan(10);
  expect(initial.buildings.enterable).toBeLessThan(initial.buildings.count);
  expect(initial.rideables).toEqual(expect.arrayContaining(['bicycle', 'motorcycle', 'aircraft']));
  expect(initial.sandbox?.pedestrianInteraction).toBe(false);
  expect(initial.sandbox?.missions).toBe(false);
  expect(initial.sandbox?.activities).toBe(false);
  expect(initial.sandbox?.map).toBe(false);
  expect(initial.mapPresent).toBe(false);
  expect(initial.errors).toEqual([]);

  const entered = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.exitVehicle();
    return {
      ordinary: api.enterBuildingByName('Harbor Hotel'),
      garage: api.enterBuildingByName('Auto Works')
    };
  });
  expect(entered.ordinary).toBe(false);
  expect(entered.garage).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.buildingState().inside)).toBe('Auto Works');

  await page.evaluate(() => window.__coastlineTest.exitBuilding());
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.state().mode)).toBe('walk');

  const jump = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.keyDown('space');
    const state = api.state();
    api.keyUp('space');
    return { jumpHeight: state.jumpHeight, jumpVelocity: state.jumpVelocity, mode: state.mode, errors: state.errors };
  });
  expect(jump.mode).toBe('walk');
  expect(jump.jumpHeight > 0 || jump.jumpVelocity > 0, 'jump should produce positive height or upward velocity').toBe(true);
  expect(jump.errors).toEqual([]);

  await page.evaluate(() => window.__coastlineTest.enterRideable('aircraft'));
  await page.evaluate(() => window.__coastlineTest.keyDown('space'));
  await page.waitForTimeout(450);
  const flightHeight = await page.evaluate(() => window.__coastlineTest.rideableState().find(v => v.kind === 'aircraft').flightHeight);
  await page.evaluate(() => window.__coastlineTest.keyUp('space'));
  expect(flightHeight).toBeGreaterThan(0);

  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
