const { test, expect } = require('@playwright/test');

test('City runtime reports roads, buildings, terrain, and a valid render pipeline', async ({ page }) => {
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText || 'request failed'
  }));

  await page.goto('/game-v3.html?beta=world-health&worldHealth=1', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => Boolean(window.__coastlineWorldHealth), null, { timeout: 45000 });
  await page.waitForFunction(() => Boolean(window.__coastlineBootReady), null, { timeout: 45000 });

  const report = await page.evaluate(() => window.__coastlineWorldHealth.scan());
  await expect(page.locator('#coastline-world-health-panel')).toBeAttached();
  expect(report.world.roads, 'City road surfaces/markings should be present').toBeGreaterThanOrEqual(16);
  expect(report.world.buildings, 'City building groups should be present').toBeGreaterThanOrEqual(20);
  expect(report.world.terrain, 'City terrain should be present').toBeGreaterThanOrEqual(1);
  expect(report.world.visibleRoads, 'City road geometry should be visible').toBeGreaterThan(0);
  expect(report.world.visibleBuildings, 'City buildings should be visible').toBeGreaterThan(0);
  expect(report.world.visibleTerrain, 'City terrain should be visible').toBeGreaterThan(0);
  expect(report.checks.filter(check => check.status === 'failed'), 'core world/render checks').toEqual([]);
  expect(report.renderer.contextAvailable).toBe(true);
  expect(report.camera.valid).toBe(true);
  expect(pageErrors, 'uncaught browser errors during world startup').toEqual([]);

  await page.screenshot({ path: 'test-results/coastline-world-health-city.png' });
});
