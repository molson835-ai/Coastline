const { test, expect } = require('@playwright/test');

test('performance telemetry is available and includes renderer and entity counters', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => {
    const perf = window.__coastlineTest?.state?.().performance;
    return perf && Number.isFinite(perf.loadingMs) && Number.isFinite(perf.averageFrameMs);
  }, null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  const snapshot = await page.evaluate(() => ({
    state: window.__coastlineTest.state(),
    diagnostics: window.__coastlinePerformanceDiagnostics?.()
  }));
  const perf = snapshot.state.performance;
  const diagnostics = snapshot.diagnostics;

  expect(perf.schemaVersion).toBe(1);
  expect(Number.isFinite(perf.fps)).toBe(true);
  expect(perf.averageFrameMs).toBeGreaterThan(0);
  expect(perf.p95FrameMs).toBeGreaterThan(0);
  expect(perf.loadingMs).toBeGreaterThan(0);
  expect(perf.drawCalls).toBeGreaterThan(0);
  expect(perf.triangles).toBeGreaterThan(0);
  expect(perf.geometries).toBeGreaterThan(0);
  expect(perf.textures).toBeGreaterThanOrEqual(0);
  expect(perf.categoryTimingCounts.render).toBe(1);
  expect(Number.isFinite(perf.categoryTimingsMs.render)).toBe(true);
  expect(perf.categoryTimingsMs.render).toBeGreaterThanOrEqual(0);
  expect(perf.entities.buildings).toBe(snapshot.state.buildingCount);
  expect(perf.entities.vehicles).toBe(snapshot.state.vehicleCount);
  expect(perf.entities.pedestrians).toBe(snapshot.state.pedestrianCount);
  expect(perf.entities.trees).toBeGreaterThan(0);
  expect(perf.deviceMemoryGb === null || Number.isFinite(perf.deviceMemoryGb)).toBe(true);
  expect(perf.jsHeapUsedMb === null || Number.isFinite(perf.jsHeapUsedMb)).toBe(true);
  expect(perf.jsHeapLimitMb === null || Number.isFinite(perf.jsHeapLimitMb)).toBe(true);
  expect(diagnostics, 'diagnostic instrumentation should be exposed').toBeTruthy();
  expect(Number.isFinite(diagnostics.effectivePixelRatio)).toBe(true);
  expect(diagnostics.canvas.width).toBeGreaterThan(0);
  expect(diagnostics.canvas.height).toBeGreaterThan(0);
  expect(diagnostics.canvas.backingWidth).toBeGreaterThan(0);
  expect(diagnostics.canvas.backingHeight).toBeGreaterThan(0);
  expect(diagnostics.frameTimeBuckets.total).toBeGreaterThan(0);
  expect(diagnostics.longTasks.count).toBeGreaterThanOrEqual(0);
  expect(diagnostics.longTasks.totalMs).toBeGreaterThanOrEqual(0);
  expect(diagnostics.longTasks.maxMs).toBeGreaterThanOrEqual(0);
  expect(diagnostics.longTasks.count).toBeLessThan(100000);
  expect(diagnostics.instrumentationVersion).toBeGreaterThanOrEqual(2);
  expect(pageErrors, 'performance instrumentation should not create runtime errors').toEqual([]);
});
