const { test, expect } = require('@playwright/test');
const { findNearbyClearRoad, findNearbyClearWalkStart } = require('./helpers/nearby-world-spawn.cjs');

test('public beta launcher opens the feature-rich open-world runtime', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(url => url.pathname.endsWith('/game-v3.html') && /^202610\d+/.test(url.searchParams.get('beta') || ''), { timeout: 15000 });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 20000 });
  await expect(page.locator('#mode')).toHaveText('DRIVING');
  await expect(page.locator('#coastMap')).toBeVisible();
  expect(pageErrors, 'uncaught errors while launching the public beta').toEqual([]);
});

test('Coastline boots, exits a vehicle, shows the avatar, and supports walking turns', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const failedRequests = [];
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'request failed'}`));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  try { await expect(page.locator('canvas').first()).toBeAttached({ timeout: 12000 }); }
  catch (error) { throw new Error(`Coastline did not create a canvas. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}; original=${error.message}`); }
  await expect(page.locator('#mode')).toHaveText('DRIVING');
  await page.waitForTimeout(5000);
  expect(pageErrors, 'uncaught JavaScript errors during startup').toEqual([]);
  expect(consoleErrors.filter(text => !/favicon|third-party cookie/i.test(text)), 'browser console errors').toEqual([]);
  await page.locator('#actionButton').click();
  await expect(page.locator('#mode')).toHaveText('ON FOOT');
  await expect(page.locator('#actionButton')).toHaveText('USE');
  const afterExit = await page.evaluate(() => window.__coastlineTest.state());
  expect(afterExit.avatarVisible, 'avatar should be visible on foot').toBe(true);
  expect(afterExit.buildingCount).toBeGreaterThan(10);
  expect(afterExit.vehicleCount).toBeGreaterThan(1);

  // The helper selects a bounded central-road path and moves only nearby test pedestrians
  // out of its way, leaving production movement/collision behavior intact.
  const clearWalkStart = await page.evaluate(findNearbyClearWalkStart);
  await page.evaluate(({ x, z }) => window.__coastlineTest.setWalkPosition(x, z, 0), clearWalkStart);
  const walkStart = await page.evaluate(() => window.__coastlineTest.state());
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  try {
    await expect.poll(async () => page.evaluate(({ x, z }) => {
      const now = window.__coastlineTest.state();
      return Math.hypot(now.x - x, now.z - z);
    }, { x: walkStart.x, z: walkStart.z }), {
      timeout: 7000, intervals: [100, 250, 500], message: 'W should move the player on the bounded clear-road test path'
    }).toBeGreaterThan(0.2);
  } finally {
    await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  }
  const afterWalk = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.hypot(afterWalk.x - walkStart.x, afterWalk.z - walkStart.z), 'W should move the player in open ground').toBeGreaterThan(0.2);
  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const afterTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.abs(afterTurn.heading - afterWalk.heading), 'A should turn the avatar/camera').toBeGreaterThan(0.05);
  expect(pageErrors, 'uncaught JavaScript errors after interactions').toEqual([]);
});

test('vehicle steering follows the corrected left/right input and reverse builds usable negative speed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html?beta=vehicle-controls-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });
  const roadStart = await page.evaluate(findNearbyClearRoad);
  const resetCar = () => page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), roadStart);

  async function verifyTurn(key, direction) {
    await resetCar();
    await page.evaluate(() => window.__coastlineTest.keyDown('w'));
    try {
      await expect.poll(() => page.evaluate(() => window.__coastlineTest.state().vehicleSpeed), {
        timeout: 12000, intervals: [100, 250, 500], message: 'The car must actually accelerate before steering is measured'
      }).toBeGreaterThan(2);
      const before = await page.evaluate(() => window.__coastlineTest.state());
      await page.evaluate(k => window.__coastlineTest.keyDown(k), key);
      try {
        const delta = () => page.evaluate(({ heading }) => window.__coastlineTest.state().heading - heading, { heading: before.heading });
        const options = { timeout: 12000, intervals: [100, 250, 500], message: key + ' should change heading in the expected direction' };
        if (direction === 'left') await expect.poll(delta, options).toBeLessThan(-0.01);
        else await expect.poll(delta, options).toBeGreaterThan(0.01);
      } finally {
        await page.evaluate(k => window.__coastlineTest.keyUp(k), key);
      }
    } finally {
      await page.evaluate(() => window.__coastlineTest.keyUp('w'));
    }
  }

  await verifyTurn('a', 'left');
  await verifyTurn('d', 'right');
  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('s'));
  try {
    await expect.poll(() => page.evaluate(() => window.__coastlineTest.state().vehicleSpeed), {
      timeout: 12000, intervals: [100, 250, 500], message: 'S should build usable negative reverse speed'
    }).toBeLessThan(-2.5);
  } finally {
    await page.evaluate(() => window.__coastlineTest.keyUp('s'));
  }
  expect(errors, 'vehicle controls should not introduce runtime errors').toEqual([]);
});

test('landmark discoveries award cash once and persist across reloads when sandbox mode is explicitly disabled', async ({ page }) => {
  await page.goto('/game-v3.html?beta=landmark-discovery-regression&sandbox=0', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });
  await page.evaluate(() => localStorage.removeItem('coastline-discovered-landmarks-v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });
  const before = await page.evaluate(() => ({ cash: window.__coastlineTest.state().cashBalance, landmark: window.__coastlineTest.landmarkRoster()[0] }));
  await page.evaluate(({ x, z }) => { const api = window.__coastlineTest; api.setWalkPosition(x, z, 0); api.checkLandmarkDiscovery(); }, before.landmark);
  const after = await page.evaluate(() => ({ cash: window.__coastlineTest.state().cashBalance, state: window.__coastlineTest.landmarkDiscoveryState() }));
  expect(after.cash).toBe(before.cash + 150);
  expect(after.state.discovered).toContain(before.landmark.id);
  await page.evaluate(() => window.__coastlineTest.checkLandmarkDiscovery());
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(after.cash);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });
  expect(await page.evaluate(() => window.__coastlineTest.landmarkDiscoveryState().discovered)).toContain(before.landmark.id);
});
