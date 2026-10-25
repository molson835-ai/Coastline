import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../game-v3.html', import.meta.url), 'utf8');

test('GitHub Pages build maps Three.js bare imports before loading postprocessing', () => {
  const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/i);
  assert.ok(importMapMatch, 'game-v3.html must define an import map before its module script');

  const importMap = JSON.parse(importMapMatch[1]);
  assert.equal(
    importMap.imports?.three,
    'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
    'the three specifier must resolve to the pinned Three.js module'
  );

  assert.match(
    html,
    /import\s*\{\s*EffectComposer\s*\}\s*from\s*['"]https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/examples\/jsm\/postprocessing\/EffectComposer\.js['"]/,
    'postprocessing must use the same pinned Three.js release'
  );
});

test('the import map appears before the game module script', () => {
  const importMapIndex = html.indexOf('<script type="importmap">');
  const moduleIndex = html.indexOf('<script type="module">');
  assert.ok(importMapIndex >= 0 && moduleIndex > importMapIndex,
    'the browser must see the import map before evaluating game modules');
});
