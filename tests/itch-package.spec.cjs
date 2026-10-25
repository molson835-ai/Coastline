const { test, expect } = require('@playwright/test');

test('packaged itch.io root entry boots with local gameplay modules', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'request failed'}`));
  const modelResponse = await page.request.get('/assets/vehicles/Range%20Rover%20by%20IvOfficial%20-%208zk4o6nALW.glb');
  expect(modelResponse.ok(), 'Range Rover model asset should be present in the packaged output').toBe(true);
  await page.addInitScript(() => {
    window.__coastlineBootErrors = [];
    addEventListener('error', event => window.__coastlineBootErrors.push({ message: event.message, filename: event.filename, line: event.lineno, column: event.colno }));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 }); }
  catch (error) { throw new Error(`Packaged Coastline failed to boot. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)} windowErrors=${JSON.stringify(await page.evaluate(() => window.__coastlineBootErrors || []))} original=${error.message}`); }
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
  expect(systems.socialRumors.people.length).toBe(16); // aligns the dormant rumor roster with the enforced pedestrian budget
  expect(systems.socialRumorRules.noGlobalOmniscience).toBe(true);
  expect(pageErrors).toEqual([]);
});
