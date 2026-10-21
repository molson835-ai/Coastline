const { test, expect } = require('@playwright/test');

async function openHarness(page) {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/tests/fixtures/ctm-runtime-smoke.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineCTMBrowserSmoke?.ready || window.__coastlineCTMBrowserSmoke?.error), null, { timeout: 15000 });
  const status = await page.evaluate(() => window.__coastlineCTMBrowserSmoke);
  expect(status.error, 'CTM fixture should initialize without an error').toBeUndefined();
  expect(status.ready).toBe(true);
  expect(status.initial.activeWorldId).toBe('world-a');
  expect(status.initial.sceneCount).toBe(1);
  expect(pageErrors, 'CTM fixture should not throw browser errors').toEqual([]);
  return pageErrors;
}

test('browser CTM synthetic A to B to A preserves state and keeps one active root', async ({ page }) => {
  const pageErrors = await openHarness(page);
  const result = await page.evaluate(() => window.__coastlineCTMBrowserSmoke.roundTrip());
  expect(result.firstState).toBe('COMPLETE');
  expect(result.secondState).toBe('COMPLETE');
  expect(result.activeWorldId).toBe('world-a');
  expect(result.sceneCount).toBe(1);
  expect(result.activeRoot).toEqual(['world-a']);
  expect(result.restoredMoney).toBe(1750);
  expect(result.restoredVehicle).toBe('white-sedan');
  expect(result.restoreBeforeActivate).toBe(true);
  expect(result.telemetry).toEqual(['COMPLETE', 'COMPLETE']);
  expect(result.disposed['world-a']).toBe(1);
  expect(result.disposed['world-b']).toBe(1);
  expect(pageErrors, 'transitions should not throw browser errors').toEqual([]);
});

test('browser masked gate can be cancelled at READY without replacing World A', async ({ page }) => {
  const pageErrors = await openHarness(page);
  await page.evaluate(() => window.__coastlineCTMBrowserSmoke.beginMaskedTransition());
  await page.waitForFunction(() => window.__coastlineCTMBrowserSmoke.state().transition?.state === 'READY', null, { timeout: 10000 });
  const result = await page.evaluate(() => window.__coastlineCTMBrowserSmoke.cancelMaskedTransition());
  expect(result.cancelAccepted).toBe(true);
  expect(result.outcome.ok).toBe(false);
  expect(result.outcome.name).toBe('TransitionCancelledError');
  expect(result.outcome.snapshot.state).toBe('FAILED');
  expect(result.activeWorldId).toBe('world-a');
  expect(result.sceneCount).toBe(1);
  expect(result.activeRoot).toEqual(['world-a']);
  expect(result.telemetry).toBe('CANCELLED');
  expect(result.disposed['world-b']).toBe(1);
  expect(pageErrors, 'masked cancellation should not throw browser errors').toEqual([]);
});
