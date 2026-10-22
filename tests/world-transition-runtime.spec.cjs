const { test, expect } = require('@playwright/test');

async function openGame(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
  return errors;
}

test('live runtime starts in City and supports deterministic City to World 2 and return transitions', async ({ page }) => {
  const errors = await openGame(page);
  const initial = await page.evaluate(() => ({ status: window.__coastlineTransitionTest.status(), roots: window.__coastlineTransitionTest.rootVisibility() }));
  expect(initial.status.activeWorldId).toBe('city');
  expect(initial.status.residentWorldIds).toEqual(['city']);
  expect(initial.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });

  const cityStart = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  const island = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
  }));
  expect(island.status.activeWorldId).toBe('island');
  expect(island.status.residentWorldIds).toEqual(['island']);
  expect(island.roots).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect(island.player.position.x).toBe(500);
  expect(island.player.position.z).toBe(500);

  const moved = await page.evaluate(async () => {
    const api = window.__coastlineTest;
    const before = window.__coastlineTransitionTest.playerState();
    api.keyDown('w');
    api.advanceTestFrame(1 / 60, 60);
    api.keyUp('w');
    const after = window.__coastlineTransitionTest.playerState();
    return { before, after };
  });
  expect(moved.after.position.z).toBeGreaterThan(moved.before.position.z + 0.25);
  expect(moved.after.position.x).toBeGreaterThanOrEqual(290);
  expect(moved.after.position.x).toBeLessThanOrEqual(710);
  expect(moved.after.position.z).toBeGreaterThanOrEqual(290);
  expect(moved.after.position.z).toBeLessThanOrEqual(710);
  expect(island.player.vehicleIndex).toBe(cityStart.vehicleIndex);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-city'));
  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
  }));
  expect(returned.status.activeWorldId).toBe('city');
  expect(returned.status.residentWorldIds).toEqual(['city']);
  expect(returned.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(returned.player.position.x).toBe(cityStart.position.x);
  expect(returned.player.position.z).toBe(cityStart.position.z);
  expect(errors).toEqual([]);
});

test('failed World 2 load cleans partial shell resources, preserves City, and can be retried', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__coastlineTransitionTest.failNextWorld2Load());
  await expect(page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'))).rejects.toThrow(/injected world 2 load failure/i);

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

test('bridge prompt only appears for a nearby vehicle facing the bridge, with a halved range and compact size', async ({ page }) => {
  await openGame(page);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(0, -690, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  const facingAway = await page.locator('#coastlineWorldTransition').evaluate(button => ({
    display: getComputedStyle(button).display,
    padding: getComputedStyle(button).padding,
  }));
  expect(facingAway.display).toBe('none');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(0, -690, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeVisible();
  const facingToward = await page.locator('#coastlineWorldTransition').evaluate(button => ({
    padding: getComputedStyle(button).padding,
  }));
  expect(facingToward.padding).toBe('6px 8px');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(0, -670, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();

  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(0, -690, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineWorldTransition')).toBeHidden();
});
