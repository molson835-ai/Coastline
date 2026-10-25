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


async function driveAcrossBridge(page) {
  await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.setVehiclePosition(0, -740, Math.PI);
    api.keyDown('w');
    for (let i = 0; i < 40; i += 1) {
      api.advanceTestFrame(1 / 60, 10);
      window.__coastlineTransitionTest.updatePrompt();
      if (window.__coastlineTransitionTest.status().activeWorldId !== 'city') break;
    }
    api.keyUp('w');
    await window.__coastlineTransitionTest.flushAutoTransition();
  });
}

test('live runtime starts in populated City and crosses the bridge into World 2', async ({ page }) => {
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
  expect(initial.status.activeWorldId).toBe('city');
  expect(initial.status.residentWorldIds).toEqual(['city']);
  expect(initial.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(initial.roots.cityContent.meshes).toBeGreaterThan(100);
  expect(initial.roots.cityContent.visibleMeshes).toBeGreaterThan(100);
  expect(initial.player.mode).toBe('vehicle');
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
  expect(cityStart.cityMapEdge).toBe(-750);
  expect(cityStart.bridgeEnd).toBe(-850);
  expect(cityStart.destination.z).toBe(-850);
  expect(cityStart.destination.rotationY).toBe(0);

  await driveAcrossBridge(page);

  const crossed = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    visual: window.__coastlineTransitionTest.visualIdentity(),
  }));
  expect(crossed.status.activeWorldId).toBe('island');
  expect(crossed.status.residentWorldIds).toEqual(['island']);
  expect(crossed.roots).toMatchObject({ cityVisible: false, cityCachedInScene: true, islandVisible: true, islandRootResident: true });
  expect(crossed.player.vehicleIndex).toBe(initial.player.vehicleIndex);
  expect(crossed.player.position.z).toBe(290);
  expect(crossed.player.heading).toBe(0);
  expect(crossed.visual).toEqual(initial.visual);
  expect(errors).toEqual([]);
});

test('crossing back from World 2 restores the populated City buffer', async ({ page }) => {
  const errors = await openGame(page);
  await driveAcrossBridge(page);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');

  await page.evaluate(async () => {
    const api = window.__coastlineTest;
    api.setVehiclePosition(500, 310, Math.PI);
    api.keyDown('w');
    for (let i = 0; i < 35; i += 1) {
      api.advanceTestFrame(1 / 60, 10);
      window.__coastlineTransitionTest.updatePrompt();
      if (window.__coastlineTransitionTest.status().activeWorldId === 'city') break;
    }
    api.keyUp('w');
    await window.__coastlineTransitionTest.flushAutoTransition();
  });

  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    player: window.__coastlineTransitionTest.playerState(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
  }));
  expect(returned.status.activeWorldId).toBe('city');
  expect(returned.status.residentWorldIds).toEqual(['city']);
  expect(returned.player.position.z).toBe(-850);
  expect(returned.player.heading).toBe(0);
  expect(returned.roots).toMatchObject({ cityVisible: true, cityCachedInScene: true, islandVisible: false, islandRootResident: false });
  expect(errors).toEqual([]);
});


test('four-region CTM route reaches distinct Residential, Waterfront and Port worlds and returns to City', async ({ page }) => {
  const errors = await openGame(page);
  const api = () => window.__coastlineTransitionTest;
  expect(await page.evaluate(() => window.__coastlineTransitionTest.worldIds())).toEqual(['city', 'island', 'waterfront', 'port']);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  let state = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.regionRoots(),
  }));
  expect(state.status).toMatchObject({ activeWorldId: 'island', residentWorldIds: ['island'] });
  expect(state.roots.residential.meshes).toBeGreaterThan(25);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeWorldColliderCount())).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__coastlineTest.buildingBlocked(434, 484, 1.6))).toBe(true);
  expect(await page.evaluate(() => window.__coastlineTest.buildingBlocked(500, 417, 1.6))).toBe(false);
  expect(await page.evaluate(() => window.__coastlineTest.vehicleBlocked(500, 500, 1.6))).toBe(false);
  expect(await page.evaluate(() => window.__coastlineTest.pedestrianBlocked(500, 500, 1.6))).toBe(false);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(710, 500, Math.PI / 2);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('waterfront');
  state = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.regionRoots(),
  }));
  expect(state.status.residentWorldIds).toEqual(['waterfront']);
  expect(state.roots.waterfront.meshes).toBeGreaterThan(25);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeWorldColliderCount())).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(710, 500, Math.PI / 2);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('port');
  state = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.regionRoots(),
  }));
  expect(state.status.residentWorldIds).toEqual(['port']);
  expect(state.roots.port.meshes).toBeGreaterThan(25);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeWorldColliderCount())).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(290, 500, -Math.PI / 2);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('waterfront');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(290, 500, -Math.PI / 2);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('island');

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 290, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('city');
  const returned = await page.evaluate(() => ({
    status: window.__coastlineTransitionTest.status(),
    roots: window.__coastlineTransitionTest.rootVisibility(),
    vehicle: window.__coastlineTransitionTest.activeVehicleVisible(),
  }));
  expect(returned.status.residentWorldIds).toEqual(['city']);
  expect(returned.roots.cityContent.visibleMeshes).toBeGreaterThan(100);
  expect(returned.vehicle).toBe(true);
  expect(errors).toEqual([]);
});
