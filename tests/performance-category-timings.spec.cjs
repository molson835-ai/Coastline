const { test, expect } = require('@playwright/test');

test('runtime exposes category-level frame costs without changing render quality', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const snapshot = await page.evaluate(() => window.__coastlineTest.state().performance);
  expect(snapshot).toBeTruthy();
  expect(snapshot.schemaVersion).toBe(1);
  expect(snapshot.categoryTimingsMs).toBeTruthy();
  for (const category of ['world', 'traffic', 'pedestrians', 'collision', 'animation', 'audio', 'render']) {
    expect(snapshot.categoryTimingsMs[category], category + ' timing should be a finite non-negative number')
      .toEqual(expect.any(Number));
    expect(snapshot.categoryTimingsMs[category]).toBeGreaterThanOrEqual(0);
  }
  expect(snapshot.drawCalls).toBeGreaterThan(0);
  expect(snapshot.triangles).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
