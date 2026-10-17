const { test, expect } = require('@playwright/test');

test('pre-garage beta boots with runtime protection and telemetry', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.__coastlineRuntimeSnapshot === 'function', null, { timeout: 30000 });

  const snapshot = await page.evaluate(() => window.__coastlineRuntimeSnapshot());
  expect(snapshot.tag).toBe('CoastlineRuntimeV32');
  expect(snapshot.loading).toBe(false);
  expect(snapshot.contextLost).toBe(false);
  expect(Number.isFinite(snapshot.fps)).toBe(true);
  expect(Number.isFinite(snapshot.calls)).toBe(true);
  expect(Number.isFinite(snapshot.geometries)).toBe(true);

  await page.waitForTimeout(2500);
  const settled = await page.evaluate(() => window.__coastlineRuntimeSnapshot());
  expect(settled.contextLost).toBe(false);
  expect(settled.errors).toBeLessThan(3);
  expect(pageErrors.filter(message => !/ResizeObserver loop/i.test(message))).toHaveLength(0);
});

test('pre-garage beta exposes one runtime control surface instead of garage runtime wiring', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });

  const result = await page.evaluate(() => ({
    runtime: Boolean(window.__coastlineRuntime),
    snapshot: typeof window.__coastlineRuntimeSnapshot === 'function',
    garageRuntime: Boolean(window.__coastlineGarageRuntime),
    hooks: Boolean(window.__coastlineHooks)
  }));

  expect(result.runtime).toBe(true);
  expect(result.snapshot).toBe(true);
  expect(result.garageRuntime).toBe(false);
  expect(result.hooks).toBe(true);
});
