const { test, expect } = require('@playwright/test');

async function boot(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  return errors;
}

test('mega patch 2 starts with the authored white sedan as the only visible player car', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => ({
    state: window.__coastlineTest.state(),
    assetStatus: window.__coastlineVehicleAssetStatus || null,
    authoredSedanInstalled: Boolean(window.__coastlineTest.state().mode === 'vehicle' && window.__coastlineTest.state().errors.length === 0)
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

  expect(left.heading).toBeLessThan(-0.01);
  expect(right.heading).toBeGreaterThan(0.01);
  expect(errors).toEqual([]);
});

test('mega patch 2 disables mission and landmark discovery presentation while preserving the underlying world', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      missionState: api.state().missionState,
      landmarkCount: api.landmarkRoster().length,
      landmarkDiscoveryFunction: typeof api.checkLandmarkDiscovery,
      missionCardVisible: getComputedStyle(document.querySelector('.mission')).display !== 'none'
    };
  });
  expect(result.missionState).toBe('sandbox');
  expect(result.landmarkCount).toBeGreaterThan(0);
  expect(result.landmarkDiscoveryFunction).toBe('function');
  expect(result.missionCardVisible).toBe(false);
  expect(errors).toEqual([]);
});

test('mega patch 2 exposes a vehicle-only garage interaction', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const garage = api.garageState;
    api.setWalkPosition(0, 0, 0);
    const onFoot = api.interact();
    return { onFoot, garageType: typeof garage, mode: api.state().mode, errors: api.state().errors };
  });
  expect(result.garageType).toBe('object');
  expect(result.onFoot).not.toBe('garage');
  expect(result.mode).toBe('walk');
  expect(result.errors).toEqual([]);
  expect(errors).toEqual([]);
});
