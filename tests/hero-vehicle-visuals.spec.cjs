const { test, expect } = require('@playwright/test');

test('hero vehicle uses one visual shell and retains mapped damage parts', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__coastlinePlayer?.vehicle?.g?.userData?.coastlineHeroVehicle?.singleShell === true,
    null,
    { timeout: 30000 }
  );

  const snapshot = await page.evaluate(() => {
    const vehicle = window.__coastlinePlayer.vehicle;
    const root = vehicle.g;
    const info = root.userData.coastlineHeroVehicle;
    const parts = vehicle.damageParts || {};
    return {
      rootChildCount: root.children.length,
      rootChildrenAreOnlyHeroRoot: root.children.length === 1 && root.children[0] === info.parts.visualRoot,
      supersededMeshCount: info.supersededMeshCount,
      paintColor: info.paintColor,
      hasDuplicateRootMeshes: root.children.some(child => child.isMesh),
      damagePartsMapped: ['body', 'cab', 'hood', 'trunk', 'roof', 'frontBumper', 'rearBumper']
        .every(key => parts[key] && parts[key] === info.parts[key]),
      wheelPartsMapped: Array.isArray(parts.wheels) && parts.wheels.length === 4 &&
        parts.wheels.every((wheel, index) => wheel === info.parts.wheels[index]),
      vehicleStillDrivable: vehicle.drivable === true && vehicle.kind === 'car'
    };
  });

  expect(snapshot.rootChildCount).toBe(1);
  expect(snapshot.rootChildrenAreOnlyHeroRoot).toBe(true);
  expect(snapshot.supersededMeshCount).toBeGreaterThan(0);
  expect(snapshot.paintColor).toBe('white');
  expect(snapshot.hasDuplicateRootMeshes).toBe(false);
  expect(snapshot.damagePartsMapped).toBe(true);
  expect(snapshot.wheelPartsMapped).toBe(true);
  expect(snapshot.vehicleStillDrivable).toBe(true);
  expect(pageErrors).toEqual([]);
});
