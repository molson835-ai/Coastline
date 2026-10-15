const { test, expect } = require('@playwright/test');

test('witnessed player conduct creates persistent local rumors that NPCs can repeat', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const api = window.__coastlineTest;
  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(0, 0, 0);
    window.__coastlineTest.setPedestrianPosition(0, 2, 0);
    window.__coastlineTest.recordConduct('collision', 1, { test: true });
  });

  const social = await page.evaluate(() => window.__coastlineTest.socialRumorState());
  const rumor = social.rumors.find(item => item.topic === 'recklessDriving');
  expect(rumor).toBeTruthy();
  expect(rumor.history.length).toBeGreaterThan(0);
  const witness = social.people.find(person => person.id === 'ped-0');
  expect(witness.knowledge.recklessDriving).toBeTruthy();
  expect(social.people.length).toBeGreaterThan(50);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
