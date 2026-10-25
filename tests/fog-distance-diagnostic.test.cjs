const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'game-v3.html'), 'utf8');

test('fog/view-distance diagnostics preserve baseline unless explicitly requested', () => {
  assert.match(source, /fogDensityByMode=\{baseline:\.00085,soft:\.00105,balanced:\.0013,dense:\.00165,off:0\}/);
  assert.match(source, /\?\.get\('diagFog'\)/);
  assert.match(source, /\[650,800,1000,1200,1400\]\.includes\(requestedViewDistance\)\?requestedViewDistance:1400/);
  assert.match(source, /new THREE\.PerspectiveCamera\(66,innerWidth\/innerHeight,\.1,diagnosticViewDistance\)/);
  assert.match(source, /fogMode, fogDensity:diagnosticFogDensity, viewDistance:camera\.far/);
});

test('diagnostic values are allow-listed and invalid values fall back safely', () => {
  assert.match(source, /\['baseline','soft','balanced','dense','off'\]\.includes\(diagnosticParams\.get\('diagFog'\)\)/);
  assert.match(source, /\[650,800,1000,1200,1400\]\.includes\(requestedViewDistance\)/);
});
