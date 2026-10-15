const { test, expect } = require('@playwright/test');

test('service worker activates and caches every same-origin gameplay module', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const registration = await navigator.serviceWorker.ready;
    const cacheNames = await caches.keys();
    const cache = await caches.open('coastline-static-v6');
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
    return {
      supported: true,
      scope: registration.scope,
      scriptURL: registration.active?.scriptURL ?? '',
      cacheNames,
      cached
    };
  });

  expect(result.supported).toBe(true);
  expect(result.scriptURL).toContain('/coastline-sw.js');
  expect(result.scope).toContain('/');
  expect(result.cacheNames).toContain('coastline-static-v6');
  expect(result.cached.filter(file => !file.present).map(file => file.path)).toEqual([]);
});
