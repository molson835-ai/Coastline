const { test, expect } = require('@playwright/test');

test('mobile controls change with gameplay mode and audio toggle responds', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const footControls = page.locator('[data-foot-only]');
  await expect(footControls).toHaveCount(3);
  const worldLook = await page.evaluate(() => ({ residential: window.__coastlineTest.rowhomeState(), cinematic: window.__coastlineTest.cinematicState() }));
  expect(worldLook.residential.count).toBeGreaterThanOrEqual(70);
  expect(worldLook.residential.storefronts).toBeGreaterThanOrEqual(10);
  expect(worldLook.cinematic.environmentMap).toBe(true);
  expect(worldLook.cinematic.toneMapping).toBe(true);
  expect(worldLook.cinematic.bloomStrength).toBeGreaterThan(0.25);

  await page.evaluate(() => {
    const api = window.__coastlineTest;
    if (api.state().mode !== 'vehicle') api.enterRideable('car');
  });
  await expect(page.locator('[data-foot-only]').first()).toBeHidden();
  await expect(page.locator('#actionButton')).toHaveText('EXIT');

  await page.evaluate(() => window.__coastlineTest.exitVehicle());
  await expect(page.locator('[data-foot-only]').first()).toBeVisible();
  await expect(page.locator('#actionButton')).toHaveText('USE');

  const audioToggle = page.locator('#audioToggle');
  await expect(audioToggle).toBeVisible();
  await audioToggle.click();
  await expect(audioToggle).toHaveText('SOUND OFF');
  await audioToggle.click();
  await expect(audioToggle).toHaveText('SOUND ON');

  // Ambient sound should follow the world instead of being one identical loop everywhere.
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(0, 0, 0));
  const cityAudio = await page.evaluate(() => window.__coastlineTest.audioState());
  await page.evaluate(() => window.__coastlineTest.setWalkPosition(400, 300, 0));
  const countrysideAudio = await page.evaluate(() => window.__coastlineTest.audioState());
  expect(cityAudio.region).toBe('city');
  expect(countrysideAudio.region).toBe('countryside');
  expect(cityAudio.ambientLevel, 'city ambience should be denser than countryside ambience').toBeGreaterThan(countrysideAudio.ambientLevel);
  expect(cityAudio.ambientCutoff, 'city ambience should sound more enclosed than open countryside').toBeLessThan(countrysideAudio.ambientCutoff);

  expect(runtimeErrors).toEqual([]);
  expect(await page.evaluate(() => window.__coastlineTest.state().errors)).toEqual([]);
});
