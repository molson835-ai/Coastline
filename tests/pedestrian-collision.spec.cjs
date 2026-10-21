const { test, expect } = require('@playwright/test');
const { findNearbyQuietGround } = require('./helpers/nearby-world-spawn.cjs');

test('on-foot movement treats pedestrians as physical obstacles', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const quiet = await page.evaluate(findNearbyQuietGround);
  await page.evaluate(({ x, z }) => { window.__coastlineQuietGroundForTest = { x, z }; }, quiet);
  const start = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const quiet = window.__coastlineQuietGroundForTest;
    if (!quiet) return null;
    api.setPedestrianPosition(0, quiet.x, quiet.z + 2.5);
    api.setWalkPosition(quiet.x, quiet.z, 0);
    api.keyDown('w');
    return { ...quiet, npcX: quiet.x, npcZ: quiet.z + 2.5, blockedAtNpc: api.pedestrianCollisionBlocked(quiet.x, quiet.z + 2.5, .45) };
  });

  expect(start).not.toBeNull();
  expect(start.blockedAtNpc).toBe(true);
  try {
    await expect.poll(() => page.evaluate(() => window.__coastlineTest.state().z), {
      timeout: 12000, intervals: [100, 250, 500], message: 'W should approach the stationary pedestrian until collision blocks further movement'
    }).toBeGreaterThan(start.npcZ - 1.3);
  } finally {
    await page.evaluate(() => window.__coastlineTest.keyUp('w'));
  }
  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const player = api.state();
    const npc = api.pedestrianRoster()[0];
    return { player, npc, distance: Math.hypot(player.x - npc.x, player.z - npc.z) };
  });
  expect(result.player.z).toBeGreaterThan(start.z + .2);
  expect(result.player.z).toBeLessThanOrEqual(result.npc.z - 1.0);
  expect(result.distance).toBeGreaterThanOrEqual(1.0);
  expect(pageErrors).toEqual([]);
});
