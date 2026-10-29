import { test, expect } from '@playwright/test';

async function enterWaterfront(page) {
  await page.goto('/game-v3.html?beta=electric-lemonade-runtime', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => window.__coastlineTest && window.__coastlineTransitionTest && window.__coastlineElectricLemonade, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__coastlineTransitionTest.transition('city-to-island');
    await window.__coastlineTransitionTest.transition('island-to-waterfront');
  });
}

test('Electric Lemonade charges exactly 10 CB, illuminates the dungeon, and glow ends on CTM exit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coastline-cash-balance-v1', '25'));
  await enterWaterfront(page);
  const result = await page.evaluate(async () => {
    const test = window.__coastlineTest;
    test.setWalkPosition(520, 531.5, Math.PI);
    const canBuy = window.__coastlineElectricLemonade.canUse();
    const before = window.__coastlineElectricLemonade.state().balance;
    await window.__coastlineElectricLemonade.interact();
    document.querySelector('#coastlineLemonadeBuy')?.click();
    const afterPurchase = window.__coastlineElectricLemonade.state();
    test.setWalkPosition(520, 542.5, 0);
    await window.__coastlineElectricLemonade.interact();
    const inDungeon = window.__coastlineTransitionTest.status().activeWorldId;
    const lit = test.electricLemonadeVisualState();
    test.setWalkPosition(552, 568, 0);
    await window.__coastlineElectricLemonade.interact();
    const boots = window.__coastlineElectricLemonade.state();
    test.setWalkPosition(548, 541.5, Math.PI);
    await window.__coastlineElectricLemonade.interact();
    const exited = window.__coastlineElectricLemonade.state();
    const afterExitVisual = test.electricLemonadeVisualState();
    return { canBuy, before, balance: afterPurchase.balance, glowPurchased: afterPurchase.glowPurchased, inDungeon, glowInDungeon: lit.auraVisible && lit.playerLightIntensity > 0 && !lit.skyVisible, boots: boots.rocketBootsActive, exitedWorld: afterExitVisual.world, glowAfterExit: exited.glowActive, bootsAfterExit: exited.rocketBootsActive, skyRestored: afterExitVisual.skyVisible };
  });
  expect(result).toEqual({
    canBuy: true, before: 25, balance: 15, glowPurchased: true,
    inDungeon: 'electric-lemonade-dungeon', glowInDungeon: true,
    boots: true, exitedWorld: 'waterfront', glowAfterExit: false,
    bootsAfterExit: true, skyRestored: true,
  });
});

test('dungeon remains dark without a purchased glow and blocks an on-foot route through the walls', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('coastline-cash-balance-v1', '0'));
  await enterWaterfront(page);
  const result = await page.evaluate(async () => {
    window.__coastlineTest.setWalkPosition(520, 542.5, 0);
    await window.__coastlineElectricLemonade.interact();
    const visual = window.__coastlineTest.electricLemonadeVisualState();
    const blocked = window.__coastlineTest.buildingBlocked(531, 558, .45);
    return { world: visual.world, glow: visual.auraVisible, light: visual.playerLightIntensity, sky: visual.skyVisible, blocked };
  });
  expect(result).toEqual({ world: 'electric-lemonade-dungeon', glow: false, light: 0, sky: false, blocked: true });
});
