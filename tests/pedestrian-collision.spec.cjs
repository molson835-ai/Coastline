const { test, expect } = require('@playwright/test');

test('on-foot movement treats pedestrians as physical obstacles', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const start = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const x = 0;
    const vehicles = api.vehicleRoster();
    const pedestrians = api.pedestrianRoster();
    // Approach the NPC along a central road, not from a map-edge coordinate. Probe a
    // short, bounded path so obstacle checks don't block the browser's animation loop.
    for (const z of [40, -40, 80, -80, 120, -120, 160, -160, 240, -240, 280, -280, 320, -320, 360, -360]) {
      const samples = Array.from({ length: 11 }, (_, i) => z + i * 0.25);
      if (!samples.every(sampleZ => api.worldModel.isRoadCorridor(x, sampleZ, 2))) continue;
      if (samples.some(sampleZ => api.buildingBlocked(x, sampleZ, .45))) continue;
      if (vehicles.some(v => samples.some(sampleZ => Math.hypot(v.x - x, v.z - sampleZ) < 2.6))) continue;

      // Keep the chosen lane isolated from unrelated pedestrians; the tested NPC is placed
      // deliberately 2.5 units ahead and remains stationary through its test API timer.
      for (let i = 1; i < pedestrians.length; i++) {
        const p = pedestrians[i];
        const nearestZ = Math.max(z, Math.min(z + 3, p.z));
        if (Math.hypot(p.x - x, p.z - nearestZ) < 5) {
          api.setPedestrianPosition(i, -680, -600 + i * 9);
        }
      }
      api.setPedestrianPosition(0, x, z + 2.5);
      api.setWalkPosition(x, z, 0);
      api.keyDown('w');
      return { x, z, npcX: x, npcZ: z + 2.5, blockedAtNpc: api.pedestrianCollisionBlocked(x, z + 2.5, .45) };
    }
    return null;
  });

  expect(start).not.toBeNull();
  expect(start.blockedAtNpc).toBe(true);
  try {
    await expect.poll(() => page.evaluate(() => window.__coastlineTest.state().z), {
      timeout: 7000, intervals: [100, 250, 500], message: 'W should approach the stationary pedestrian until collision blocks further movement'
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
