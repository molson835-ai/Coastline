import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('../coastline-sw.js', import.meta.url), 'utf8');

test('service worker activates a fresh cache generation after deployment', () => {
  const cacheGeneration = worker.match(/const CACHE_NAME='coastline-static-v(\d+)'/);
  assert.ok(cacheGeneration, 'service worker declares a versioned static cache');
  assert.ok(Number(cacheGeneration[1]) > 66, 'deployment cache generation must advance beyond the pre-wildlife v65 cache');
  assert.match(worker, /'\.\/coastline-homey-garage\.js'/);
  assert.match(worker, /'\.\/coastline-homey-house-interior\.js'/);
  assert.match(worker, /'\.\/coastline-vehicle-sizing\.js'/);
  assert.match(worker, /keys\.filter\(k=>k!==CACHE_NAME\)/);
});

test('runtime scripts and styles refresh from network before using cached fallback', () => {
  assert.match(worker, /request\.destination==='script'\|\|request\.destination==='style'/);
  assert.match(worker, /fetch\(new Request\(request,\{cache:'reload'\}\)\)/);
  assert.match(worker, /catch\(\(\)=>caches\.match\(request\)\.then\(cached=>cached\|\|Response\.error\(\)\)/);
});

test('non-runtime assets retain cache-first behavior for offline resilience', () => {
  assert.match(worker, /event\.respondWith\(caches\.match\(request\)\.then\(cached=>\{const network=fetch\(request\)/);
});
