const { test, expect } = require('@playwright/test');

test('terrain sampling and all road junctions use a stable shared elevation', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const state = api.state();
    return {
      roadHeights: state.roadHeights,
      junctionHeights: [[-600,-600],[-200,400],[0,0],[400,-200],[600,600]].map(([x,z]) => api.groundY(x,z)),
      offRoadHeight: api.groundY(123,237),
      onRoadHeight: api.groundY(200,237),
      vehicleY: state.vehicleY,
      vehicleGroundY: api.groundY(state.x,state.z)
    };
  });

  expect(result.roadHeights.every(y => Math.abs(y - 3) < 0.001)).toBe(true);
  expect(result.junctionHeights.every(y => Math.abs(y - 3) < 0.001)).toBe(true);
  expect(Math.abs(result.onRoadHeight - 3)).toBeLessThan(0.001);
  expect(Number.isFinite(result.offRoadHeight)).toBe(true);
  expect(Math.abs(result.vehicleY - result.vehicleGroundY)).toBeLessThan(0.001);
});

test('pedestrians have distinct impact reactions and transition into hit state', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const reactions = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.triggerPedestrianHit(0);
    api.triggerPedestrianHit(1);
    return [api.pedestrianState(0), api.pedestrianState(1)];
  });

  expect(reactions[0].state).toBe('hit');
  expect(reactions[1].state).toBe('hit');
  expect(reactions[0].hitStyle).not.toBe(reactions[1].hitStyle);
  expect(reactions[0].lift).not.toBe(reactions[1].lift);
});
