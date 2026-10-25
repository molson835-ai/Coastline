const { test, expect } = require('@playwright/test');

async function openGame(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
  return errors;
}

async function prepareCityForReturnBridgeTest(page) {
  await page.evaluate(async () => {
    const transitions = window.__coastlineTransitionTest;
    if (transitions.status().activeWorldId === 'city') await transitions.transition('city-to-island');
    if (transitions.status().activeWorldId === 'island') await transitions.transition('island-to-city');
  });
}

test('live runtime starts in populated City and transitions to Island and back', async ({ page }) => {
  const errors = await openGame(page);
  const initial = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(initial.status).toMatchObject({ state: 'active', activeWorldId: 'city', residentWorldIds: ['city'] });
  expect(initial.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(initial.roots.cityContent.visibleMeshes).toBeGreaterThan(100);

  const island = await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(island).toMatchObject({ state: 'active', activeWorldId: 'island', residentWorldIds: ['island'] });
  const islandState = await page.evaluate(() => ({
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(islandState.roots).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect(islandState.player.position.z).toBe(290);
  expect(islandState.player.vehicleIndex).toBe(initial.player.vehicleIndex);

  const city = await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  expect(city).toMatchObject({ state: 'active', activeWorldId: 'city', residentWorldIds: ['city'] });
  const returned = await page.evaluate(() => ({
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(returned.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(returned.roots.cityContent.visibleMeshes).toBeGreaterThan(100);
  expect(returned.player.position.z).toBe(-850);
  expect(returned.player.heading).toBe(0);
  expect(returned.player.vehicleIndex).toBe(initial.player.vehicleIndex);
  expect(errors).toEqual([]);
});

test('City bridge crossing returns to the island bridge buffer instead of spawning inside the island', async ({ page }) => {
  const errors = await openGame(page);
  await prepareCityForReturnBridgeTest(page);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');

  await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.setVehiclePosition(0, -740, Math.PI);
    api.keyDown('w');
    for (let i = 0; i < 35; i += 1) {
      api.advanceTestFrame(1 / 60, 10);
      window.__coastlineTransitionTest.updatePrompt();
      if (window.__coastlineTransitionTest.status().activeWorldId === 'island') break;
    }
    api.keyUp('w');
    await window.__coastlineTransitionTest.flushAutoTransition();
  });

  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
  }));
  expect(returned.status.activeWorldId).toBe('island');
  expect(returned.status.residentWorldIds).toEqual(['island']);
  expect(returned.player.position.z).toBe(290);
  expect(returned.player.heading).toBe(0);
  expect(returned.roots).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect(errors).toEqual([]);
});

test('failed island load cleans partial shell resources, preserves City, and can be retried', async ({ page }) => {
  const errors = await openGame(page);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');
  await page.evaluate(() => window.__coastlineTransitionTest.failNextWorld2Load());
  await expect(page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'))).rejects.toThrow(/injected island load failure/i);

  const failed = await page.evaluate(() => window.__coastlineTransitionTest.status());
  expect(failed.activeWorldId).toBe('city');
  expect(failed.state).toBe('active');
  expect(failed.residentWorldIds).toEqual(['city']);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.rootVisibility())).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  const retried = await page.evaluate(() => window.__coastlineTransitionTest.status());
  expect(retried.activeWorldId).toBe('island');
  expect(retried.residentWorldIds).toEqual(['island']);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.rootVisibility())).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).position.z).toBe(290);
  expect(errors).toEqual([]);
});

test('bridge prompt only appears for a nearby vehicle facing the island bridge, and walking cannot trigger it', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 370, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 370, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeVisible();
  const facingToward = await page.locator('#coastlineWorldTransition').evaluate(button => ({ padding: getComputedStyle(button).padding, text: button.textContent }));
  expect(facingToward.padding).toBe('6px 8px');
  expect(facingToward.text).toBe('CROSS TO CITY');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 350, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();

  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(500, 290, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();
});
