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
  const thresholdClear = await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    const clear = !window.__coastlineTest.buildingBlocked(483, 488, 1.8);
    window.__garageTestVehicle = window.__coastlinePlayer.vehicle;
    window.__coastlineTest.setWalkPosition(483, 487, 0);
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setWalkPosition(483, 490, 0);
    window.__coastlineTransitionTest.updatePrompt();
    return clear;
  });
  expect(thresholdClear, 'open garage threshold must remain physically traversable').toBe(true);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  await page.evaluate(() => {
    window.__coastlineTest.enterVehicle(window.__garageTestVehicle);
    window.__coastlineTest.setVehiclePosition(483, 487, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  const before = await page.evaluate(() => window.__coastlineTransitionTest.playerState());
  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(483, 490, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('homey-garage');
  const inside = await page.evaluate(() => {
    window.__coastlineTransitionTest.updatePrompt();
    return {
      state: window.__coastlineTransitionTest.playerState(),
      garage: window.__coastlineTransitionTest.garageState(),
    };
  });
  expect(inside.state.mode).toBe('vehicle');
  expect(inside.state.vehicleIndex).toBe(before.vehicleIndex);
  expect(inside.state.position.x).toBeCloseTo(483, 1);
  expect(inside.state.position.z).toBeCloseTo(500, 1);
  expect(inside.state.position.y).toBeCloseTo(inside.garage.floorY, 1);
  expect(inside.garage.root.meshes).toBeGreaterThan(20);
  expect(inside.garage.decorCount).toBeGreaterThanOrEqual(20);
  expect(inside.garage.cameraMode).toBe(true);
  expect(inside.garage.ceilingVisible).toBe(false);
  expect(inside.garage.sideWallOpacity).toBeCloseTo(0.16, 2);
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
  const donorMaterials = await page.evaluate(model => window.__coastlineTransitionTest.vehicleMaterialSnapshot(model, window.__coastlineTransitionTest.garageState().vehicleIndex), selectedModel);
  expect(donorMaterials).not.toBeNull();
  await page.getByRole('button', { name: 'Racing Red' }).click();
  await page.locator('#garageConfirm').click();
  const swapped = await page.evaluate(() => {
    const vehicle = window.__coastlineTransitionTest.garageVehicleRef();
    const bodyPattern = /(body|paint|panel|exterior|hood|bonnet|door|fender|shell|chassis)/i;
    const protectedPattern = /(glass|window|windshield|windscreen|wheel|tire|tyre|rim|light|lamp|chrome|trim|interior|seat|dash|mirror|grill|grille|bumper|plastic|hardware)/i;
    const bodyPaintColors = (vehicle.materialRoles?.body || []).flatMap(mesh => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return materials.filter(material => material?.color && !protectedPattern.test(String(material.name || '')) &&
        (bodyPattern.test(String(material.name || '')) || (materials.length === 1 && bodyPattern.test(String(mesh.name || '')))))
        .map(material => material.color.getHexString());
    });
    const roles = window.__coastlineTransitionTest.garageVehicleMaterialSnapshot();
    return {
      index: window.__coastlineTransitionTest.garageState().vehicleIndex,
      model: vehicle.rgsdevModelName,
      paint: bodyPaintColors.find(color => color === 'b92d35') || null,
      paintedMaterialCount: vehicle.coastlinePaintDiagnostics?.paintedMaterialCount || 0,
      glass: roles.glass,
      wheels: roles.wheels,
      lights: roles.lights,
      activeCount: window.__coastlineTest.vehicleRoster().filter(v => v.kind === 'car' && Math.abs(v.x - 483) < 2 && Math.abs(v.z - 500) < 2).length,
    };
  });
  expect(swapped.index).toBe(originalIndex);
  expect(swapped.model).toBe(selectedModel);
  expect(swapped.paint).toBe('b92d35');
  expect(swapped.paintedMaterialCount).toBeGreaterThan(0);
  expect(swapped.glass).toEqual(donorMaterials.glass);
  expect(swapped.wheels).toEqual(donorMaterials.wheels);
  expect(swapped.lights).toEqual(donorMaterials.lights);
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
  expect(outside.position.y).toBeCloseTo(await page.evaluate(() => window.__coastlineTest.groundY(483, 484)), 1);
  expect(outside.vehicleIndex).toBe(originalIndex);
});


test('Homey garage includes an overhead roll-up door and an on-foot house doorway', async ({ page }) => {
  await openGame(page);
  await page.waitForFunction(() => window.__coastlineVehicleAssetSwapStatus?.ok === true, null, { timeout: 45000 });
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-homey-garage');
  });
  const garage = await page.evaluate(() => window.__coastlineTransitionTest.garageState());
  expect(garage.garageDoorSlatCount).toBeGreaterThanOrEqual(12);
  expect(garage.houseDoorPresent).toBe(true);
  expect(garage.root.meshes).toBeGreaterThan(50);
});

test('walking through the house doorway instantly streams the detailed home interior and back', async ({ page }) => {
  await openGame(page);
  await page.waitForFunction(() => window.__coastlineVehicleAssetSwapStatus?.ok === true, null, { timeout: 45000 });
  const entry = await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-homey-garage');
    const index = window.__coastlineTransitionTest.garageState().vehicleIndex;
    // A vehicle crossing the house threshold must not transition.
    window.__coastlineTest.setVehiclePosition(483, 515, 0);
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setVehiclePosition(483, 516, 0);
    window.__coastlineTransitionTest.updatePrompt();
    const vehicleWorld = window.__coastlineTransitionTest.status().activeWorldId;
    // The same crossing on foot must transition immediately.
    window.__coastlineTest.setWalkPosition(483, 515, 0);
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setWalkPosition(483, 516, 0);
    window.__coastlineTransitionTest.updatePrompt();
    return { index, vehicleWorld };
  });
  const parkedVehicleIndex = entry.index;
  expect(entry.vehicleWorld).toBe('homey-garage');
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('home-interior');
  const inside = await page.evaluate(() => ({
    house: window.__coastlineTransitionTest.houseState(),
    player: window.__coastlineTransitionTest.playerState(),
  }));
  expect(inside.house.root.meshes).toBeGreaterThan(35);
  expect(inside.house.parkedVehicleHidden).toBe(true);
  expect(inside.player.mode).toBe('walk');
  expect(inside.player.position.z).toBeCloseTo(508.5, 1);
  await page.evaluate(() => {
    const before = window.__coastlineTransitionTest.playerState().position;
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
    window.__coastlineHouseMovementAfterEntry = {
      before,
      after: window.__coastlineTransitionTest.playerState().position,
    };
  });
  const movement = await page.evaluate(() => window.__coastlineHouseMovementAfterEntry);
  expect(Math.hypot(movement.after.x - movement.before.x, movement.after.z - movement.before.z), 'player must be able to walk immediately after entering the house').toBeGreaterThan(0.1);
  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(483, 512.5, 0);
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setWalkPosition(483, 513.5, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('homey-garage');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.playerState().mode)).toBe('walk');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.garageState().vehicleIndex)).toBe(parkedVehicleIndex);
});

test('residential, waterfront, and port islands have developed detail and landscape boundaries', async ({ page }) => {
  await openGame(page);
  const details = await page.evaluate(async () => {
    const results = {};
    await window.__coastlineTransitionTest.transition('city-to-island');
    results.residential = window.__coastlineTransitionTest.islandDetailState().residential;
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
    results.waterfront = window.__coastlineTransitionTest.islandDetailState().waterfront;
    await window.__coastlineTransitionTest.transition('waterfront-to-port');
    results.port = window.__coastlineTransitionTest.islandDetailState().port;
    return results;
  });
  for (const island of ['residential', 'waterfront', 'port']) {
    expect(details[island].meshes).toBeGreaterThan(25);
    expect(details[island].boundary).toBe(true);
    expect(details[island].lamps).toBe(true);
    expect(details[island].benches).toBeGreaterThanOrEqual(4);
  }
  const densities = await page.evaluate(() => window.__coastlineTransitionTest.worldDefinitions().filter(world => ['island','waterfront','port'].includes(world.id)).map(world => world.content.density));
  expect(densities.every(density => density === 'developed')).toBe(true);
});
