const { test, expect } = require('@playwright/test');

async function openGame(page, query = 'replacement-pr') {
  await page.goto('/game-v3.html?beta=' + query, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest && window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('active driving runtime keeps A/D and touch controls logically distinct', async ({ page }) => {
  await openGame(page, 'replacement-steering');
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.steeringKeyState), null, { timeout: 30000 });
  const initial = await page.evaluate(() => window.__coastlineTest.steeringKeyState());
  expect(initial.mode).toBe('vehicle');
  const keyboardA = await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    const state = window.__coastlineTest.steeringKeyState();
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
    return state;
  });
  expect(keyboardA.a).toBe(true); expect(keyboardA.d).toBe(false);
  const keyboardD = await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
    const state = window.__coastlineTest.steeringKeyState();
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }));
    return state;
  });
  expect(keyboardD.d).toBe(true); expect(keyboardD.a).toBe(false);
  const touch = await page.evaluate(() => {
    const result = {};
    for (const key of ['a', 'd']) {
      const button = document.querySelector(`[data-k="${key}"]`);
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: key === 'a' ? 77 : 78, pointerType: 'touch' }));
      result[key] = window.__coastlineTest.steeringKeyState();
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: key === 'a' ? 77 : 78, pointerType: 'touch' }));
    }
    return result;
  });
  expect(touch.a.a).toBe(true); expect(touch.a.d).toBe(false);
  expect(touch.d.d).toBe(true); expect(touch.d.a).toBe(false);
});

test('vehicle steering regression measures actual movement in forward and reverse', async ({ page }) => {
  await openGame(page, 'replacement-steering-trajectory');
  await page.waitForFunction(() => typeof window.__coastlineTest?.steeringProbe === 'function', null, { timeout: 30000 });
  const result = await page.evaluate(() => ({
    forwardLeft: window.__coastlineTest.steeringProbe('a', { direction: 'forward', frames: 30 }),
    forwardRight: window.__coastlineTest.steeringProbe('d', { direction: 'forward', frames: 30 }),
    reverseLeft: window.__coastlineTest.steeringProbe('a', { direction: 'reverse', frames: 30 }),
    reverseRight: window.__coastlineTest.steeringProbe('d', { direction: 'reverse', frames: 30 }),
  }));
  expect(result.forwardLeft.displacement.x).toBeLessThan(0);
  expect(result.forwardRight.displacement.x).toBeGreaterThan(0);
  expect(result.reverseLeft.displacement.x).toBeGreaterThan(0);
  expect(result.reverseRight.displacement.x).toBeLessThan(0);
});

test('cave entrance is walkable while adjacent and rear mountain space is blocked', async ({ page }) => {
  await openGame(page, 'replacement-cave');
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  const result = await page.evaluate(() => {
    const t = window.__coastlineTransitionTest;
    const entrance = window.__coastlineTest.buildingBlocked(520, 522.5, .45);
    const left = window.__coastlineTest.buildingBlocked(514, 522.5, .45);
    const right = window.__coastlineTest.buildingBlocked(526, 522.5, .45);
    const rear = window.__coastlineTest.buildingBlocked(520, 538, .45);
    return { entrance, left, right, rear, cave: t.caveState?.() };
  });
  expect(result.entrance).toBe(false);
  expect(result.left).toBe(true);
  expect(result.right).toBe(true);
  expect(result.rear).toBe(true);
});

test('CTM cave transition fires once and round-trips the player coherently', async ({ page }) => {
  await openGame(page, 'replacement-ctm');
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
    window.__coastlineTest.setWalkPosition(520, 522.5, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('electric-lemonade-dungeon');
  const inside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(inside.mode).toBe('walk');
  expect(Number.isFinite(inside.position.x)).toBe(true);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('electric-dungeon-to-waterfront'));
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('waterfront');
  const outside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(outside.mode).toBe('walk');
  expect(Number.isFinite(outside.position.x)).toBe(true);
  expect(Number.isFinite(outside.position.z)).toBe(true);
});

test('Waterfront lemonade pedestrian is a living actor attached to the stand world', async ({ page }) => {
  await openGame(page, 'replacement-lemonade');
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  await page.waitForFunction(() => Boolean(window.__coastlineWaterfrontVendorActor?.root), null, { timeout: 30000 });
  const state = await page.evaluate(() => {
    const actor = window.__coastlineWaterfrontVendorActor?.root;
    const stand = window.__coastlineRegionRoot?.getObjectByName('coastline-electric-lemonade-stand');
    const meshes = [];
    actor?.traverse(n => { if (n.isMesh) meshes.push(n); });
    return {
      present: Boolean(actor),
      parentIsWorld: actor?.parent === window.__coastlineRegionRoot,
      standPresent: Boolean(stand),
      meshes: meshes.length,
      visible: actor?.visible !== false,
    };
  });
  expect(state.present).toBe(true);
  expect(state.parentIsWorld).toBe(true);
  expect(state.standPresent).toBe(true);
  expect(state.meshes).toBeGreaterThan(0);
  expect(state.visible).toBe(true);
});
