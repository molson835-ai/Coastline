const { test, expect } = require('@playwright/test');

test('public beta launcher opens the feature-rich open-world runtime', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(url => url.pathname.endsWith('/game-v3.html') && url.searchParams.get('beta') === '20261015full19', { timeout: 15000 });
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

  // Use a known open area so the walking assertion tests movement rather than
  // whether the default parked vehicle happens to be next to a building.
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(0, 0, 0));
  const walkStart = await page.evaluate(() => window.__coastlineTest.state());
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const afterWalk = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.hypot(afterWalk.x - walkStart.x, afterWalk.z - walkStart.z), 'W should move the player in open ground').toBeGreaterThan(0.2);

  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.waitForTimeout(800);
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

  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, 60, 0));
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const movingForward = await page.evaluate(() => window.__coastlineTest.state());
  expect(movingForward.vehicleSpeed, 'W should accelerate the car forward').toBeGreaterThan(2);
  expect(Math.hypot(movingForward.x, movingForward.z - 60), 'W should move the car').toBeGreaterThan(0.5);

  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const leftTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(leftTurn.heading, 'A should steer left while driving forward').toBeLessThan(movingForward.heading);

  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, 60, 0));
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  await page.evaluate(() => window.__coastlineTest.keyDown('d'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineTest.keyUp('d'));
  const rightTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(rightTurn.heading, 'D should steer right while driving forward').toBeGreaterThan(0);

  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, 60, 0));
  await page.evaluate(() => window.__coastlineTest.keyDown('s'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__coastlineTest.keyUp('s'));
  const reversing = await page.evaluate(() => window.__coastlineTest.state());
  expect(reversing.vehicleSpeed, 'S should build useful reverse speed').toBeLessThan(-4);
  expect(errors, 'vehicle controls should not introduce runtime errors').toEqual([]);
});
