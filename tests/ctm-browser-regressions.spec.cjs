const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.goto('/game-v3.html?beta=ctm-browser-regression', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
}

test('City-first startup keeps the active vehicle visible and movable after CTM activation', async ({ page }) => {
  await openGame(page);
  const city = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(false);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.activeVehicleVisible())).toBe(true);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.collisionScope())).toBe(true);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(500, 400, Math.PI);
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
  });

  const moved = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(Math.hypot(moved.position.x - 500, moved.position.z - 400)).toBeGreaterThan(0.1);
  expect(moved.vehicleIndex).toBe(city.vehicleIndex);
});

test('City to Homey preserves a complete replacement vehicle hierarchy and material identity', async ({ page }) => {
  await openGame(page);
  const before = await page.evaluate(() => ({
    vehicleIndex: window.__coastlineTransitionTest.playerState().vehicleIndex,
    modelName: window.__coastlinePlayer?.vehicle?.rgsdevModelName,
  }));
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  await page.waitForFunction(() => window.__coastlinePlayer?.vehicle?.g?.visible === true && window.__coastlineVehicleAssetSwapStatus?.ok === true);

  const after = await page.evaluate(() => {
    const vehicle = window.__coastlinePlayer.vehicle;
    const meshes = [];
    vehicle.g.traverse(node => { if (node.isMesh && node.visible !== false) meshes.push(node); });
    const groups = vehicle.materialRoles || {};
    return {
      vehicleIndex: window.__coastlineTransitionTest.playerState().vehicleIndex,
      modelName: vehicle.rgsdevModelName,
      meshCount: meshes.length,
      materialGroups: {
        body: groups.body?.length || 0,
        glass: groups.glass?.length || 0,
        wheels: groups.wheels?.length || 0,
      },
      neutralFallback: vehicle.g.userData?.coastlineNeutralFallback === true,
    };
  });

  expect(after.vehicleIndex).toBe(before.vehicleIndex);
  expect(after.modelName).toBe(before.modelName);
  expect(after.modelName).not.toBe('neutral-fallback');
  expect(after.meshCount).toBeGreaterThan(3);
  expect(after.materialGroups.body).toBeGreaterThan(0);
  expect(after.materialGroups.glass).toBeGreaterThan(0);
  expect(after.materialGroups.wheels).toBeGreaterThan(0);
  expect(after.neutralFallback).toBe(false);
});

test('the physical bridge end zones automatically transition island to City and back', async ({ page }) => {
  await openGame(page);
  const zones = await page.evaluate(() => window.__coastlineTransitionTest.bridgeZones());

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.islandApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('city');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('city');

  await page.evaluate(({ x, z, rotationY }) => {
    window.__coastlineTest.setVehiclePosition(x, z, rotationY);
    window.__coastlineTransitionTest.updatePrompt();
  }, zones.cityApproach);
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 3000 }).toBe('island');
});


test('Homey garage opens only when a vehicle crosses the open threshold and preserves the vehicle', async ({ page }) => {
  await openGame(page);
  await page.waitForFunction(() => window.__coastlineVehicleAssetSwapStatus?.ok === true, null, { timeout: 45000 });
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    window.__coastlineTest.setVehiclePosition(483, 487, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  const before = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(483, 490, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('homey-garage');
  const inside = await page.evaluate(() => ({
    state: window.__coastlineTransitionTest.playerState(),
    garage: window.__coastlineTransitionTest.garageState(),
  }));
  expect(inside.state.mode).toBe('vehicle');
  expect(inside.state.vehicleIndex).toBe(before.vehicleIndex);
  expect(inside.state.position.x).toBeCloseTo(483, 1);
  expect(inside.state.position.z).toBeCloseTo(500, 1);
  expect(inside.garage.root.meshes).toBeGreaterThan(20);
  expect(inside.garage.threshold.z).toBe(488);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.worldDefinitions().find(world => world.id === 'homey-garage').content.density)).toBe('developed');

  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(483, 500, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect(page.locator('#coastlineGarageUseBoard')).toBeVisible();
  await page.locator('#coastlineGarageUseBoard').click();
  await expect(page.locator('#coastlineGarageChooser')).toBeVisible();
  await page.locator('#garageCancel').click();
  await expect(page.locator('#coastlineGarageChooser')).toHaveCount(0);

  await page.locator('#coastlineGarageUseBoard').click();
  await expect(page.locator('#coastlineGarageChooser')).toBeVisible();
  const originalIndex = await page.evaluate(() => window.__coastlineTransitionTest.garageState().vehicleIndex);
  const originalModel = await page.evaluate(() => window.__coastlineTransitionTest.garageVehicleRef().rgsdevModelName);
  const modelOptions = await page.locator('#garageModel option').count();
  expect(modelOptions).toBeGreaterThan(1);
  await page.locator('#garageModel').selectOption({ index: 1 });
  const selectedModel = await page.locator('#garageModel').inputValue();
  await page.getByRole('button', { name: 'Racing Red' }).click();
  await page.locator('#garageConfirm').click();
  const swapped = await page.evaluate(() => {
    const vehicle = window.__coastlineTransitionTest.garageVehicleRef();
    const body = vehicle.materialRoles?.body?.[0];
    const material = Array.isArray(body?.material) ? body.material[0] : body?.material;
    return {
      index: window.__coastlineTransitionTest.garageState().vehicleIndex,
      model: vehicle.rgsdevModelName,
      paint: material?.color?.getHexString?.() || null,
      activeCount: window.__coastlineTest.vehicleRoster().filter(v => v.kind === 'car' && Math.abs(v.x - 483) < 2 && Math.abs(v.z - 500) < 2).length,
    };
  });
  expect(swapped.index).toBe(originalIndex);
  expect(swapped.model).toBe(selectedModel);
  expect(swapped.paint).toBe('b92d35');
  expect(swapped.activeCount).toBe(1);
  expect(swapped.model).not.toBe(originalModel);

  await page.evaluate(() => {
    window.__coastlineTest.enterVehicle(window.__coastlineTransitionTest.garageVehicleRef());
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setVehiclePosition(483, 487, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('island');
  const outside = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  expect(outside.mode).toBe('vehicle');
  expect(outside.position.z).toBeCloseTo(484, 1);
  expect(outside.vehicleIndex).toBe(originalIndex);
});
