const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('City-first startup keeps the active vehicle visible and movable after CTM activation', async ({ page }) => {
  await openGame(page);
  const city = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(false);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeVehicleVisible())).toBe(true);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 400, Math.PI);
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
  });

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - 500, moved.position.z - 400)).toBeGreaterThan(0.1);
  expect(moved.vehicleIndex).toBe(city.vehicleIndex);
});

test('City to Homey preserves a complete replacement vehicle hierarchy and material identity', async ({ page }) => {
  await openGame(page);
  const before = await page.evaluate(() => ({
    vehicleIndex: window.__coastlineTransitionTest.playerState().vehicleIndex,
    modelName: window.__coastlinePlayer?.vehicle?.rgsdevModelName,
  }));
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  await page.waitForFunction(() => window.__coastlinePlayer?.vehicle?.g?.visible === true && window.__coastlineVehicleAssetSwapStatus?.ok === true);

  const after = await page.evaluate(() => {
    const vehicle = window.__coastlinePlayer.vehicle;
    const meshes = [];
    vehicle.g.traverse(node => { if (node.isMesh && node.visible !== false) meshes.push(node); });
    const groups = vehicle.materialRoles || {};
    return {
      vehicleIndex: window.__coastlineTransitionTest.playerState().vehicleIndex,
      modelName: vehicle.rgsdevModelName,
      meshCount: meshes.length,
      materialGroups: {
        body: groups.body?.length || 0,
        glass: groups.glass?.length || 0,
        wheels: groups.wheels?.length || 0,
      },
      neutralFallback: vehicle.g.userData?.coastlineNeutralFallback === true,
    };
  });

  expect(after.vehicleIndex).toBe(before.vehicleIndex);
  expect(after.modelName).toBe(before.modelName);
  expect(after.modelName).not.toBe('neutral-fallback');
  expect(after.meshCount).toBeGreaterThan(3);
  expect(after.materialGroups.body).toBeGreaterThan(0);
  expect(after.materialGroups.glass).toBeGreaterThan(0);
  expect(after.materialGroups.wheels).toBeGreaterThan(0);
  expect(after.neutralFallback).toBe(false);
});

test('the physical bridge end zones automatically transition island to City and back', async ({ page }) => {
  await openGame(page);
  const zones = await page.evaluate(() => window.__coastlineTransitionTest.bridgeZones());

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.islandApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('city');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.cityApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('island');
});
