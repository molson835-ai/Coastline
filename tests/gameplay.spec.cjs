const { test, expect } = require('@playwright/test');

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
  // Allow the runtime to get through a heavy first frame before sampling speed.
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const movingForward = await page.evaluate(() => window.__coastlineTest.state());
  expect(movingForward.vehicleSpeed, 'W should accelerate the car forward').toBeGreaterThan(2);
  expect(Math.hypot(movingForward.x - roadStart.x, movingForward.z - roadStart.z), 'W should move the car along the clear road').toBeGreaterThan(0.5);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  const beforeLeft = await page.evaluate(() => window.__coastlineTest.state());
  await page.evaluate(() => window.__coastlineTest.keyDown('a'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineTest.keyUp('a'));
  const leftTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(leftTurn.heading, 'A should steer left while driving forward').toBeLessThan(beforeLeft.heading);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  await page.evaluate(() => window.__coastlineTest.keyDown('d'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineTest.keyUp('d'));
  const rightTurn = await page.evaluate(() => window.__coastlineTest.state());
  expect(rightTurn.heading, 'D should steer right while driving forward').toBeGreaterThan(0);

  await resetCar();
  await page.evaluate(() => window.__coastlineTest.keyDown('s'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineTest.keyUp('s'));
  const reversing = await page.evaluate(() => window.__coastlineTest.state());
  expect(reversing.vehicleSpeed, 'S should build usable reverse speed').toBeLessThan(-2);
  expect(errors).toEqual([]);
});
