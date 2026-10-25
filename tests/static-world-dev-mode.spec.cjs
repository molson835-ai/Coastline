const { test, expect } = require('@playwright/test');

test('static-world build mode removes discovery markers and pauses ambient AI simulation', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html?devStaticWorld=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const before = await page.evaluate(() => ({
    enabled: window.__coastlineTest.staticWorldDevMode,
    landmarks: window.__coastlineTest.landmarkRoster(),
    buildings: window.__coastlineTest.buildingRoster().length,
    traffic: window.__coastlineTest.trafficState().map(v => ({ x: v.x, z: v.z, axis: v.axis, direction: v.direction })),
    pedestrians: window.__coastlineTest.pedestrianRoster().map(p => ({ id: p.id, x: p.x, z: p.z, state: p.state, activity: p.activity })),
    npcPhase: window.__coastlineTest.npcWorldSliceState().phase
  }));
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => ({
    traffic: window.__coastlineTest.trafficState().map(v => ({ x: v.x, z: v.z, axis: v.axis, direction: v.direction })),
    pedestrians: window.__coastlineTest.pedestrianRoster().map(p => ({ id: p.id, x: p.x, z: p.z, state: p.state, activity: p.activity })),
    npcPhase: window.__coastlineTest.npcWorldSliceState().phase
  }));

  expect(before.enabled).toBe(true);
  expect(before.landmarks).toEqual([]);
  expect(before.buildings).toBeGreaterThan(10);
  expect(after.traffic).toEqual(before.traffic);
  expect(after.pedestrians).toEqual(before.pedestrians);
  expect(after.npcPhase).toBe(before.npcPhase);
  expect(pageErrors).toEqual([]);
});
