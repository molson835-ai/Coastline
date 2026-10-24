const { test, expect } = require('@playwright/test');

test('visiting a landmark never grants cash or records a discovery', async ({ page }) => {
  // This graphics-heavy page needs a larger budget for its persistence reload in CI.
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('coastline-landmark-removal-seeded-v1')) return;
    localStorage.removeItem('coastline-discovered-landmarks-v1');
    localStorage.setItem('coastline-cash-balance-v1', '250');
    sessionStorage.setItem('coastline-landmark-removal-seeded-v1', '1');
  });
  await page.goto('/game-v3.html?beta=landmark-reward-removal-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });

  const before = await page.evaluate(() => ({
    cash: window.__coastlineTest.state().cashBalance,
    landmark: window.__coastlineTest.landmarkRoster()[0],
    discoveryApiType: typeof window.__coastlineTest.checkLandmarkDiscovery
  }));
  expect(before.cash, 'test starts with a known cash balance').toBe(250);
  expect(before.discoveryApiType, 'landmark discovery mechanic should no longer be exposed').toBe('undefined');

  await page.evaluate(({ x, z }) => {
    const api = window.__coastlineTest;
    api.setWalkPosition(x, z, 0);
    api.advanceTestFrame(1 / 60, 3);
  }, before.landmark);

  const afterVisit = await page.evaluate(() => ({
    cash: window.__coastlineTest.state().cashBalance,
    legacyDiscoveryData: localStorage.getItem('coastline-discovered-landmarks-v1')
  }));
  expect(afterVisit.cash, 'visiting a landmark must not increase cash').toBe(before.cash);
  expect(afterVisit.legacyDiscoveryData, 'landmark visits must not persist discovery state').toBeNull();
  expect(errors, 'landmark visit should not cause runtime errors').toEqual([]);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance), 'cash should remain unchanged after reload').toBe(before.cash);
  expect(await page.evaluate(() => localStorage.getItem('coastline-discovered-landmarks-v1'))).toBeNull();
});
