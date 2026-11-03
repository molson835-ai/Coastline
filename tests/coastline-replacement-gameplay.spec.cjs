const { test, expect } = require('@playwright/test');

async function openGame(page, query) {
  await page.goto('/game-v3.html?beta=' + query, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest && window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('replacement: mobile D-pad stays authoritative and walking remains separate', async ({ page }) => {
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
    window.__coastlineTest.setWalkPosition(0, 0, 0);
    window.__coastlineTest.keyDown('a');
    window.__coastlineTest.advanceTestFrame(1 / 60, 12);
    window.__coastlineTest.keyUp('a');
    return { leftState, rightState, walking: window.__coastlineTest.state(), joystick: Boolean(document.querySelector('[data-steer-joystick], .driveStick, .touchSteer')) };
  });
  expect(result.missing).not.toBe(true);
  expect(result.leftState.a).toBe(true); expect(result.leftState.d).toBe(false);
  expect(result.rightState.d).toBe(true); expect(result.rightState.a).toBe(false);
  expect(result.walking.mode).toBe('walk');
  expect(result.joystick).toBe(false);
});

test('replacement: authored Cozy hair receives the coverage correction without a scalp cap', async ({ page }) => {
  await openGame(page, 'replacement-hair');
  await page.waitForFunction(() => Boolean(window.__coastlineAvatar?.userData?.cozyActor), null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const root = window.__coastlineAvatar.userData.cozyActor.root;
    const hair = [];
    root.traverse(node => {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (node.isMesh && materials.some(material => String(material?.name || '').toLowerCase() === 'hair')) hair.push({ corrected: Boolean(node.userData.coastlineAuthoredHairCorrected), correction: node.userData.coastlineHairCorrection || null, scale: node.scale.toArray() });
    });
    return { hair, unrelatedCap: Boolean(root.getObjectByName('coastline-wardrobe-hair-cap')) };
  });
  expect(result.hair.length).toBeGreaterThan(0);
  expect(result.hair.some(item => item.corrected && item.correction?.xz === 1.98 && item.correction?.y === 1.35)).toBe(true);
  expect(result.unrelatedCap).toBe(false);
});

test('replacement: Electric Lemonade pedestrian is an animated active-world actor tied to the stand', async ({ page }) => {
  await openGame(page, 'replacement-lemonade');
  await page.evaluate(async () => { await window.__coastlineTransitionTest.transition('city-to-island'); await window.__coastlineTransitionTest.transition('island-to-waterfront'); });
  await page.waitForFunction(() => Boolean(window.__coastlineWaterfrontVendorActor?.root), null, { timeout: 30000 });
  const state = await page.evaluate(() => {
    const actor = window.__coastlineWaterfrontVendorActor?.root;
    const stand = window.__coastlineRegionRoot?.getObjectByName('coastline-electric-lemonade-stand');
    let meshes = 0; actor?.traverse(node => { if (node.isMesh) meshes++; });
    return { present: Boolean(actor), parentIsWorld: actor?.parent === window.__coastlineRegionRoot, stand: Boolean(stand), visible: actor?.visible !== false, mixer: Boolean(window.__coastlineWaterfrontVendorActor?.mixer), meshes };
  });
  expect(state.present).toBe(true);
  expect(state.parentIsWorld).toBe(true);
  expect(state.stand).toBe(true);
  expect(state.visible).toBe(true);
  expect(state.mixer).toBe(true);
  expect(state.meshes).toBeGreaterThan(0);
});
