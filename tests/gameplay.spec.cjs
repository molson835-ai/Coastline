const { test, expect } = require('@playwright/test');

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
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const failedRequests = [];
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'request failed'}`));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.locator('canvas').first()).toBeAttached({ timeout: 12000 });
  } catch (error) {
    throw new Error(`Coastline did not create a canvas. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}; original=${error.message}`);
  }
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

  const openWalk = await page.evaluate(() => window.__coastlineTest.findOpenWalkPosition());
  expect(openWalk, 'a clear walking spawn should exist').not.toBeNull();
  await page.evaluate(({ x, z }) => window.__coastlineTest.setWalkPosition(x, z, 0), openWalk);
  const walkStart = await page.evaluate(() => window.__coastlineTest.state());
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 60));
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const afterWalk = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.hypot(afterWalk.x - walkStart.x, afterWalk.z - walkStart.z), 'W should move the player in open ground').toBeGreaterThan(0.2);

  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 48));
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const afterTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.abs(afterTurn.heading - afterWalk.heading), 'A should turn the avatar/camera').toBeGreaterThan(0.05);

  expect(pageErrors, 'uncaught JavaScript errors after interactions').toEqual([]);
});


test('vehicle steering follows left/right input and reverse builds usable negative speed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html?beta=vehicle-controls-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });

  const roadStart = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const roster = api.vehicleRoster();
    for (let x = -600; x <= 600; x += 200) {
      for (let z = -600; z <= 580; z += 20) {
        const p = { x, z };
        const laneSamples = Array.from({ length: 7 }, (_, i) => z + i * 2);
        const clear = laneSamples.every(sampleZ => !api.buildingBlocked(x, sampleZ, 2))
          && !roster.some(v => laneSamples.some(sampleZ => Math.hypot(v.x - x, v.z - sampleZ) < 10));
        if (clear && api.worldModel.isRoadCorridor(x, z)
          && api.worldModel.isRoadCorridor(x, z + 12)) return p;
      }
    }
    throw new Error('Could not locate a clear straight road lane for controls regression');
  });
  const resetCar = () => page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), roadStart);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const movingForward = await page.evaluate(() => window.__coastlineTest.state());
  expect(movingForward.vehicleSpeed, 'W should accelerate the car forward').toBeGreaterThan(2);
  expect(Math.hypot(movingForward.x - roadStart.x, movingForward.z - roadStart.z), 'W should move the car along the clear road').toBeGreaterThan(0.5);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const beforeLeft = await page.evaluate(() => window.__coastlineTest.state());
  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const leftTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(leftTurn.heading, 'A should steer left while driving forward').toBeLessThan(beforeLeft.heading);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  await page.evaluate(() => window.__coastlineTest.keyDown('d'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  await page.evaluate(() => window.__coastlineTest.keyUp('d'));
  const rightTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(rightTurn.heading, 'D should steer right while driving forward').toBeGreaterThan(0);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('s'));
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 35));
  await page.evaluate(() => window.__coastlineTest.keyUp('s'));
  const reversing = await page.evaluate(() => window.__coastlineTest.state());
  expect(reversing.vehicleSpeed, 'S should build useful reverse speed').toBeLessThan(-2.5);
  expect(errors, 'vehicle controls should not introduce runtime errors').toEqual([]);
});

test('cash balance persists across reloads independently of landmark discovery', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('coastline-cash-persistence-seeded-v1')) return;
    localStorage.removeItem('coastline-discovered-landmarks-v1');
    localStorage.setItem('coastline-cash-balance-v1', '375');
    sessionStorage.setItem('coastline-cash-persistence-seeded-v1', '1');
  });
  await page.goto('/game-v3.html?beta=cash-persistence-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(375);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(375);
  expect(await page.evaluate(() => typeof window.__coastlineTest.checkLandmarkDiscovery)).toBe('undefined');
  expect(await page.evaluate(() => localStorage.getItem('coastline-discovered-landmarks-v1'))).toBeNull();
});
