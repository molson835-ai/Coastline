const { test, expect } = require('@playwright/test');

test('packaged itch.io root entry boots with local gameplay modules', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  await expect(page.locator('canvas').first()).toBeAttached();
  await expect(page.locator('#mode')).toHaveText('DRIVING');

  const systems = await page.evaluate(() => {
    const api = window.__coastlineTest;
    return {
      state: api.state(),
      livingWorld: api.livingWorldState(),
      npcSlice: api.npcWorldSliceState(),
      reputation: api.playerReputationState(),
      socialRumors: api.socialRumorState(),
      socialRumorRules: api.socialRumorRules()
    };
  });
  expect(systems.state.errors).toEqual([]);
  expect(systems.livingWorld.rules).toBeTruthy();
  expect(systems.npcSlice).toBeTruthy();
  expect(systems.reputation).toBeTruthy();
  expect(systems.socialRumors.people.length).toBeGreaterThan(40);
  expect(systems.socialRumorRules.noGlobalOmniscience).toBe(true);
  expect(pageErrors).toEqual([]);
});
