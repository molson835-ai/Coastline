const { test, expect } = require('@playwright/test');

async function openGame(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
  return errors;
}

test('live runtime starts naked island and crosses one-block bridge into City', async ({ page }) => {
  const errors = await openGame(page);
  const initial = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    player: window.__coastlineTransitionTest.playerState(),
    layout: window.__coastlineTransitionTest.world2Layout(),
    spawn: window.__coastlineTransitionTest.world2Spawn(),
    visual: window.__coastlineTransitionTest.visualIdentity(),
    vehicleVisible: window.__coastlineTransitionTest.activeVehicleVisible(),
  }));
  expect(initial.status.activeWorldId).toBe('island');
  expect(initial.status.residentWorldIds).toEqual(['island']);
  expect(initial.roots).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect(initial.player.mode).toBe('vehicle');
  expect(initial.player.position.x).toBe(initial.spawn.x);
  expect(initial.player.position.z).toBe(initial.spawn.z);
  expect(initial.layout.bounds.width).toBeLessThanOrEqual(260);
  expect(initial.layout.bounds.depth).toBeLessThanOrEqual(260);
  expect(initial.layout.bridgeLength).toBe(100);
  expect(initial.layout.palm).toBeNull();
  expect(initial.layout.bridgeIslandEdge).toBeCloseTo(initial.layout.bounds.minZ, 0);
  expect(initial.layout.bridgeCityEdge).toBeCloseTo(initial.layout.bounds.minZ - 100, 0);
  expect(initial.layout.spawnToIslandBridge).toBeLessThanOrEqual(50);
  expect(initial.vehicleVisible).toBe(true);

  const cityStart = await page.evaluate(() => window.__coastlineTransitionTest.cityBridgeContract());
  expect(cityStart.bridgeLength).toBe(100);
  expect(cityStart.cityEdge).toBeCloseTo(cityStart.cityMapEdge, 0);

  await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.setVehiclePosition(500, 400, Math.PI);
    api.keyDown('w');
    api.advanceTestFrame(1 / 60, 240);
    api.keyUp('w');
    await window.__coastlineTransitionTest.flushAutoTransition();
  });

  const crossed = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    visual: window.__coastlineTransitionTest.visualIdentity(),
  }));
  expect(crossed.status.activeWorldId).toBe('city');
  expect(crossed.status.residentWorldIds).toEqual(['city']);
  expect(crossed.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(crossed.player.vehicleIndex).toBe(initial.player.vehicleIndex);
  expect(crossed.visual).toEqual(initial.visual);
  expect(errors).toEqual([]);
});

test('failed island load cleans partial shell resources, preserves City, and can be retried', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
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
  expect(errors).toEqual([]);
});

test('bridge prompt only appears for a nearby vehicle facing the island bridge, and walking cannot trigger it', async ({ page }) => {
  await openGame(page);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 390, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 390, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeVisible();
  const facingToward = await page.locator('#coastlineWorldTransition').evaluate(button => ({ padding: getComputedStyle(button).padding, text: button.textContent }));
  expect(facingToward.padding).toBe('6px 8px');
  expect(facingToward.text).toBe('CROSS TO CITY');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 350, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();

  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(500, 390, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();
});
