const { test, expect } = require('@playwright/test');

test('mobile driving controls are visible and operate the vehicle', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const driveControls = page.locator('#driveControls');
  const stick = page.locator('#driveStick');
  const gas = page.locator('#driveGas');
  const brake = page.locator('#driveBrake');
  const action = page.locator('#actionButton');

  await expect(driveControls).toBeVisible();
  await expect(stick).toBeVisible();
  await expect(gas).toBeVisible();
  await expect(brake).toBeVisible();
  await expect(action).toBeVisible();

  const spawn = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const roster = api.vehicleRoster();
    for (let x = 700; x >= -700; x -= 50) {
      for (let z = 700; z >= -700; z -= 50) {
        if (roster.some(v => Math.hypot(v.x - x, v.z - z) < 12)) continue;
        let clear = true;
        for (let dx = -6; dx <= 6 && clear; dx += 3) {
          for (let dz = -30; dz <= 30; dz += 1.5) {
            const px = x + dx, pz = z + dz;
            if (api.obstacleBlocked(px, pz, 1.8) || api.pedestrianCollisionBlocked(px, pz, 1.8) || roster.some(v => Math.hypot(v.x - px, v.z - pz) < 7)) { clear = false; break; }
          }
        }
        if (clear) return { x, z };
      }
    }
    return null;
  });
  expect(spawn, 'a clear test lane should exist').not.toBeNull();
  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), spawn);
  const before = await page.evaluate(() => window.__coastlineTest.state());

  const gasBox = await gas.boundingBox();
  expect(gasBox).not.toBeNull();
  const gasX = gasBox.x + gasBox.width / 2, gasY = gasBox.y + gasBox.height / 2;
  await page.mouse.move(gasX, gasY);
  await page.mouse.down();
  try {
    await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 60));
  } finally {
    await page.mouse.up();
  }
  const afterDrive = await page.evaluate(() => window.__coastlineTest.state());
  expect(Math.hypot(afterDrive.x - before.x, afterDrive.z - before.z), 'accelerator should move the car').toBeGreaterThan(0.5);

  const stickBox = await stick.boundingBox();
  expect(stickBox).not.toBeNull();
  const stickCenterX = stickBox.x + stickBox.width / 2, stickCenterY = stickBox.y + stickBox.height / 2;
  const headingBeforeLeft = (await page.evaluate(() => window.__coastlineTest.state())).heading;
  await page.mouse.move(stickCenterX, stickCenterY);
  await page.mouse.down();
  try {
    await page.mouse.move(stickBox.x + stickBox.width * 0.15, stickCenterY, { steps: 4 });
    await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  } finally {
    await page.mouse.up();
  }
  const headingAfterLeft = (await page.evaluate(() => window.__coastlineTest.state())).heading;
  expect(headingAfterLeft - headingBeforeLeft, 'left joystick movement should steer left').toBeLessThan(-0.01);

  const headingBeforeRight = (await page.evaluate(() => window.__coastlineTest.state())).heading;
  await page.mouse.move(stickCenterX, stickCenterY);
  await page.mouse.down();
  try {
    await page.mouse.move(stickBox.x + stickBox.width * 0.85, stickCenterY, { steps: 4 });
    await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1/60, 30));
  } finally {
    await page.mouse.up();
  }
  const headingAfterRight = (await page.evaluate(() => window.__coastlineTest.state())).heading;
  expect(headingAfterRight - headingBeforeRight, 'right joystick movement should steer right').toBeGreaterThan(0.01);

  await action.click({ force: true });
  await expect(page.locator('#mode')).toHaveText('ON FOOT');
  await expect(action).toHaveText('USE');
  const afterExit = await page.evaluate(() => window.__coastlineTest.state());
  expect(afterExit.avatarVisible, 'mobile exit control should show the player avatar').toBe(true);
  expect(pageErrors).toEqual([]);
});
