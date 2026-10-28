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


test('Homey garage entry action is vehicle-only, proximity-gated, and preserves the vehicle', async ({ page }) => {
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
    return { clear, entryVisibleOnFoot: window.__coastlineTransitionTest.garageEntryVisible() };
  });
  expect(thresholdClear.clear, 'open garage threshold must remain physically traversable').toBe(true);
  expect(thresholdClear.entryVisibleOnFoot, 'on-foot players must not see the garage-entry action').toBe(false);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId)).toBe('island');
  await page.evaluate(() => {
    window.__coastlineTest.enterVehicle(window.__garageTestVehicle);
    window.__coastlineTest.setVehiclePosition(483, 487, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  const before = await page.evaluate(() => ({ state: window.__coastlineTransitionTest.playerState(), entryVisible: window.__coastlineTransitionTest.garageEntryVisible() }));
  expect(before.entryVisible, 'a stopped vehicle facing the garage within range should expose the entry action').toBe(true);
  await page.locator('#coastlineGarageEnter').click();
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('homey-garage');
  const inside = await page.evaluate(() => {
    window.__coastlineTransitionTest.updatePrompt();
    return {
      state: window.__coastlineTransitionTest.playerState(),
      garage: window.__coastlineTransitionTest.garageState(),
    };
  });
  expect(inside.state.mode).toBe('vehicle');
  expect(inside.state.vehicleIndex).toBe(before.state.vehicleIndex);
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


test('regular procedural Homey house interior remains active and navigable', async ({ page }) => {
  await openGame(page);
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-homey-garage');
    window.__coastlineTest.setWalkPosition(483, 515, 0);
    window.__coastlineTransitionTest.updatePrompt();
    window.__coastlineTest.setWalkPosition(483, 516, 0);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('home-interior');
  const result = await page.evaluate(() => {
    const house = window.__coastlineTransitionTest.houseState();
    const root = window.__coastlineTest.sceneRoot?.();
    return { house, hasProceduralFloor: Boolean(root?.getObjectByName?.('house-interior-floor')) };
  });
  expect(result.house.root.meshes).toBeGreaterThan(20);
  const movement = await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(483, 508.5, 0);
    const before = window.__coastlineTransitionTest.playerState().position;
    window.__coastlineTest.keyDown('w');
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
    window.__coastlineTest.keyUp('w');
    const after = window.__coastlineTransitionTest.playerState().position;
    return Math.hypot(after.x - before.x, after.z - before.z);
  });
  expect(movement, 'player must move inside the regular procedural house interior').toBeGreaterThan(0.1);
});



test('City boundary scenery, bridge grounding, and functional small Homey lamps stay coherent', async ({ page }) => {
  await openGame(page);
  const city = await page.evaluate(() => {
    const api = window.__coastlineTransitionTest;
    return {
      boundary: api.cityBoundaryState(),
      start: api.bridgeSurfaceY(0, -750),
      middle: api.bridgeSurfaceY(0, -800),
      end: api.bridgeSurfaceY(0, -850),
      edgeBlocked: window.__coastlineTest.buildingBlocked(709.6, 300, .5),
      bridgeCorridorClear: !window.__coastlineTest.buildingBlocked(0, -709, .5),
    };
  });
  expect(city.boundary.present).toBe(true);
  expect(city.boundary.rocks).toBe(true);
  expect(city.boundary.scrub).toBe(true);
  expect(city.edgeBlocked).toBe(true);
  expect(city.bridgeCorridorClear).toBe(true);
  expect(city.start).not.toBeNull();
  expect(city.middle).toBeLessThan(city.start);
  expect(city.end).toBeCloseTo(city.start, 4);

  await page.evaluate(() => {
    window.__coastlineTest.setVehiclePosition(0, -800, 0);
    window.__coastlineTest.advanceTestFrame(1 / 60, 20);
  });
  const vehicleY = await page.evaluate(() => window.__coastlineTransitionTest.playerState().position.y);
  expect(vehicleY).toBeCloseTo(city.middle, 2);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  const lampState = await page.evaluate(() => {
    const lamps = window.__coastlineHomeyDrivewayLights || [];
    if (lamps[0]) lamps[0].fall();
    return {
      count: lamps.length,
      names: lamps.map(lamp => lamp.group?.name || ''),
      fallenBeforeTransition: lamps.filter(lamp => lamp.fallen).length,
    };
  });
  expect(lampState.count).toBe(10);
  expect(lampState.names.every(name => name.startsWith('coastline-villa-path-light-'))).toBe(true);
  expect(lampState.fallenBeforeTransition).toBe(1);

  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-homey-garage'));
  expect(await page.evaluate(() => window.__coastlineTransitionTest.drivewayLampState().fallen)).toBe(0);
});

test('Waterfront uses the approved GLB vendor, natural cave props, and automatic bridge transitions', async ({ page }) => {
  await openGame(page);
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
  await page.waitForFunction(() => Boolean(window.__coastlineWaterfrontVendorActor?.root), null, { timeout: 20000 });
  const state = await page.evaluate(() => {
    const root = window.__coastlineRegionRoot;
    return {
      activeWorld: window.__coastlineTransitionTest.status().activeWorldId,
      glbVendor: Boolean(root?.getObjectByName('coastline-waterfront-lemonade-vendor-glb')),
      caveMountain: Boolean(root?.getObjectByName('coastline-waterfront-cave-mountain')),
      approachPath: Boolean(root?.getObjectByName('coastline-waterfront-cave-approach-path')),
      lemonadeCounter: Boolean(root?.getObjectByName('coastline-waterfront-lemonade-counter')),
      priceSign: Boolean(root?.getObjectByName('coastline-waterfront-lemonade-price-sign')),
      groundY: root?.userData?.coastlineGroundY,
      bridgePromptVisible: window.__coastlineTransitionTest.bridgePromptVisible(),
    };
  });
  expect(state.activeWorld).toBe('waterfront');
  expect(state.glbVendor).toBe(true);
  expect(state.caveMountain).toBe(true);
  expect(state.approachPath).toBe(true);
  expect(state.lemonadeCounter).toBe(true);
  expect(state.priceSign).toBe(true);
  expect(Number.isFinite(state.groundY)).toBe(true);
  expect(state.bridgePromptVisible).toBe(false);
});


test('walking across the physical bridge automatically hands off through CTM without a prompt', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  await page.evaluate(() => {
    window.__coastlineTest.setWalkPosition(500, 300, Math.PI);
    window.__coastlineTransitionTest.updatePrompt();
  });
  await expect.poll(() => page.evaluate(() => window.__coastlineTransitionTest.status().activeWorldId), { timeout: 5000 }).toBe('city');
  expect(await page.evaluate(() => window.__coastlineTransitionTest.bridgePromptVisible())).toBe(false);
});


test('outdoor island cars can be entered/exited and steering directions remain correct', async ({ page }) => {
  await openGame(page);
  await page.waitForFunction(() => window.__coastlineVehicleAssetSwapStatus?.ok === true, null, { timeout: 30000 });
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  await page.waitForFunction(() => window.__coastlineTransitionTest.activeWorldFleet().length >= 2, null, { timeout: 30000 });
  const fleet = await page.evaluate(() => window.__coastlineTransitionTest.activeWorldFleet());
  expect(fleet.length).toBeGreaterThanOrEqual(2);
  expect(fleet.every(car => car.visible && car.drivable && !car.occupied)).toBe(true);
  const entering = await page.evaluate(() => {
    const entry = window.__coastlineTransitionTest.activeWorldFleet()[0];
    const car = window.__coastlineVehicleRegistry.find(vehicle => vehicle.homeyFleetId === entry.id);
    if (!car) return null;
    window.__coastlineTest.setWalkPosition(car.x, car.z + 4, Math.PI);
    const nearest = window.__coastlineTest.nearestVehicleState();
    const success = window.__coastlineTest.enterVehicle(car);
    return { nearest, success, mode: window.__coastlineTransitionTest.playerState().mode,
      vehicleIndex: window.__coastlineTransitionTest.playerState().vehicleIndex,
      carIndex: window.__coastlineVehicleRegistry.indexOf(car) };
  });
  expect(entering).not.toBeNull();
  expect(entering.nearest?.parentMatches).toBe(true);
  expect(entering.success).toBe(true);
  expect(entering.mode).toBe('vehicle');
  expect(entering.vehicleIndex).toBe(entering.carIndex);
  await page.evaluate(() => window.__coastlineTest.exitVehicle());
  expect(await page.evaluate(() => window.__coastlineTransitionTest.playerState().mode)).toBe('walk');
  const steering = await page.evaluate(() => ({
    left: window.__coastlineTest.steeringProbe('a'),
    right: window.__coastlineTest.steeringProbe('d')
  }));
  expect(steering.left).toBeLessThan(0);
  expect(steering.right).toBeGreaterThan(0);
  for (const transition of ['island-to-waterfront', 'waterfront-to-port']) {
    await page.evaluate(id => window.__coastlineTransitionTest.transition(id), transition);
    await page.waitForFunction(() => window.__coastlineTransitionTest.activeWorldFleet().length >= 2, null, { timeout: 30000 });
    expect(await page.evaluate(() => window.__coastlineTransitionTest.activeWorldFleet().every(car => car.visible && car.drivable))).toBe(true);
  }
});

test('wardrobe edits apply to the loaded character and Homey threshold headings face away from each CTM', async ({ page }) => {
  await openGame(page);
  await page.waitForFunction(() => window.__coastlineCharacterAssetSwapStatus?.ok === true, null, { timeout: 30000 });
  await page.evaluate(() => window.__coastlineTest.setVehiclePosition(500, 400, Math.PI));
  await page.evaluate(() => window.__coastlineTransitionTest.transition('city-to-island'));
  await page.evaluate(() => window.__coastlineTransitionTest.transition('island-to-homey-garage'));
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(483, 500, Math.PI));
  await page.evaluate(() => window.__coastlineTransitionTest.transition('homey-garage-to-house'));
  await page.waitForFunction(() => Boolean(window.__coastlineHomeWardrobe && window.__coastlineAvatar?.userData?.cozyActor), null, { timeout: 30000 });
  const appearance = await page.evaluate(() => {
    window.__coastlineHomeWardrobe.apply({
      topColor: '#9c3f42', bottomColor: '#263f68', hairColor: '#874d2d',
      hairStyle: 'spiky', bodyShape: 'slim', presentation: 'feminine',
      accessories: { hat: false, backpack: false }
    });
    const materials = [];
    window.__coastlineAvatar.traverse(node => {
      if (!node.isMesh) return;
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
        if (['top_primary', 'bottom_primary', 'hair'].includes(String(material?.name || ''))) {
          materials.push({ name: material.name, color: material.color?.getHexString?.() });
        }
      }
    });
    return {
      applied: window.__coastlinePlayer.coastlineClothingAppliedMaterialCount,
      hairOverlay: Boolean(window.__coastlineAvatar.userData.cozyActor.root.getObjectByName('coastline-wardrobe-hair-overlay')),
      materials
    };
  });
  expect(appearance.applied).toBeGreaterThan(0);
  expect(appearance.hairOverlay).toBe(true);
  expect(appearance.materials.some(item => item.name === 'top_primary' && item.color === '9c3f42')).toBe(true);
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).heading).toBeCloseTo(Math.PI, 3);
  await page.evaluate(() => window.__coastlineTransitionTest.transition('home-to-homey-garage'));
  expect((await page.evaluate(() => window.__coastlineTransitionTest.playerState())).heading).toBeCloseTo(0, 3);
});
