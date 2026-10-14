const { test, expect } = require('@playwright/test');

test('world collision probes distinguish a building footprint from open ground', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const probes = await page.evaluate(() => ({
    buildingCenterBlocked: window.__coastlineTest.buildingBlocked(-500, -500, 0.45),
    openGroundBlocked: window.__coastlineTest.buildingBlocked(-650, -500, 0.45),
    buildingCount: window.__coastlineTest.state().buildingCount
  }));

  expect(probes.buildingCount).toBeGreaterThan(10);
  expect(probes.buildingCenterBlocked, 'known building center must be collision-blocked').toBe(true);
  expect(probes.openGroundBlocked, 'open ground beside the known building must remain traversable').toBe(false);
});

test('on-foot movement cannot walk through a building boundary', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  // A known generated building is centered at (-500, -500), with a 70-unit depth.
  // Start outside its southern edge and walk north toward the wall.
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(-500, -540, 0));
  await page.evaluate(() => window.__coastlineTest.keyDown('w'));
  await page.waitForTimeout(2400);
  await page.evaluate(() => window.__coastlineTest.keyUp('w'));

  const state = await page.evaluate(() => {
    const s = window.__coastlineTest.state();
    return { ...s, blockedAtFinalPosition: window.__coastlineTest.buildingBlocked(s.x, s.z, 0.45) };
  });

  expect(state.mode).toBe('walk');
  expect(state.z, 'player should approach the wall but not pass through it').toBeLessThanOrEqual(-535.2);
  expect(state.blockedAtFinalPosition, 'player must remain outside the building collision footprint').toBe(false);
});
