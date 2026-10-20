const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function boot(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  return errors;
}

test('mega patch 2 starts with the authored white sedan and sandbox balance', async ({ page }) => {
  const errors = await boot(page);
  await page.waitForFunction(() => window.__coastlineVehicleAssetStatus?.loaded === true, null, { timeout: 15000 });
  const result = await page.evaluate(() => ({
    state: window.__coastlineTest.state(),
    assetStatus: window.__coastlineVehicleAssetStatus || null
  }));
  expect(result.state.mode).toBe('vehicle');
  expect(result.state.cashBalance).toBe(10000);
  expect(result.assetStatus?.assetId).toBe('sedan');
  expect(result.assetStatus?.loaded).toBe(true);
  expect(errors).toEqual([]);
});

test('mega patch 2 makes A/left steer left and D/right steer right', async ({ page }) => {
  const errors = await boot(page);
  const baseline = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.setVehiclePosition(0, 0, 0);
    api.keyDown('w');
    return api.state();
  });
  expect(baseline.mode).toBe('vehicle');

  const left = await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.keyDown('a');
    await new Promise(resolve => setTimeout(resolve, 450));
    api.keyUp('a');
    api.keyUp('w');
    return api.state();
  });

  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, 0, 0));

  const right = await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.keyDown('w');
    api.keyDown('d');
    await new Promise(resolve => setTimeout(resolve, 450));
    api.keyUp('d');
    api.keyUp('w');
    return api.state();
  });

  expect(left.heading).toBeGreaterThan(0.01);
  expect(right.heading).toBeLessThan(-0.01);
  expect(errors).toEqual([]);
});

test('mega patch 2 disables mission and landmark discovery presentation while preserving the underlying world', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => ({
    missionState: window.__coastlineTest.state().missionState,
    landmarkCount: window.__coastlineTest.landmarkRoster().length,
    landmarkDiscoveryFunction: typeof window.__coastlineTest.checkLandmarkDiscovery,
    missionCardVisible: getComputedStyle(document.querySelector('.mission')).display !== 'none'
  }));
  expect(result.missionState).toBe('sandbox');
  expect(result.landmarkCount).toBeGreaterThan(0);
  expect(result.landmarkDiscoveryFunction).toBe('function');
  expect(result.missionCardVisible).toBe(false);
  expect(errors).toEqual([]);
});

test('mega patch 2 enforces a vehicle-only garage contract', async () => {
  const source = fs.readFileSync('game-v3.html', 'utf8');
  expect(source).toMatch(/function openGarage\(site\)\{if\(!site\|\|player\.mode!=='vehicle'\|\|!player\.vehicle\)return;/);
  expect(source).toMatch(/if\(player\.mode==='vehicle'\)\{const garage=nearestGarage\(\);if\(garage\)\{openGarage\(garage\);return\}exitVehicle\(\);return\}/);
  expect(source).toContain("const starterGarageBuilding=buildings.find(b=>b.name==='Auto Works')");
});
