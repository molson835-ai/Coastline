import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const [loader,game,packageScript]=await Promise.all([readFile(new URL('../coastline-vehicle-asset-loader.js',import.meta.url),'utf8'),readFile(new URL('../game-v3.html',import.meta.url),'utf8'),readFile(new URL('../scripts/build-itch.mjs',import.meta.url),'utf8')]);
test('authored vehicle GLB binaries exist and have valid GLB signatures', async () => {
  const assets = [
    ['../assets/vehicles/white-four-door-sedan (1).glb', 'white sedan'],
    ['../assets/vehicles/blue-five-door-compact-hatchback.glb', 'blue hatchback']
  ];
  for (const [path, label] of assets) {
    const bytes = await readFile(new URL(path, import.meta.url));
    assert.ok(bytes.byteLength > 100_000, `${label} GLB should not be empty`);
    assert.equal(bytes.subarray(0, 4).toString(), 'glTF', `${label} should have a valid GLB header`);
  }
});
test('vehicle GLB loader caches source loads and exposes explicit load status',()=>{assert.match(loader,/const modelPromises = new Map\(\)/);assert.match(loader,/export async function replaceCoastlineVehicleVisual/);assert.match(loader,/source:'existing-vehicle-visual-preserved'/);assert.match(loader,/getCoastlineVehicleAssetStatus/);assert.match(loader,/sedan: Object\.freeze/);assert.match(loader,/hatchback: Object\.freeze/);assert.match(loader,/white-four-door-sedan \(1\)\.glb/);assert.match(loader,/root\.rotation\.y=Math\.PI\/2/);});
test('only the player sedan and one non-player hatchback request authored GLBs while preserving the physics roots',()=>{
  assert.match(game,/import \{ replaceCoastlineVehicleVisual \} from '\.\/coastline-vehicle-asset-loader\.js'/);
  assert.match(game,/const sedan=player\?\.vehicle;if\(sedan\)replaceCoastlineVehicleVisual\(\{group:sedan\.g,assetId:'sedan'\}\)/);
  assert.match(game,/const hatchback=vehicles\.find\(v=>v!==player\?\.vehicle&&v\.kind==='car'\);if\(hatchback\)replaceCoastlineVehicleVisual\(\{group:hatchback\.g,assetId:'hatchback'\}\)/);
  assert.doesNotMatch(game,/replaceCoastlineVehicleVisual\(\{group:vehicles\[[0-9]+\]\.g/);
});
test('authored white sedan is promoted to the player vehicle without replacing its physics root',()=>{assert.match(loader,/assetId==='sedan'/);assert.match(loader,/globalThis\.__coastlinePlayer/);assert.match(loader,/globalThis\.__coastlinePlayer\.vehicle/);assert.match(loader,/group!==globalThis\.__coastlinePlayer\.vehicle\.g/);assert.match(loader,/playerGroup=globalThis\.__coastlinePlayer\.vehicle\.g/);});
test('itch package includes the uploaded local vehicle GLBs when present',()=>{assert.match(packageScript,/assets\/vehicles\/coastline-hero\.glb/);assert.match(packageScript,/assets\/vehicles\/white-four-door-sedan \(1\)\.glb/);assert.match(packageScript,/assets\/vehicles\/blue-five-door-compact-hatchback\.glb/);assert.match(packageScript,/packagedAssets\.map\(file=>['"]\.\/['"]\+file\)/);});
