const { test, expect } = require('@playwright/test');

test('runtime exposes performance budget telemetry without errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await expect.poll(async () => page.evaluate(() => {
    const perf = window.__coastlineTest?.state()?.performance;
    const ready = Boolean(perf && perf.loadingMs !== null && perf.fps > 0 && perf.averageFrameMs > 0 && perf.p95FrameMs > 0 && perf.drawCalls > 0 && perf.triangles > 0 && perf.geometries > 0);
    return { ready, perf };
  }), { timeout: 25000, intervals: [250, 500, 1000] }).toMatchObject({ ready: true });
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
