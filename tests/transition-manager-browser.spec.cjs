const { test, expect } = require('@playwright/test');

test('active game runtime exposes the deterministic CTM bridge transition hook', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTransitionTest), null, { timeout: 30000 });

  const before = await page.evaluate(() => window.__coastlineTransitionTest.status());
  expect(before.state).toBe('active');
  expect(before.activeWorldId).toBe('world-1');

  const result = await page.evaluate(async () => {
    const api = window.__coastlineTransitionTest;
    await api.transition('bridge-world-1-to-world-2', {
      player: { position: { x: 1, y: 0, z: 2 }, rotationY: 0.5 },
      vehicle: { id: 'smoke-sedan', position: { x: 1, y: 0, z: 2 }, rotationY: 0.5, speed: 0 },
    });
    return api.status();
  });

  expect(result.state).toBe('active');
  expect(result.activeWorldId).toBe('world-2');
  expect(result.residentWorldIds).toEqual(['world-2']);
});
