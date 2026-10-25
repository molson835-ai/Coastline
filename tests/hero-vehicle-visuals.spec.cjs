const { test, expect } = require('@playwright/test');

test('hero vehicle uses one visual shell and retains mapped damage parts after the Range Rover fleet loads', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__coastlinePlayer?.vehicle?.g?.userData?.coastlineHeroVehicle?.singleShell === true,
    null,
    { timeout: 30000 }
  );
  // The fleet GLB loads asynchronously and previously replaced the hero shell
  // after the first wait, leaving its damage references pointed at disposed meshes.
  await page.waitForFunction(
    () => window.__coastlineRangeRoverFleetStatus?.ok === true,
    null,
    { timeout: 30000 }
  );

  const snapshot = await page.evaluate(() => {
    const vehicle = window.__coastlinePlayer.vehicle;
    const root = vehicle.g;
    const info = root.userData.coastlineHeroVehicle;
    const parts = vehicle.damageParts || {};
    const visualRoot = info.parts.visualRoot;
    return {
      rootChildCount: root.children.length,
      visualRootName: visualRoot?.name,
      rootContainsHeroShell: root.children.length === 1 &&
        root.children[0]?.name === 'coastline-hero-white-single-shell',
      supersededMeshCount: info.supersededMeshCount,
      paintColor: info.paintColor,
      hasDuplicateRootMeshes: root.children.some(child => child.isMesh),
      damagePartsMapped: ['body', 'cab', 'hood', 'trunk', 'roof', 'frontBumper', 'rearBumper']
        .every(key => parts[key] && parts[key] === info.parts[key]),
      wheelPartsMapped: Array.isArray(parts.wheels) && parts.wheels.length === 4 &&
        parts.wheels.every((wheel, index) => wheel === info.parts.wheels[index]),
      vehicleStillDrivable: vehicle.drivable === true && vehicle.kind === 'car',
      rangeRoverFleetReplaced: window.__coastlineRangeRoverFleetStatus.replaced > 0
    };
  });

  expect(snapshot.rootChildCount).toBe(1);
  expect(snapshot.rootContainsHeroShell).toBe(true);
  expect(snapshot.visualRootName).toBe('coastline-hero-white-single-shell');
  expect(snapshot.supersededMeshCount).toBeGreaterThan(0);
  expect(snapshot.paintColor).toBe('white');
  expect(snapshot.hasDuplicateRootMeshes).toBe(false);
  expect(snapshot.damagePartsMapped).toBe(true);
  expect(snapshot.wheelPartsMapped).toBe(true);
  expect(snapshot.vehicleStillDrivable).toBe(true);
  expect(snapshot.rangeRoverFleetReplaced).toBe(true);
  expect(pageErrors).toEqual([]);
});
