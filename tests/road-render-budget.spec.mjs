import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [game, runtime] = await Promise.all([
  readFile(new URL('../game-v3.html', import.meta.url), 'utf8'),
  readFile(new URL('../coastline-runtime-fix.js', import.meta.url), 'utf8')
]);

test('long road meshes are exempt from origin-based spatial budgeting', () => {
  assert.match(runtime, /o\.userData\?\.coastlineRoadLayer/);
  assert.match(game, /function protectRoadLayer\(mesh\)\{mesh\.userData\.coastlineRoadLayer=true;mesh\.userData\.coastlineAlwaysVisible=true;return mesh\}/);
  assert.match(game, /function road\(x,z,w=ROADW\)[\s\S]*?scene\.add\(protectRoadLayer\(r\)\)/);
  assert.match(game, /function roadZ\(x,z,w=ROADW\)[\s\S]*?scene\.add\(protectRoadLayer\(r\)\)/);
  assert.match(game, /protectRoadLayer\(dashes\);protectRoadLayer\(edges\)/);
  assert.match(game, /scene\.add\(protectRoadLayer\(sidewalks\),protectRoadLayer\(curbs\),protectRoadLayer\(drains\)\)/);
});

test('regional road markings, rails and creek are also protected from center-point culling', () => {
  assert.match(game, /scene\.add\(protectRoadLayer\(new THREE\.Mesh\(new THREE\.TubeGeometry/);
  assert.match(game, /scene\.add\(protectRoadLayer\(dash\)\)/);
  assert.match(game, /scene\.add\(protectRoadLayer\(new THREE\.Mesh\(ribbonGeometry\(curve,1\.1/);
  assert.match(game, /scene\.add\(protectRoadLayer\(rail\)\)/);
  assert.match(game, /scene\.add\(protectRoadLayer\(tie\)\)/);
  assert.match(game, /scene\.add\(protectRoadLayer\(creek\)\)/);
});
