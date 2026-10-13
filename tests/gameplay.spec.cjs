const { test, expect } = require('@playwright/test');

test('Coastline boots, exits a vehicle, shows the avatar, and supports walking turns', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeAttached({ timeout: 30000 });
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
  await page.waitForTimeout(350);
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const afterTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.abs(afterTurn.heading - afterWalk.heading), 'A should turn the avatar/camera').toBeGreaterThan(0.05);

  expect(pageErrors, 'uncaught JavaScript errors after interactions').toEqual([]);
});
