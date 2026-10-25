const { test, expect } = require('@playwright/test');

test('traffic stays in road lanes and vehicles collide with trees and streetlight poles', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const obstacles = api.obstacleState();
    const traffic = api.trafficState();
    return {
      treeBlocked: api.obstacleBlocked(obstacles.treeSample.x, obstacles.treeSample.z, 0.2),
      lampBlocked: api.obstacleBlocked(obstacles.lampSample.x, obstacles.lampSample.z, 0.2),
      treeCount: obstacles.trees,
      lampCount: obstacles.lamps,
      trafficSignals: obstacles.trafficSignals,
      signs: obstacles.signs,
      trafficCount: traffic.length,
      trafficOnRoad: traffic.filter(v => v.onRoad).length,
      trafficAxes: traffic.map(v => v.axis),
      offRoadTraffic: traffic.filter(v => !v.onRoad),
      errors: api.state().errors
    };
  });

  expect(initial.treeCount).toBeGreaterThan(0);
  expect(initial.lampCount).toBeGreaterThan(0);
  expect(initial.trafficSignals).toBeGreaterThanOrEqual(36);
  expect(initial.signs).toBeGreaterThanOrEqual(17);
  expect(initial.treeBlocked).toBe(true);
  expect(initial.lampBlocked).toBe(true);
  expect(initial.trafficCount).toBe(12);
  expect(initial.trafficOnRoad, JSON.stringify(initial.offRoadTraffic)).toBe(initial.trafficCount);
  expect(initial.trafficAxes).toContain('z');
  expect(initial.trafficAxes).toContain('x');
  expect(initial.errors).toEqual([]);

  await page.waitForTimeout(2500);
  const moving = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const traffic = api.trafficState();
    return {
      trafficCount: traffic.length,
      trafficOnRoad: traffic.filter(v => v.onRoad).length,
      movingCount: traffic.filter(v => Math.abs(v.x) > 1 || Math.abs(v.z) > 1).length,
      errors: api.state().errors
    };
  });
  expect(moving.trafficCount).toBe(12);
  expect(moving.trafficOnRoad).toBe(moving.trafficCount);
  expect(moving.movingCount).toBeGreaterThan(0);
  expect(moving.errors).toEqual([]);
});
