const { test, expect } = require('@playwright/test');

test('courier activity can be discovered, completed, rewarded, and replayed', async ({ page }) => {
  await page.goto('/game-v3.html?sandbox=0', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const initial = await page.evaluate(() => window.__coastlineTest.state());
  expect(initial.cashBalance).toBe(250);
  expect(initial.missionState).toBe('go');

  await page.evaluate(() => window.__coastlineTest.startMission());
  expect((await page.evaluate(() => window.__coastlineTest.state())).missionState).toBe('deliver');
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(100, -50, 0));
  await page.waitForFunction(() => window.__coastlineTest.state().missionState === 'done', null, { timeout: 5000 });
  const firstComplete = await page.evaluate(() => window.__coastlineTest.state());
  expect(firstComplete.cashBalance).toBe(750);
  await expect(page.locator('#cash')).toHaveText('750');
  expect(firstComplete.missionRuns).toBe(1);

  await page.evaluate(() => window.__coastlineTest.startMission());
  expect((await page.evaluate(() => window.__coastlineTest.state())).missionState).toBe('deliver');
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(100, -50, 0));
  await page.waitForFunction(() => {
    const s = window.__coastlineTest.state();
    return s.missionState === 'done' && s.missionRuns === 2;
  }, null, { timeout: 5000 });
  const secondComplete = await page.evaluate(() => window.__coastlineTest.state());
  expect(secondComplete.cashBalance).toBe(1250);
  await expect(page.locator('#cash')).toHaveText('1250');
});
