import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [loader,game,packageScript]=await Promise.all([
  readFile(new URL('../coastline-vehicle-asset-loader.js',import.meta.url),'utf8'),
  readFile(new URL('../game-v3.html',import.meta.url),'utf8'),
  readFile(new URL('../scripts/build-itch.mjs',import.meta.url),'utf8')
]);

test('vehicle GLB loader caches source loads and exposes explicit load status',()=>{
  assert.match(loader,/const modelPromises = new Map\(\)/);
  assert.match(loader,/export async function replaceCoastlineVehicleVisual/);
  assert.match(loader,/source:'existing-vehicle-visual-preserved'/);
  assert.match(loader,/getCoastlineVehicleAssetStatus/);
});

test('regular car spawn path requests authored GLB replacement without replacing physics root',()=>{
  assert.match(game,/import \{ replaceCoastlineVehicleVisual \} from '\.\/coastline-vehicle-asset-loader\.js'/);
  assert.match(game,/if\(i!==0\)replaceCoastlineVehicleVisual\(\{group:g\}\)/);
  assert.match(game,/vehicles\.push\(v\);worldArchitecture\.runtime\.register/);
});

test('itch package includes local vehicle GLB when present and tracks it in packaged assets',()=>{
  assert.match(packageScript,/assets\/vehicles\/coastline-hero\.glb/);
  assert.match(packageScript,/packagedAssets\.map\(file => '\.\/' \+ file\)/);
  assert.match(packageScript,/No local vehicle GLB found/);
});
