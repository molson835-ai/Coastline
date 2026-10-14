const { test, expect } = require('@playwright/test');

test('public-works NPC reacts to a nearby player and begins a persistent repair story', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });

  const before = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(before.npc.name).toBe('Mara Ellis');
  expect(before.npc.role).toBe('publicWorks');
  expect(before.phase).toBe('idle');

  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), before.target);
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.npcWorldSliceState().phase), { timeout: 5000 }).toBe('repairing');

  const active = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(active.npc.flags.signalOutage).toBe(true);
  expect(active.npc.memory.some(item => item.type === 'infrastructure_failure')).toBe(true);
  expect(active.agency.events.some(event => event.type === 'signal_outage')).toBe(true);
});
