const { test, expect } = require('@playwright/test');

test('public-works NPC reacts to a nearby player and begins a character-specific repair story', async ({ page }) => {
  // Reset saved state on the initial test navigation only. The same init script runs on
  // reloads, so an unconditional removal would erase the completed story being verified.
  await page.addInitScript(() => {
    if (new URL(location.href).searchParams.has('npc-slice-test-reset')) {
      localStorage.removeItem('coastline-npc-world-slice-v1');
    }
  });
  await page.goto('/game-v3.html?npc-slice-test-reset=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });

  const before = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(before.npc.name).toBe('Mara Ellis');
  expect(before.npc.role).toBe('publicWorks');
  expect(before.phase).toBe('idle');

  // Warm only long enough to prove the real update loop is alive. The prior
  // diagnostic showed this game can update slowly on CI, so 3 ticks is safer than
  // using an arbitrary wall-clock sleep while still detecting a stalled loop.
  await expect.poll(async () => page.evaluate(() => window.__coastlineTest.npcWorldSliceState().diagnostics.updateCount), { timeout: 12000, intervals: [250, 500, 1000] }).toBeGreaterThan(2);
  await page.evaluate(({ x, z }) => window.__coastlineTest.setVehiclePosition(x, z, 0), before.target);
  try {
    await expect.poll(async () => page.evaluate(() => {
      const state = window.__coastlineTest.npcWorldSliceState();
      return state.diagnostics.lastTriggerAt === null ? `waiting:${state.phase}` : state.phase;
    }), { timeout: 15000, intervals: [100, 250, 500, 1000] }).toBe('repairing');
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

  // Navigate without the one-time reset flag so persistence is actually exercised.
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest?.npcWorldSliceState), null, { timeout: 30000 });
  const restored = await page.evaluate(() => window.__coastlineTest.npcWorldSliceState());
  expect(restored.phase).toBe('complete');
  expect(restored.agency.outcomes.some(event => event.type === 'signal_restored')).toBe(true);
  expect(restored.rumors.rumors.find(rumor => rumor.topic === 'signalOutage').history.length).toBeGreaterThan(1);
});
