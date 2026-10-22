const { test, expect } = require('@playwright/test');

// ... existing tests above ...

test('cash balance persists across reloads independently of landmark discovery', async ({ page }) => {
  test.setTimeout(75000);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('coastline-cash-persistence-seeded-v1')) return;
    localStorage.removeItem('coastline-discovered-landmarks-v1');
    localStorage.setItem('coastline-cash-balance-v1', '375');
    sessionStorage.setItem('coastline-cash-persistence-seeded-v1', '1');
  });
  await page.goto('/game-v3.html?beta=cash-persistence-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(375);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  expect(await page.evaluate(() => window.__coastlineTest.state().cashBalance)).toBe(375);
  expect(await page.evaluate(() => typeof window.__coastlineTest.checkLandmarkDiscovery)).toBe('undefined');
  expect(await page.evaluate(() => localStorage.getItem('coastline-discovered-landmarks-v1'))).toBeNull();
});
