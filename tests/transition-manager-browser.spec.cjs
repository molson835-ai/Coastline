const { test, expect } = require('@playwright/test');

test('live game runtime starts on the island and crosses the CTM bridge into preserved City state', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });

  const before = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(before.status.state).toBe('active');
  expect(before.status.activeWorldId).toBe('island');
  expect(before.status.residentWorldIds).toEqual(['island']);
  expect(before.roots).toMatchObject({ cityVisible: false, islandVisible: true, islandRootResident: true });

  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  const city = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(city.status.state).toBe('active');
  expect(city.status.activeWorldId).toBe('city');
  expect(city.status.residentWorldIds).toEqual(['city']);
  expect(city.roots).toMatchObject({ cityVisible: true, islandVisible: false, islandRootResident: false });
  expect(city.player.vehicleIndex).toBe(before.player.vehicleIndex);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(returned.status.activeWorldId).toBe('island');
  expect(returned.status.residentWorldIds).toEqual(['island']);
  expect(returned.roots).toMatchObject({ cityVisible: false, islandVisible: true, islandRootResident: true });
  expect(returned.player.vehicleIndex).toBe(before.player.vehicleIndex);
  expect(pageErrors).toEqual([]);
});
