import { test, expect } from '@playwright/test';

test('touch Use button appears only for an eligible nearby interaction', async ({ page }) => {
  await page.goto('/game-v3.html?beta=contextual-use', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => window.__coastlineTest?.actionButtonVisible && window.__coastlineTest?.refreshActionPrompt, null, { timeout: 30000 });
  const button = page.locator('#actionButton');
  const result = await page.evaluate(() => {
    const test = window.__coastlineTest;
    const originalWorld = window.__coastlineActiveWorldId;
    const action = document.querySelector('#actionButton');
    window.__coastlineActiveWorldId = 'city';
    test.setWalkPosition(700, 700, 0);
    test.refreshActionPrompt();
    const farAway = test.actionButtonVisible();
    const hiddenFarAway = action.hidden;
    const parked = test.parkedCarPositions()[0];
    if (!parked) throw new Error('Expected at least one parked car for interaction-range test');
    test.setWalkPosition(parked.x, parked.z, 0);
    test.refreshActionPrompt();
    const nearVehicle = test.actionButtonVisible();
    const visibleNearVehicle = !action.hidden;
    window.__coastlineActiveWorldId = 'island';
    test.setWalkPosition(500, 500, 0);
    test.refreshActionPrompt();
    const inactiveCityObjectsIgnored = test.actionButtonVisible();
    const hiddenOutsideCity = action.hidden;
    window.__coastlineActiveWorldId = originalWorld;
    test.setWalkPosition(parked.x, parked.z, 0);
    test.refreshActionPrompt();
    const visibleAfterRestore = test.actionButtonVisible();
    return { farAway, hiddenFarAway, nearVehicle, visibleNearVehicle, inactiveCityObjectsIgnored, hiddenOutsideCity, visibleAfterRestore };
  });
  await expect(button).toBeVisible();
  expect(result).toEqual({
    farAway: false,
    hiddenFarAway: true,
    nearVehicle: true,
    visibleNearVehicle: true,
    inactiveCityObjectsIgnored: false,
    hiddenOutsideCity: true,
    visibleAfterRestore: true,
  });
});
