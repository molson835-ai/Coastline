const { test, expect } = require('@playwright/test');

test('hero vehicle uses the replacement RGSDev model and keeps damage handling mapped', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__coastlinePlayer?.vehicle?.g && window.__coastlineVehicleAssetSwapStatus?.ok === true,
    null,
    { timeout: 30000 }
  );

  const snapshot = await page.evaluate(() => {
    const vehicle = window.__coastlinePlayer.vehicle;
    const root = vehicle.g;
    const parts = vehicle.damageParts || {};
    const visualMeshes = [];
    root.traverse(node => { if (node.isMesh) visualMeshes.push(node); });
    return {
      rootChildCount: root.children.length,
      modelName: vehicle.rgsdevModelName,
      visualMeshCount: visualMeshes.length,
      damagePartsMapped: ['body', 'cab', 'hood', 'trunk', 'roof', 'frontBumper', 'rearBumper']
        .every(key => parts[key] && parts[key].isObject3D),
      vehicleStillDrivable: vehicle.drivable === true && vehicle.kind === 'car',
      replacementFleetLoaded: window.__coastlineVehicleAssetSwapStatus.replaced > 0,
      oldHeroShellPresent: root.children.some(child => child.name === 'coastline-hero-white-single-shell')
    };
  });

  expect(snapshot.rootChildCount).toBe(1);
  expect(snapshot.modelName).toBeTruthy();
  expect(snapshot.modelName).not.toBe('neutral-fallback');
  expect(snapshot.visualMeshCount).toBeGreaterThan(0);
  expect(snapshot.damagePartsMapped).toBe(true);
  expect(snapshot.vehicleStillDrivable).toBe(true);
  expect(snapshot.replacementFleetLoaded).toBe(true);
  expect(snapshot.oldHeroShellPresent).toBe(false);
  expect(pageErrors).toEqual([]);
});
