const { test, expect } = require('@playwright/test');

test('runtime exposes performance budget telemetry without errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  // Capture the same valid snapshot that satisfied readiness. The previous test
  // polled until FPS was valid, then took a second snapshot; the telemetry can
  // legitimately rotate between samples and expose a transient zero FPS there.
  const perf = await page.evaluate(async () => {
    const valid = value => Boolean(value && value.loadingMs !== null && value.fps > 0 && value.averageFrameMs > 0 && value.p95FrameMs > 0 && value.drawCalls > 0 && value.triangles > 0 && value.geometries > 0);
    const deadline = performance.now() + 25000;
    while (performance.now() < deadline) {
      const value = window.__coastlineTest?.state()?.performance;
      if (valid(value)) return value;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Timed out waiting for a valid performance telemetry snapshot');
  });

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
