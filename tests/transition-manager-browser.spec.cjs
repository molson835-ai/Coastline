const { test, expect } = require('@playwright/test');

test('live game runtime exposes the CTM bridge and returns to the preserved City state', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });

  const before = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
  }));
  expect(before.status.state).toBe('active');
  expect(before.status.activeWorldId).toBe('city');
  expect(before.status.residentWorldIds).toEqual(['city']);
  expect(before.roots).toMatchObject({ cityVisible: true, islandVisible: false });

  const cityStart = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  const island = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(island.status.state).toBe('active');
  expect(island.status.activeWorldId).toBe('island');
  expect(island.status.residentWorldIds).toEqual(['island']);
  expect(island.roots).toMatchObject({ cityVisible: false, islandVisible: true, islandRootResident: true });
  expect(island.player.position).toMatchObject({ x: 1500, z: 1500 });
  expect(island.player.vehicleIndex).toBe(cityStart.vehicleIndex);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(returned.status.activeWorldId).toBe('city');
  expect(returned.status.residentWorldIds).toEqual(['city']);
  expect(returned.roots).toMatchObject({ cityVisible: true, islandVisible: false, islandRootResident: false });
  expect(returned.player.position.x).toBe(cityStart.position.x);
  expect(returned.player.position.z).toBe(cityStart.position.z);
  expect(pageErrors).toEqual([]);
});
