const { test, expect } = require('@playwright/test');

test('cinematic rendering enables restrained bloom, color grading, and resize support', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const visual = await page.evaluate(() => window.__coastlineTest.cinematicState());
  expect(visual.bloomEnabled).toBe(true);
  expect(visual.bloomStrength).toBeGreaterThan(0);
  expect(visual.bloomStrength).toBeLessThanOrEqual(0.45);
  expect(visual.bloomThreshold).toBeGreaterThanOrEqual(0.7);
  expect(visual.toneMapping).toBe(true);
  expect(visual.outputColorSpace).toBe(true);
  expect(visual.pixelRatio).toBeLessThanOrEqual(1.15);

  await page.setViewportSize({ width: 900, height: 650 });
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.cinematicState().bloomEnabled)).toBe(true);
  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter(text => !/favicon|third-party cookie/i.test(text))).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});