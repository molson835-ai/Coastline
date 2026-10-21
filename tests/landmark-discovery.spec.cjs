const { test, expect } = require('@playwright/test');

test('regional landmarks reward exploration and persist cash and discoveries', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('coastline-landmark-test-reset-v1')) return;
    localStorage.removeItem('coastline-discovered-landmarks-v1');
    localStorage.removeItem('coastline-cash-balance-v1');
    sessionStorage.setItem('coastline-landmark-test-reset-v1', '1');
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html?beta=landmark-discovery-test', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 20000 });

  await page.evaluate(() => window.__coastlineTest.setWalkPosition(-390, -365, 0));
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.landmarkDiscoveryState().discovered))
    .toContain('morlatton-village');

  const firstVisit = await page.evaluate(() => ({
    cash: window.__coastlineTest.state().cashBalance,
    state: window.__coastlineTest.landmarkDiscoveryState(),
    duplicateReward: window.__coastlineTest.checkLandmarkDiscovery()
  }));
  expect(firstVisit.cash).toBe(400);
  expect(firstVisit.state.remaining).toBe(7);
  expect(firstVisit.duplicateReward).toBe(0);
  expect(errors).toEqual([]);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  expect(await page.evaluate(() => window.__coastlineTest.landmarkDiscoveryState().discovered))
    .toContain('morlatton-village');
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(400);
});
