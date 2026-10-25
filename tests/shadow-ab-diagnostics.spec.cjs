const { test, expect } = require('@playwright/test');

test('shadow A/B diagnostic disables shadows only when explicitly requested', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/game-v3.html?diagShadows=off', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.state?.().performance));
  const off = await page.evaluate(() => window.__coastlineTest.state().performance.renderConfig);
  expect(off.shadowDiagnosticOverride).toBe(true);
  expect(off.shadowsEnabled).toBe(false);
  expect(off.shadowMapSize).toBeGreaterThanOrEqual(1024);
  expect(off.shadowMapSize).toBeLessThanOrEqual(2048);

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.state?.().performance));
  const baseline = await page.evaluate(() => window.__coastlineTest.state().performance.renderConfig);
  expect(baseline.shadowDiagnosticOverride).toBe(false);
  expect(baseline.shadowsEnabled).toBe(true);
  expect(baseline.shadowMapSize).toBeGreaterThanOrEqual(1024);
  expect(baseline.shadowMapSize).toBeLessThanOrEqual(2048);
});
