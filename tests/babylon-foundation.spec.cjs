const { test, expect } = require('@playwright/test');

test('Babylon preview boots and exposes a working mobile-safe driving loop', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#renderCanvas')).toBeAttached();
  await expect.poll(() => page.locator('#status').textContent(), { timeout: 20000 })
    .toContain('Ready');

  await page.waitForFunction(() => Boolean(window.__coastlineBabylonTest), null, { timeout: 20000 });
  const before = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(before.buildingColliders, 'procedural buildings should participate in collision checks').toBeGreaterThan(10);
  expect(before.treeColliders, 'tree trunks should participate in collision checks').toBeGreaterThan(5);
  expect(before.remainingDiscoveries, 'free-roam discoveries should be initialized').toBe(5);
  await expect(page.locator('#mission')).toContainText('DISCOVERIES');
  await expect(page.locator('#toast')).toBeAttached();
  await page.evaluate(() => window.__coastlineBabylonTest.keyDown('w'));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineBabylonTest.keyUp('w'));
  const forward = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(forward.speed, 'forward input should build usable speed').toBeGreaterThan(2);
  expect(Math.hypot(forward.x - before.x, forward.z - before.z), 'car should move').toBeGreaterThan(0.5);
  expect(forward.wheelSpin.some((spin, i) => spin !== before.wheelSpin[i]), 'wheels should visibly rotate while driving').toBe(true);

  await page.evaluate(() => window.__coastlineBabylonTest.keyDown('a'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__coastlineBabylonTest.keyUp('a'));
  const left = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(left.heading, 'left input should change heading left').toBeLessThan(forward.heading);

  expect(pageErrors, 'Babylon should not throw runtime errors').toEqual([]);
});

test('car cannot pass through procedural building collision bounds', async ({ page }) => {
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineBabylonTest), null, { timeout: 20000 });
  const target = await page.evaluate(() => {
    const api = window.__coastlineBabylonTest;
    const b = api.colliders()[0];
    api.setPosition(b.x - b.hw - 0.7, b.z, Math.PI / 2);
    api.keyDown('w');
    return b;
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__coastlineBabylonTest.keyUp('w'));
  const after = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(after.x, 'car should stop at the building boundary rather than tunnel through it')
    .toBeLessThan(target.x - target.hw + 0.2);
});

test('discovery progress survives a page reload', async ({ page }) => {
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineBabylonTest), null, { timeout: 20000 });
  await page.evaluate(() => window.__coastlineBabylonTest.setPosition(30, 0, 0));
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem('coastline.babylon.save.v1') || '{}').discoveries?.includes(0); }
    catch (_) { return false; }
  }, null, { timeout: 5000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineBabylonTest), null, { timeout: 20000 });
  const state = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(state.discoveries, 'the collected discovery should be restored after reload').toBe(1);
  expect(state.remainingDiscoveries).toBe(4);
});

test('touch controls are visible and pointer-safe on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#touch')).toBeVisible();
  await expect(page.locator('[data-key="w"]')).toBeVisible();
  await expect(page.locator('[data-key="a"]')).toBeVisible();
  await page.locator('[data-key="w"]').dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(350);
  await page.locator('[data-key="w"]').dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  const state = await page.evaluate(() => window.__coastlineBabylonTest.state());
  expect(state.speed).toBeGreaterThan(0);
});

test('world factory is deterministic and exposes renderer-independent layout data', async ({ page }) => {
  await page.goto('/babylon/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.CoastlineWorldFactory && window.__coastlineBabylonTest), null, { timeout: 20000 });
  const result = await page.evaluate(() => {
    const a = window.CoastlineWorldFactory.create(12345);
    const b = window.CoastlineWorldFactory.create(12345);
    const c = window.CoastlineWorldFactory.create(54321);
    const sequence = factory => [factory.rand(), factory.rand(), factory.rand(), factory.rand()];
    return {
      sameSeed: JSON.stringify(sequence(a)) === JSON.stringify(sequence(b)),
      differentSeed: JSON.stringify(sequence(window.CoastlineWorldFactory.create(12345))) !== JSON.stringify(sequence(c)),
      roads: a.roadCoordinates,
      blocks: a.blockCenters,
      pickups: a.pickupPositions,
      gameSeed: window.__coastlineBabylonTest.state().seed
    };
  });
  expect(result.sameSeed, 'the same seed must reproduce the same random sequence').toBe(true);
  expect(result.differentSeed, 'different seeds should produce different random sequences').toBe(true);
  expect(result.roads).toEqual([-90, -60, -30, 0, 30, 60, 90]);
  expect(result.blocks).toEqual([-105, -75, -45, -15, 15, 45, 75, 105]);
  expect(result.pickups).toHaveLength(5);
  expect(result.gameSeed).toBe(1701);
});
