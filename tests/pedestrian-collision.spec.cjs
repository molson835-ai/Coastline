const { test, expect } = require('@playwright/test');

test('on-foot movement treats pedestrians as physical obstacles', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const start = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const people = api.pedestrianRoster();
    let spot = null;
    for (let x = -700; x <= 700 && !spot; x += 25) {
      for (let z = -700; z <= 700; z += 25) {
        if (people.slice(1).some(p => Math.hypot(p.x - x, p.z - z) < 20)) continue;
        if (api.buildingBlocked(x, z, .45) || api.buildingBlocked(x - 1.5, z, .45)) continue;
        spot = { x, z };
        break;
      }
    }
    if (!spot || !api.setPedestrianPosition(0, spot.x, spot.z)) return null;
    api.setWalkPosition(spot.x - 1.5, spot.z, Math.PI / 2);
    api.keyDown('w');
    return { ...spot, initialX: spot.x - 1.5, blockedAtNpc: api.pedestrianCollisionBlocked(spot.x, spot.z, .45) };
  });

  expect(start).not.toBeNull();
  expect(start.blockedAtNpc).toBe(true);
  await page.waitForTimeout(900);
  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.keyUp('w');
    const player = api.state();
    const npc = api.pedestrianRoster()[0];
    return { player, npc, distance: Math.hypot(player.x - npc.x, player.z - npc.z) };
  });
  expect(result.player.x).toBeGreaterThan(start.initialX + .1);
  expect(result.distance).toBeGreaterThanOrEqual(1.0);
  expect(pageErrors).toEqual([]);
});