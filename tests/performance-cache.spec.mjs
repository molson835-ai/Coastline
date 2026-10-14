import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sw=fs.readFileSync(new URL('../coastline-sw.js',import.meta.url),'utf8');
const living=fs.readFileSync(new URL('../living-world.js',import.meta.url),'utf8');

test('service worker caches only the small same-origin core',()=>{
  assert.match(sw,/CACHE_NAME='coastline-static-v1'/);
  assert.match(sw,/url\.origin!==self\.location\.origin/);
  assert.match(sw,/CORE=\[/);
  assert.ok(sw.length<5000);
});

test('living world installs cache without adding a render-loop scheduler',()=>{
  assert.match(living,/serviceWorker\.register/);
  assert.doesNotMatch(living,/requestAnimationFrame\(/);
  assert.match(living,/assetCaching/);
});
