const { test, expect } = require('@playwright/test');

test('buildings, benches, low walls and on-foot movement remain interactable', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      buildings: api.buildingState(),
      errors: api.state().errors
    };
  });
  expect(initial.buildings.count).toBeGreaterThan(10);
  expect(initial.buildings.enterable).toBe(initial.buildings.count);
  expect(initial.buildings.benchCount).toBeGreaterThanOrEqual(4);
  expect(initial.buildings.lowWallCount).toBeGreaterThanOrEqual(4);
  expect(initial.errors).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__coastlineVehicleAssetSwapStatus?.ok === true)).toBe(true);
  expect(await page.evaluate(() => window.__coastlineVehicleAssetSwapStatus.disabled)).toBeGreaterThanOrEqual(3);

  const entered = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.exitVehicle();
    return api.enterBuildingByName('Harbor Hotel');
  });
  expect(entered).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.buildingState().inside)).toBe('Harbor Hotel');
  const stairHeight = await page.evaluate(() => window.__coastlineTest.interiorElevationAt(-497, -505.2));
  expect(stairHeight).toBeGreaterThan(0);

  await page.evaluate(() => window.__coastlineTest.exitBuilding());
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.state().mode)).toBe('walk');
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(0, 0, 0));
  expect(await page.evaluate(() => window.__coastlineTest.state().mode)).toBe('walk');

  // Sample the takeoff state immediately after the input edge. The jump impulse is
  // intentionally short, so waiting for a later rendered frame can miss it on a
  // heavily loaded CI runner even though the jump was correctly triggered.
  const jump = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.keyDown('space');
    api.advanceTestFrame(1/60, 1);
    const state = api.state();
    api.keyUp('space');
    return { jumpHeight: state.jumpHeight, jumpVelocity: state.jumpVelocity, mode: state.mode, errors: state.errors };
  });
  expect(jump.mode).toBe('walk');
  expect(jump.jumpHeight > 0 || jump.jumpVelocity > 0, 'jump should produce positive height or upward velocity').toBe(true);
  expect(jump.errors).toEqual([]);

  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
