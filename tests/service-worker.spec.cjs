const { test, expect } = require('@playwright/test');

test('service worker activates and caches every same-origin gameplay module', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const registration = await navigator.serviceWorker.ready;
    const cacheNames = await caches.keys();
    const activeName = cacheNames.find(name => /^coastline-static-v\d+$/.test(name));
    if (!activeName) return { supported: true, scope: registration.scope, scriptURL: registration.active?.scriptURL ?? '', cacheNames, cached: [], runtimePatches: {} };
    const cache = await caches.open(activeName);
    const coreFiles = [
      './game-v3.html',
      './world-model.js',
      './world-engine.js',
      './living-world.js',
      './douglassville-layout.js',
      './realism-library.js',
      './presentation-runtime.js',
      './cinematic-visual-library.js',
      './cinematic-animation-library.js',
      './cinematic-environment-library.js',
      './replayability-engine.js',
      './npc-agency-engine.js',
      './npc-world-slice.js',
      './social-rumor-engine.js',
      './player-reputation-engine.js'
    ];
    const cached = await Promise.all(coreFiles.map(async path => ({
      path,
      present: Boolean(await cache.match(new URL(path, location.origin + '/').href))
    })));
    const response = await fetch(new URL('./game-v3.html', location.origin + '/'), { cache: 'no-store' });
    const html = await response.text();
    return {
      supported: true,
      scope: registration.scope,
      scriptURL: registration.active?.scriptURL ?? '',
      cacheNames,
      activeName,
      cached,
      runtimePatches: {
        pointerCaptureSafety: html.includes('__coastlineSafePointerCapture'),
        transitionManager: html.includes('coastline-transition-manager'),
        proximitySimulationBudget: html.includes('coastlineProximitySimulationBudget')
      }
    };
  });

  expect(result.supported).toBe(true);
  expect(result.scriptURL).toContain('/coastline-sw.js');
  expect(result.scope).toContain('/');
  expect(result.activeName).toMatch(/^coastline-static-v\d+$/);
  expect(result.cached.filter(file => !file.present).map(file => file.path)).toEqual([]);
  expect(result.runtimePatches.pointerCaptureSafety).toBe(true);
  expect(result.runtimePatches.transitionManager).toBe(true);
  expect(result.runtimePatches.proximitySimulationBudget).toBe(true);
});
