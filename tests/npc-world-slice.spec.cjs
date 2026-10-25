const { test, expect } = require('@playwright/test');

test('foundation mode keeps basic traffic and pedestrians while advanced NPC stories stay dormant', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('coastline-npc-foundation-reset')) {
      localStorage.removeItem('coastline-npc-world-slice-v1');
      sessionStorage.setItem('coastline-npc-foundation-reset', '1');
    }
  });
  await page.goto('/game-v3.html?beta=npc-foundation-scope', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('coastlineStartupWatchdog'), null, { timeout: 60000 });

  const before = await page.evaluate(() => ({
    core: window.__coastlineTest.state(),
    trafficCount: window.__coastlineTest.trafficState().length,
    npc: window.__coastlineTest.npcWorldSliceState(),
    world: window.__coastlineTransitionTest.status(),
  }));
  expect(before.world.activeWorldId).toBe('city');
  expect(before.core.vehicleCount).toBeGreaterThan(10); // includes parked vehicles
  expect(before.trafficCount).toBe(12); // enforced City traffic budget
  expect(before.core.pedestrianCount).toBe(16); // enforced City pedestrian budget
  expect(before.npc.phase).toBe('idle');

  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), before.npc.target);
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(.035, 400));

  const after = await page.evaluate(() => ({
    core: window.__coastlineTest.state(),
    trafficCount: window.__coastlineTest.trafficState().length,
    npc: window.__coastlineTest.npcWorldSliceState(),
  }));
  expect(after.npc.phase).toBe('idle');
  expect(after.npc.npc.flags.signalOutage).not.toBe(true);
  expect(after.core.vehicleCount).toBeGreaterThan(10); // includes parked vehicles
  expect(after.trafficCount).toBe(12);
  expect(after.core.pedestrianCount).toBe(16);
  await expect(page.locator('.mission')).toBeHidden();
  expect(errors).toEqual([]);
});
