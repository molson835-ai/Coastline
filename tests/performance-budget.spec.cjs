const { test, expect } = require('@playwright/test');

test('runtime exposes performance budget telemetry without errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.state().performance.fps), {
    timeout: 8000,
    message: 'performance telemetry should report at least one completed FPS sampling window',
  }).toBeGreaterThan(0);
  const state = await page.evaluate(() => window.__coastlineTest.state());
  const perf = state.performance;
  expect(perf, 'performance snapshot should be exposed').toBeTruthy();
  expect(perf.loadingMs, 'first rendered frame should be timed').toEqual(expect.any(Number));
  expect(perf.loadingMs).toBeGreaterThanOrEqual(0);
  expect(perf.fps).toBeGreaterThan(0);
  expect(perf.averageFrameMs).toBeGreaterThan(0);
  expect(perf.p95FrameMs).toBeGreaterThan(0);
  expect(perf.drawCalls).toBeGreaterThan(0);
  expect(perf.triangles).toBeGreaterThan(0);
  expect(perf.geometries).toBeGreaterThan(0);
  expect(perf.entities.vehicles).toBeGreaterThan(0);
  expect(perf.entities.pedestrians).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
