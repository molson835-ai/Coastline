const { test, expect } = require('@playwright/test');

test('on-foot movement treats pedestrians as physical obstacles', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const start = await page.evaluate(() => {
    const api = window.__coastlineTest;
    const people = api.pedestrianRoster();
    const vehicles = api.vehicleRoster();
    let spot = null;

    // Choose a clear approach corridor, not a player spawn already inside the
    // pedestrian collision radius. This tests approach + stopping, not a spawn overlap.
    for (let x = -650; x <= 650 && !spot; x += 25) {
      for (let z = -650; z <= 650; z += 25) {
        if (people.slice(1).some(p => Math.hypot(p.x - x, p.z - z) < 20)) continue;
        let corridorClear = true;
        for (let offset = 4; offset >= 0; offset -= 0.5) {
          const px = x - offset;
          if (api.buildingBlocked(px, z, .45) ||
              api.vehicleRoster().some(v => Math.hypot(v.x - px, v.z - z) < 2.3)) {
            corridorClear = false;
            break;
          }
          if (people.slice(1).some(p => Math.hypot(p.x - px, p.z - z) < 1.8)) {
            corridorClear = false;
            break;
          }
        }
        if (corridorClear) {
          spot = { x, z };
          break;
        }
      }
    }
    if (!spot || !api.setPedestrianPosition(0, spot.x, spot.z)) return null;
    api.setWalkPosition(spot.x - 4, spot.z, Math.PI / 2);
    api.keyDown('w');
    return {
      ...spot,
      initialX: spot.x - 4,
      initialDistance: 4,
      blockedAtNpc: api.pedestrianCollisionBlocked(spot.x, spot.z, .45)
    };
  });

  expect(start).not.toBeNull();
  expect(start.blockedAtNpc).toBe(true);

  const result = await page.evaluate(() => {
    const api = window.__coastlineTest;
    api.advanceTestFrame(1 / 60, 45);
    api.keyUp('w');
    const player = api.state();
    const npc = api.pedestrianRoster()[0];
    return { player, npc, distance: Math.hypot(player.x - npc.x, player.z - npc.z) };
  });

  expect(result.player.x).toBeGreaterThan(start.initialX + .1);
  expect(result.distance).toBeGreaterThanOrEqual(1.0);
  expect(result.distance).toBeLessThan(start.initialDistance);
  expect(pageErrors).toEqual([]);
});
