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

  const state = await page.evaluate(() => window.__coastlineTest.state());
  const perf = state.performance;

  expect(Number.isFinite(perf.fps)).toBe(true);
  expect(perf.averageFrameMs).toBeGreaterThan(0);
  expect(perf.p95FrameMs).toBeGreaterThan(0);
  expect(perf.loadingMs).toBeGreaterThan(0);
  expect(perf.drawCalls).toBeGreaterThan(0);
  expect(perf.triangles).toBeGreaterThan(0);
  expect(perf.renderPassMetrics).toBeTruthy();
  expect(perf.gpuTiming).toBeTruthy();
  expect(typeof perf.gpuTiming.supported).toBe('boolean');
  expect(Number.isFinite(perf.gpuTiming.samples)).toBe(true);
  expect(perf.gpuTiming.samples).toBeGreaterThanOrEqual(0);
  expect(perf.gpuTiming.averageGpuMs === null || Number.isFinite(perf.gpuTiming.averageGpuMs)).toBe(true);
  expect(perf.gpuTiming.p95GpuMs === null || Number.isFinite(perf.gpuTiming.p95GpuMs)).toBe(true);
  expect(perf.gpuTiming.disjointEvents).toBeGreaterThanOrEqual(0);
  for (const name of ['scene', 'bloom', 'output']) {
    const metrics = perf.renderPassMetrics[name];
    const timing = perf.renderPassTimings?.[name];
    expect(metrics, `${name} pass metrics should be exposed`).toBeTruthy();
    expect(metrics.drawCalls).toBeGreaterThan(0);
    expect(metrics.triangles).toBeGreaterThanOrEqual(0);
    expect(metrics.cpuSubmitMs).toBeGreaterThanOrEqual(0);
    expect(timing, `${name} pass timing should be exposed`).toBeTruthy();
    expect(timing.samples).toBeGreaterThan(0);
    expect(timing.averageCpuSubmitMs).toBeGreaterThanOrEqual(0);
    expect(timing.p95CpuSubmitMs).toBeGreaterThanOrEqual(0);
  }
  expect(perf.geometries).toBeGreaterThan(0);
  expect(perf.textures).toBeGreaterThanOrEqual(0);
  expect(perf.systemTimings).toBeTruthy();
  for (const name of ['aiTraffic', 'pedestrians', 'worldRegistrySync', 'render']) {
    expect(perf.systemTimings[name], `${name} timing should be exposed`).toBeTruthy();
    expect(perf.systemTimings[name].averageMs).toBeGreaterThanOrEqual(0);
    expect(perf.systemTimings[name].p95Ms).toBeGreaterThanOrEqual(0);
    expect(perf.systemTimings[name].maxMs).toBeGreaterThanOrEqual(0);
    expect(perf.systemTimings[name].samples).toBeGreaterThan(0);
  }
  expect(perf.entities.buildings).toBe(state.buildingCount);
  expect(perf.entities.vehicles).toBe(state.vehicleCount);
  expect(perf.entities.pedestrians).toBe(state.pedestrianCount);
  expect(perf.entities.trees).toBeGreaterThan(0);
  expect(perf.deviceMemoryGb === null || Number.isFinite(perf.deviceMemoryGb)).toBe(true);
  expect(perf.jsHeapUsedMb === null || Number.isFinite(perf.jsHeapUsedMb)).toBe(true);
  expect(perf.jsHeapLimitMb === null || Number.isFinite(perf.jsHeapLimitMb)).toBe(true);
  expect(pageErrors, 'performance instrumentation should not create runtime errors').toEqual([]);
});
