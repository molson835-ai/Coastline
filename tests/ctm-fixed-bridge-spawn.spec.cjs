const { test, expect } = require('@playwright/test');

test('bridge destinations remain fixed after gameplay frames and a round trip', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });

  const initial = await page.evaluate(() => window.__coastlineTransitionTest.status());
  expect(initial).toMatchObject({ state: 'active', activeWorldId: 'city', residentWorldIds: ['city'] });

  const islandArrival = await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(islandArrival).toMatchObject({ state: 'active', activeWorldId: 'island', residentWorldIds: ['island'] });
  expect(islandArrival).not.toHaveProperty('root');
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).position.z).toBe(290);
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 5));
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).position.z).toBe(290);

  // Move into the island before returning so the fixed City spawn cannot
  // accidentally reuse a previous location.
  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(500, 350, 0));
  const cityArrival = await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  expect(cityArrival).toMatchObject({ state: 'active', activeWorldId: 'city', residentWorldIds: ['city'] });
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).position.z).toBe(-850);
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 5));
  const finalState = await page.evaluate(() => ({ status: window.__coastlineTransitionTest.status(), player: window.__coastlineTransitionTest.playerState(), contract: window.__coastlineTransitionTest.cityBridgeContract() }));
  expect(finalState.status.activeWorldId).toBe('city');
  expect(finalState.player.position.z).toBe(-850);
  expect(finalState.player.heading).toBe(0);
  expect(finalState.contract.spawnPolicy).toBe('fixed');
  expect(errors).toEqual([]);
});
