const { test, expect } = require('@playwright/test');

test('public-works NPC reacts to a nearby player and begins a character-specific repair story', async ({ page }) => {
  // The full 3D runtime can stall briefly during reload under software-rendered CI.
  test.setTimeout(90000);
  await page.addInitScript(() => { if (!sessionStorage.getItem('coastline-npc-test-reset')) { localStorage.removeItem('coastline-npc-world-slice-v1'); sessionStorage.setItem('coastline-npc-test-reset', '1'); } });
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });

  const before = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(before.npc.name).toBe('Mara Ellis');
  expect(before.npc.role).toBe('publicWorks');
  expect(before.phase).toBe('idle');

  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), before.target);
  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(.035, 1));
  const active = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(active.phase).toBe('repairing');
  expect(active.npc.flags.signalOutage).toBe(true);
  expect(active.npc.memory.some(item => item.type === 'infrastructure_failure')).toBe(true);
  expect(active.agency.events.some(event => event.type === 'signal_outage')).toBe(true);

  await page.evaluate(() => window.__coastlineTest.advanceTestFrame(.035, 400));
  const completed = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(completed.phase).toBe('complete');
  expect(completed.agency.outcomes.some(event => event.type === 'signal_restored')).toBe(true);
  expect(completed.npc.flags.signalOutage).toBe(false);
  const townRumor = completed.rumors.rumors.find(rumor => rumor.topic === 'signalOutage');
  expect(townRumor).toBeTruthy();
  expect(townRumor.history.length).toBeGreaterThan(1);
  expect(completed.rumors.people.filter(person => person.knowledge.signalOutage).length).toBeGreaterThan(1);

  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });
  const restored = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(restored.phase).toBe('complete');
  expect(restored.agency.outcomes.some(event => event.type === 'signal_restored')).toBe(true);
  expect(restored.rumors.rumors.find(rumor => rumor.topic === 'signalOutage').history.length).toBeGreaterThan(1);
});
