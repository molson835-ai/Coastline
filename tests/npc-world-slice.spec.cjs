const { test, expect } = require('@playwright/test');

test('public-works NPC reacts to a nearby player and begins a character-specific repair story', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('coastline-npc-world-slice-v1'));
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });

  const before = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(before.npc.name).toBe('Mara Ellis');
  expect(before.npc.role).toBe('publicWorks');
  expect(before.phase).toBe('idle');

  // Let the real render/update loop establish a healthy cadence before triggering
  // the story. This avoids mistaking initial world construction/render pressure for
  // a broken NPC state machine.
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.npcWorldSliceState().diagnostics.updateCount), { timeout: 12000, intervals: [250, 500, 1000] }).toBeGreaterThan(20);
  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), before.target);
  try {
    await expect.poll(async () => page.evaluate(() => {
      const state = window.__coastlineTest.npcWorldSliceState();
      return state.diagnostics.lastTriggerAt === null ? `waiting:${state.phase}` : state.phase;
    }), { timeout: 12000, intervals: [100, 250, 500, 1000] }).toBe('repairing');
  } catch (error) {
    const diagnostic = await page.evaluate(() => { const state = window.__coastlineTest.npcWorldSliceState(); return { phase: state.phase, target: state.target, player: state.player, diagnostics: state.diagnostics }; });
    throw new Error(`${error.message}; NPC trigger diagnostic=${JSON.stringify(diagnostic)}`);
  }

  const active = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(active.npc.flags.signalOutage).toBe(true);
  expect(active.npc.memory.some(item => item.type === 'infrastructure_failure')).toBe(true);
  expect(active.agency.events.some(event => event.type === 'signal_outage')).toBe(true);

  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.npcWorldSliceState().phase), { timeout: 25000, intervals: [250, 500, 1000] }).toBe('complete');
  const completed = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(completed.agency.outcomes.some(event => event.type === 'signal_restored')).toBe(true);
  expect(completed.npc.flags.signalOutage).toBe(false);
  const townRumor = completed.rumors.rumors.find(rumor => rumor.topic === 'signalOutage');
  expect(townRumor).toBeTruthy();
  expect(townRumor.history.length).toBeGreaterThan(1);
  expect(completed.rumors.people.filter(person => person.knowledge.signalOutage).length).toBeGreaterThan(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });
  const restored = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(restored.phase).toBe('complete');
  expect(restored.agency.outcomes.some(event => event.type === 'signal_restored')).toBe(true);
  expect(restored.rumors.rumors.find(rumor => rumor.topic === 'signalOutage').history.length).toBeGreaterThan(1);
});
