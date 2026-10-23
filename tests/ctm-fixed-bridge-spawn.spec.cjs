const { test, expect } = require('@playwright/test');

test('bridge destinations remain fixed after gameplay frames and a round trip', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });

  const api = () => window.__coastlineTransitionTest;
  expect((await page.evaluate(() => api().status())).activeWorldId).toBe('island');

  await page.evaluate(() => api().transition('island-to-city'));
  expect((await page.evaluate(() => api().playerState())).position.z).toBe(-850);

  // The CTM destination is intentionally outside the normal City bounds.
  // Run real gameplay frames: the vehicle must remain on the bridge buffer,
  // rather than being clamped back into the City.
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 5));
  const afterArrivalFrames = await page.evaluate(() => api().playerState());
  expect(afterArrivalFrames.position.z).toBe(-850);

  // Deliberately move into the City before returning so the manager has a
  // non-buffer source position available; fixed bridge spawns must ignore it.
  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(0, -700, Math.PI));
  await page.evaluate(() => api().transition('city-to-island'));
  expect((await page.evaluate(() => api().playerState())).position.z).toBe(290);
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 5));
  expect((await page.evaluate(() => api().playerState())).position.z).toBe(290);

  await page.evaluate(() => api().transition('island-to-city'));
  const finalState = await page.evaluate(() => ({ status: api().status(), player: api().playerState(), contract: api().cityBridgeContract() }));
  expect(finalState.status.activeWorldId).toBe('city');
  expect(finalState.player.position.z).toBe(-850);
  expect(finalState.player.heading).toBe(0);
  expect(finalState.contract.spawnPolicy).toBe('fixed');
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(1 / 60, 5));
  expect((await page.evaluate(() => api().playerState())).position.z).toBe(-850);
  expect(errors).toEqual([]);
});
