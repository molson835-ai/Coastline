const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const html = readFileSync(path.join(__dirname, '..', 'game-v3.html'), 'utf8');

test('static grid lane dashes and edge markings use instanced meshes', () => {
  const start = html.indexOf('function buildGridRoadMarkings()');
  const end = html.indexOf('const streetDetails=', start);
  assert.notEqual(start, -1, 'grid road-marking builder exists');
  assert.notEqual(end, -1, 'builder is before street-detail generation');
  const block = html.slice(start, end);
  assert.match(block, /new THREE\.InstancedMesh\(dashGeo,centerStripe,/);
  assert.match(block, /new THREE\.InstancedMesh\(edgeGeo,edgeStripe,/);
  assert.match(block, /dashes\.setMatrixAt\(/);
  assert.match(block, /edges\.setMatrixAt\(/);
  assert.match(block, /dashes\.castShadow=false/);
  assert.match(block, /edges\.castShadow=false/);
  assert.doesNotMatch(block, /new THREE\.Mesh\(/, 'individual lane dashes/edge lines are not emitted as separate meshes');
});

test('grid road surfaces no longer create per-dash markings', () => {
  const start = html.indexOf('function road(x,z,w=ROADW)');
  const end = html.indexOf('const gridRoadWidth=', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const roadBuilders = html.slice(start, end);
  assert.equal((roadBuilders.match(/new THREE\.Mesh\(/g) || []).length, 2, 'only the two road-surface meshes are created');
  assert.doesNotMatch(roadBuilders, /centerStripe|edgeStripe/);
});

test('duplicate outer grid-edge marking loops are removed', () => {
  assert.doesNotMatch(html, /const offset=gridRoadWidth\(x\)\/2\+\.65/);
  assert.doesNotMatch(html, /const offset=gridRoadWidth\(z\)\/2\+\.65/);
});
