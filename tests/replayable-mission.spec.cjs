const { test, expect } = require('@playwright/test');

test('courier activity remains disabled during the foundation phase', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const initial = await page.evaluate(() => window.__coastlineTest.state());
  expect(initial.cashBalance).toBe(250);
  expect(initial.missionState).toBe('go');
  expect(initial.missionRuns).toBe(0);

  const started = await page.evaluate(() => window.__coastlineTest.startMission());
  expect(started).toBe(false);
  const afterAttempt = await page.evaluate(() => window.__coastlineTest.state());
  expect(afterAttempt.missionState).toBe('go');
  expect(afterAttempt.cashBalance).toBe(250);
  expect(afterAttempt.missionRuns).toBe(0);
});
