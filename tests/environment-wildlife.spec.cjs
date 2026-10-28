const { test, expect } = require('@playwright/test');

test('the sunset, day-night cycle, weather controls and wildlife are available', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => { const state = window.__coastlineTest?.wildlifeAssetState?.(); return Boolean(state && state.totalInstances >= 6); }, null, { timeout: 30000 });

  const initial = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return { sky: api.skyState(), environment: api.environmentState(), wildlife: api.wildlifeRoster(), assets: api.wildlifeAssetState() };
  });
  expect(initial.sky.theme).toBe('vice-city-sunset');
  expect(initial.sky.gradient).toContain('pink');
  expect(initial.environment.cycleMs).toBe(900000);
  expect(initial.environment.sunsetLength).toBeGreaterThanOrEqual(0.2);
  expect(initial.sky.sunset).toBeGreaterThan(0.5);
  expect(initial.sky.daylight).toBeGreaterThan(0);
  expect(initial.wildlife.filter(a => a.kind === 'horse')).toHaveLength(3);
  expect(initial.wildlife.filter(a => a.kind === 'ostrich')).toHaveLength(3);
  expect(initial.wildlife.every(a => a.rideable)).toBe(true);
  expect(initial.wildlife.some(a => a.kind === 'deer' || a.kind === 'birds')).toBe(false);
  expect(initial.assets.totalInstances).toBe(6);

  const weather = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return ['clear', 'cloudy', 'rain', 'fog'].map(kind => ({ kind, accepted: api.setWeather(kind), state: api.environmentState().weather }));
  });
  expect(weather.every(w => w.accepted && w.kind === w.state)).toBe(true);
  expect(pageErrors).toEqual([]);
});
