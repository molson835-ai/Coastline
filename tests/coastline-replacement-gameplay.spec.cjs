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

test('replacement: approved three-cave GLB stays mounted while only the legacy single cave is removed', async ({ page }) => {
  await openGame(page, 'replacement-three-caves');
  await page.evaluate(async () => { await window.__coastlineTransitionTest.transition('city-to-island'); await window.__coastlineTransitionTest.transition('island-to-waterfront'); });
  await page.waitForFunction(() => Boolean(window.__coastlineRegionRoot?.userData?.coastlineReplacementCaveLoaded), null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const root = window.__coastlineRegionRoot;
    const replacement = root?.getObjectByName('coastline-waterfront-cave-replacement-glb');
    const anchor = root?.getObjectByName('coastline-electric-lemonade-cave-mouth');
    const entrances = window.__coastlineThreeCaveContract?.entrances || [];
    return {
      replacementVisible: Boolean(replacement?.visible && replacement.parent),
      anchorPreserved: Boolean(anchor?.parent),
      legacySingleCave: Boolean(root?.getObjectByName('coastline-waterfront-cave-entrance-glb')),
      legacyProceduralMountain: Boolean(root?.getObjectByName('coastline-waterfront-cave-mountain')),
      legacyApproachPath: Boolean(root?.getObjectByName('coastline-waterfront-cave-approach-path')),
      entranceIds: entrances.map(cave => cave.id),
      boundaryIds: (root?.userData?.coastlineThreeCaveBoundaryContract || []).map(cave => cave.id),
    };
  });
  expect(result.replacementVisible).toBe(true);
  expect(result.anchorPreserved).toBe(true);
  expect(result.legacySingleCave).toBe(false);
  expect(result.legacyProceduralMountain).toBe(false);
  expect(result.legacyApproachPath).toBe(false);
  expect(result.entranceIds).toEqual(['left', 'center', 'right']);
  expect(result.boundaryIds).toEqual(['left', 'center', 'right']);
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('waterfront-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  await page.waitForTimeout(1200);
  const beforeReload = await page.evaluate(() => {
    const root = window.__coastlineRegionRoot;
    return {
      replacement: Boolean(root?.getObjectByName('coastline-waterfront-cave-replacement-glb')?.visible),
      oldMountain: Boolean(root?.getObjectByName('coastline-waterfront-cave-mountain')),
      oldCave: Boolean(root?.getObjectByName('coastline-waterfront-cave-entrance-glb')),
      boundary: window.__coastlineThreeCaveBoundaryState?.(),
      collisionCheck: (() => {
        const trace = window.__coastlineThreeCaveBoundaryState?.().stoneTraceColliders || [];
        const entrances = window.__coastlineThreeCaveContract?.entrances || [];
        const blocked = (x, z, radius = 0.45) => trace.some(c =>
          Math.abs(x - c.x) <= c.w / 2 + radius && Math.abs(z - c.z) <= c.d / 2 + radius
        );
        return {
          openingsClear: entrances.every(cave => !blocked(cave.x, cave.z)),
          stoneSegmentsBlock: trace.length > 0 && trace.every(c => blocked(c.x, c.z, 0)),
          traceCount: trace.length,
        };
      })(),
    };
  });
  expect(beforeReload.replacement).toBe(true);
  expect(beforeReload.oldMountain).toBe(false);
  expect(beforeReload.oldCave).toBe(false);
  expect(beforeReload.boundary?.legacyColliders).toEqual([]);
  expect(beforeReload.boundary?.stoneTraceColliders.length).toBeGreaterThanOrEqual(20);
  expect(beforeReload.boundary?.activeCollisionArrayMatchesRoot).toBe(true);
  expect(beforeReload.collisionCheck.openingsClear).toBe(true);
  expect(beforeReload.collisionCheck.stoneSegmentsBlock).toBe(true);
});

test('replacement: reaching the real cave threshold invokes the existing CTM and returns coherently', async ({ page }) => {
  await openGame(page, 'replacement-ctm');
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  await page.waitForFunction(() => window.__coastlineElectricLemonade?.__threeCaveWrapped === true, null, { timeout: 10000 });
  const entryUseAvailable = await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(520, 542.5, Math.PI);
    return window.__coastlineElectricLemonade.canUse();
  });
  expect(entryUseAvailable).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('electric-lemonade-dungeon');
  const inside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(inside.mode).toBe('walk');
  expect(Number.isFinite(inside.position?.x)).toBe(true);
  await page.waitForFunction(() => Boolean(window.__coastlineActiveWorldRoot?.getObjectByName('coastline-three-cave-interiors')), null, { timeout: 10000 });
  const cavern = await page.evaluate(() => {
    const root = window.__coastlineActiveWorldRoot;
    const colliders = root?.userData?.coastlineColliders || [];
    return {
      ceiling: Boolean(root?.getObjectByName('electric-dungeon-natural-ceiling')),
      stalactites: Boolean(root?.getObjectByName('electric-dungeon-natural-stalactites-stalagmites')),
      mazeWallIsInstanced: Boolean(root?.getObjectByName('electric-dungeon-maze-west-first')?.isInstancedMesh),
      leftWingSolid: colliders.some(c => c.name === 'electric-dungeon-left-cavern-divider'),
      rightWingSolid: colliders.some(c => c.name === 'electric-dungeon-right-cavern-divider'),
    };
  });
  expect(cavern.ceiling).toBe(true);
  expect(cavern.stalactites).toBe(true);
  expect(cavern.mazeWallIsInstanced).toBe(true);
  expect(cavern.leftWingSolid).toBe(true);
  expect(cavern.rightWingSolid).toBe(true);
  const exitUseAvailable = await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(520, 542.5, 0);
    return window.__coastlineElectricLemonade.canUse();
  });
  expect(exitUseAvailable).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('waterfront');
  const outside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(outside.mode).toBe('walk');
  expect(Number.isFinite(outside.position?.x)).toBe(true);
  expect(await page.evaluate(() => window.__coastlineElectricLemonade.canUse())).toBe(false);
  expect(Number.isFinite(outside.position?.z)).toBe(true);
});

test('replacement: left and right cave CTMs enter their caverns and return to the matching cave', async ({ page }) => {
  await openGame(page, 'replacement-three-cave-ctms');
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  await page.waitForFunction(() => window.__coastlineElectricLemonade?.__threeCaveWrapped === true, null, { timeout: 10000 });

  for (const cave of [{ id: 'left', x: 510 }, { id: 'right', x: 530 }]) {
    const caveUseAvailable = await page.evaluate(({ x }) => {
      window.__coastlineTest.setWalkPosition(x, 542.5, Math.PI);
      return window.__coastlineElectricLemonade.canUse();
    }, cave);
    expect(caveUseAvailable).toBe(false);
    await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('electric-lemonade-dungeon');
    await page.waitForFunction(() => Boolean(window.__coastlineActiveWorldRoot?.getObjectByName('coastline-three-cave-interiors')), null, { timeout: 10000 });
    const inside = await page.evaluate(() => {
      const state = window.__coastlineTransitionTest.playerState();
      const root = window.__coastlineActiveWorldRoot;
      const interior = root?.getObjectByName('coastline-three-cave-interior-' + (state.position.x < 520 ? 'left' : 'right'));
      return {
        state,
        rockInstances: interior?.getObjectByName('coastline-three-cave-interior-rock-masses')?.count || 0,
        coneInstances: interior?.getObjectByName('coastline-three-cave-interior-stalactites-stalagmites')?.count || 0,
        floorY: interior?.getObjectByName('coastline-three-cave-interior-floor')?.position.y,
        expectedFloorY: window.__coastlineElectricDungeonFloorY,
        wallColliders: (root?.userData?.coastlineColliders || []).filter(c => String(c.name || '').includes('electric-dungeon-') && String(c.name || '').includes('rock-wall')).length,
      };
    });
    expect(inside.state.mode).toBe('walk');
    expect(inside.rockInstances).toBeGreaterThan(30);
    expect(inside.coneInstances).toBe(16);
    expect(inside.floorY).toBeCloseTo(inside.expectedFloorY, 3);
    expect(inside.wallColliders).toBeGreaterThanOrEqual(4);
    expect(inside.state.position.x).toBeCloseTo(cave.x, 1);
    expect(inside.state.position.z).toBeCloseTo(552, 1);

    const exitUseAvailable = await page.evaluate(({ x }) => {
      window.__coastlineTest.setWalkPosition(x, 577, 0);
      return window.__coastlineElectricLemonade.canUse();
    }, cave);
    expect(exitUseAvailable).toBe(false);
    await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 8000 }).toBe('waterfront');
    const outside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
    expect(outside.mode).toBe('walk');
    expect(outside.position.x).toBeCloseTo(cave.x, 1);
    expect(outside.position.z).toBeCloseTo(537.5, 1);
  }
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
