import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sw=fs.readFileSync(new URL('../coastline-sw.js',import.meta.url),'utf8');
const living=fs.readFileSync(new URL('../living-world.js',import.meta.url),'utf8');
const renderConfig=fs.readFileSync(new URL('../coastline-render-config.js',import.meta.url),'utf8');
const cinematic=fs.readFileSync(new URL('../cinematic-world-upgrade.js',import.meta.url),'utf8');

test('service worker uses a release identity and never treats executable code as a permanent cache hit',()=>{
  assert.match(sw,/const RELEASE_ID='[^']+'/);
  assert.match(sw,/CACHE_NAME=`coastline-static-v-\$\{RELEASE_ID\}`/);
  assert.match(sw,/cache:\s*'no-store'/);
  assert.match(sw,/isExecutable/);
  assert.match(sw,/cache.delete/);
  assert.doesNotMatch(sw,/CACHE_NAME='coastline-static-v\\d+'/);
});

test('render config is the single authority for renderer pixel ratio',()=>{
  assert.match(renderConfig,/function applyCoastlineRendererConfig/);
  assert.match(renderConfig,/setPixelRatio/);
  assert.doesNotMatch(cinematic,/renderer\.setPixelRatio\(/);
});

test('living world installs cache without adding a render-loop scheduler',()=>{
  assert.match(living,/serviceWorker\.register/);
  assert.doesNotMatch(living,/requestAnimationFrame\(/);
  assert.match(living,/assetCaching/);
});
