const { test, expect } = require('@playwright/test');

async function openGame(page, query = 'replacement-pr') {
  await page.goto('/game-v3.html?beta=' + query, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest && window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('replacement runtime corrects the authored RGSDev vehicle presentation without changing walking input', async ({ page }) => {
  await openGame(page, 'replacement-steering');
  await page.waitForFunction(() => typeof window.__coastlineReplacementSteeringProbe === 'function', null, { timeout: 30000 });
  const forward = await page.evaluate(() => ({ left: window.__coastlineReplacementSteeringProbe('a', false, 30), right: window.__coastlineReplacementSteeringProbe('d', false, 30) }));
  expect(forward.left.displacement.x).toBeLessThan(0);
  expect(forward.right.displacement.x).toBeGreaterThan(0);
  expect(forward.left.visualNose.x).toBeLessThan(0);
  expect(forward.right.visualNose.x).toBeGreaterThan(0);
  const reverse = await page.evaluate(() => ({ left: window.__coastlineReplacementSteeringProbe('a', true, 30), right: window.__coastlineReplacementSteeringProbe('d', true, 30) }));
  expect(reverse.left.displacement.x).toBeGreaterThan(0);
  expect(reverse.right.displacement.x).toBeLessThan(0);
  const walking = await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(0, 0, 0);
    window.__coastlineTest.keyDown('a');
    window.__coastlineTest.advanceTestFrame(1 / 60, 12);
    window.__coastlineTest.keyUp('a');
    return window.__coastlineTransitionTest.playerState();
  });
  expect(walking.mode).toBe('walk');
  expect(walking.heading).toBeLessThan(0);
});

test('replacement runtime preserves the D-pad as the mobile steering path', async ({ page }) => {
  await openGame(page, 'replacement-mobile-steering');
  const result = await page.evaluate(() => {
    const left = document.querySelector('[data-k="a"]');
    const right = document.querySelector('[data-k="d"]');
    if (!left || !right) return { missing: true };
    left.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 77, pointerType: 'touch' }));
    const leftState = window.__coastlineTest.steeringKeyState();
    left.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 77, pointerType: 'touch' }));
    right.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 78, pointerType: 'touch' }));
    const rightState = window.__coastlineTest.steeringKeyState();
    right.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 78, pointerType: 'touch' }));
    return { leftState, rightState, joystick: Boolean(document.querySelector('[data-steer-joystick], .driveStick, .touchSteer')) };
  });
  expect(result.missing).not.toBe(true);
  expect(result.leftState.a).toBe(true); expect(result.leftState.d).toBe(false);
  expect(result.rightState.d).toBe(true); expect(result.rightState.a).toBe(false);
  expect(result.joystick).toBe(false);
});

test('replacement runtime uses authored hair mesh correction rather than an unrelated scalp sphere', async ({ page }) => {
  await openGame(page, 'replacement-hair');
  await page.waitForFunction(() => Boolean(window.__coastlineAvatar?.userData?.cozyActor), null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const root = window.__coastlineAvatar.userData.cozyActor.root;
    const hair = [];
    root.traverse(node => {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (node.isMesh && materials.some(material => String(material?.name || '').toLowerCase() === 'hair')) hair.push({ corrected: Boolean(node.userData.coastlineAuthoredHairCorrected), scale: node.scale.toArray() });
    });
    return { hair, cap: Boolean(root.getObjectByName('coastline-wardrobe-hair-cap')) };
  });
  expect(result.hair.length).toBeGreaterThan(0);
  expect(result.hair.some(item => item.corrected)).toBe(true);
  expect(result.cap).toBe(false);
});

test('cave entrance is walkable while adjacent and rear mountain space is blocked', async ({ page }) => {
  await openGame(page, 'replacement-cave');
  await page.evaluate(async () => { await window.__coastlineTransitionTest.transition('city-to-island'); await window.__coastlineTransitionTest.transition('island-to-waterfront'); });
  await page.waitForFunction(() => Boolean(window.__coastlineRegionRoot), null, { timeout: 30000 });
  const result = await page.evaluate(() => ({
    entrance: window.__coastlineTest.buildingBlocked(520, 542.5, .45),
    left: window.__coastlineTest.buildingBlocked(514, 542.5, .45),
    right: window.__coastlineTest.buildingBlocked(526, 542.5, .45),
    rear: window.__coastlineTest.buildingBlocked(520, 558, .45),
    caveFacing: window.__coastlineRegionRoot.userData.coastlineCaveGLB?.userData?.coastlineDoorwayFacing || null,
  }));
  expect(result.entrance).toBe(false);
  expect(result.left).toBe(true);
  expect(result.right).toBe(true);
  expect(result.rear).toBe(true);
  expect(result.caveFacing).toBe('-Z');
});

test('CTM cave transition fires automatically at the entrance and round-trips through the same manager', async ({ page }) => {
  await openGame(page, 'replacement-ctm');
  await page.evaluate(async () => { await window.__coastlineTransitionTest.transition('city-to-island'); await window.__coastlineTransitionTest.transition('island-to-waterfront'); window.__coastlineTest.setWalkPosition(520, 542.5, Math.PI); });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('electric-lemonade-dungeon');
  const inside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(inside.mode).toBe('walk');
  expect(Number.isFinite(inside.position.x)).toBe(true);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('electric-dungeon-to-waterfront'));
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('waterfront');
  const outside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(outside.mode).toBe('walk');
  expect(Number.isFinite(outside.position.x)).toBe(true);
  expect(Number.isFinite(outside.position.z)).toBe(true);
});

test('Waterfront lemonade pedestrian is an animated living-world actor associated with the stand', async ({ page }) => {
  await openGame(page, 'replacement-lemonade');
  await page.evaluate(async () => { await window.__coastlineTransitionTest.transition('city-to-island'); await window.__coastlineTransitionTest.transition('island-to-waterfront'); });
  await page.waitForFunction(() => Boolean(window.__coastlineWaterfrontVendorActor?.root), null, { timeout: 30000 });
  const state = await page.evaluate(() => {
    const actor = window.__coastlineWaterfrontVendorActor?.root;
    const stand = window.__coastlineRegionRoot?.getObjectByName('coastline-electric-lemonade-stand');
    return {
      present: Boolean(actor), parentIsWorld: actor?.parent === window.__coastlineRegionRoot,
      living: actor?.userData?.coastlineLivingWorldVendor === true,
      standPresent: Boolean(stand), visible: actor?.visible !== false,
      mixer: Boolean(window.__coastlineWaterfrontVendorActor?.mixer),
      meshes: (() => { let count=0; actor?.traverse(n => { if(n.isMesh) count++; }); return count; })(),
    };
  });
  expect(state.present).toBe(true); expect(state.parentIsWorld).toBe(true); expect(state.living).toBe(true);
  expect(state.standPresent).toBe(true); expect(state.visible).toBe(true); expect(state.mixer).toBe(true); expect(state.meshes).toBeGreaterThan(0);
});
