const { test, expect } = require('@playwright/test');

test('garage network starts with one open shop and other shops unlock through local task chains', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const initial = await page.evaluate(() => window.__coastlineTest.garageState());
  expect(initial).toHaveLength(3);
  expect(initial.filter(g => g.unlocked)).toHaveLength(1);
  expect(initial.map(g => g.owner)).toEqual(expect.arrayContaining(['Mack Reyes', 'Tasha Cole', 'Rico Alvarez']));
  expect(initial.every(g => g.discount === 0)).toBe(true);
  const locked = initial.find(g => !g.unlocked);
  expect(await page.evaluate(id => window.__coastlineTest.startGarageChain(id), locked.id)).toBe(true);
  expect(await page.evaluate(() => window.__coastlineTest.garageState().find(g => !g.unlocked).chainStage)).toBe(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
