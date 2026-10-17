const { test, expect } = require('@playwright/test');

test('parked cars occupy roadside parking positions rather than road corridors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const result = await page.evaluate(() => ({ parked: window.__coastlineTest.parkedCarPositions(), engine: window.__coastlineTest.worldEngineState() }));
  const parked = result.parked;
  expect(parked.length).toBeGreaterThan(20);
  expect(new Set(parked.map(v => `${Math.round(v.x * 10)}:${Math.round(v.z * 10)}`)).size).toBe(parked.length);
  expect(parked.every(v => Number.isFinite(v.heading) && !v.onRoad)).toBe(true);
  expect(result.engine.trackedVehicles).toBeGreaterThanOrEqual(parked.length);
  expect(result.engine.trackedPedestrians).toBeGreaterThanOrEqual(100);
  expect(result.engine.trackedEntities).toBeGreaterThan(result.engine.trackedVehicles);
  // Reservation telemetry tracks actively reserved slots, not every pre-seeded parked vehicle.
  expect(result.engine.reservedParkingSpots).toBeGreaterThan(20);
  expect(result.engine.reservedParkingSpots).toBeLessThanOrEqual(parked.length);
  expect(pageErrors).toEqual([]);
});