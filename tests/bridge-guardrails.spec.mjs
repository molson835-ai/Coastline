import { test, expect } from '@playwright/test';

test('vehicle envelopes stay inside visible rope-bridge rails without blocking landings', async ({ page }) => {
  await page.goto('/game-v3.html?beta=bridge-guardrails', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.__coastlineBridgeSideBlocked === 'function', null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const original = window.__coastlineActiveWorldId;
    const radius = 1.65;
    const cases = {};
    window.__coastlineActiveWorldId = 'city';
    cases.cityCenter = window.__coastlineBridgeSideBlocked(0, -800, radius);
    cases.citySide = window.__coastlineBridgeSideBlocked(1.2, -800, radius);
    cases.cityLanding = window.__coastlineBridgeSideBlocked(1.2, -749, radius);
    window.__coastlineActiveWorldId = 'island';
    cases.islandCenter = window.__coastlineBridgeSideBlocked(500, 340, radius);
    cases.islandSide = window.__coastlineBridgeSideBlocked(501.2, 340, radius);
    window.__coastlineActiveWorldId = 'waterfront';
    cases.eastCenter = window.__coastlineBridgeSideBlocked(650, 500, radius);
    cases.eastSide = window.__coastlineBridgeSideBlocked(650, 501.2, radius);
    window.__coastlineActiveWorldId = original;
    return cases;
  });
  expect(result).toEqual({
    cityCenter: false, citySide: true, cityLanding: false,
    islandCenter: false, islandSide: true,
    eastCenter: false, eastSide: true,
  });
});
