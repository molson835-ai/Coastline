const { test, expect } = require('@playwright/test');

test('living-world decisions are bounded, contextual, and reproducible', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => !!window.__coastlineTest?.livingWorldRules), { timeout: 15000 }).toBe(true);

  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const rules = api.livingWorldRules();
    const residentA = api.chooseResidentActivity({ id: 17, daylight: 0.8, weather: 'clear', timeSlice: 42 });
    const residentB = api.chooseResidentActivity({ id: 17, daylight: 0.8, weather: 'clear', timeSlice: 42 });
    const rainy = api.chooseResidentActivity({ id: 17, daylight: 0.8, weather: 'rain', timeSlice: 42 });
    const threatened = api.chooseWildlifeBehavior({ id: 2, daylight: 0.8, weather: 'clear', threatDistance: 3, phase: 5, species: 'deer' });
    const state = api.livingWorldState();
    return { rules, residentA, residentB, rainy, threatened, state };
  });

  expect(result.rules.version).toBe(1);
  expect(result.rules.decisionsPerRenderFrame).toBe(false);
  expect(result.residentA).toBe(result.residentB);
  expect(result.rules.activities).toContain(result.residentA);
  expect(result.rules.activities).toContain(result.rainy);
  expect(result.threatened).toBe('flee');
  expect(Object.values(result.state.residentActivities).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
