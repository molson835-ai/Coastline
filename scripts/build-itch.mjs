import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist', 'itch-html');
const files = [
  'game-v3.html', 'coastline-asset-swap.js', 'assets/Free Low Poly Vehicles Pack by Rgsdev.zip', 'assets/grab3d-cozy-character.glb', 'ASSET_CREDITS.md', 'vehicle-visual-enhancer.js', 'cinematic-world-upgrade.js',
  'car-customization.js', 'world-model.js', 'world-engine.js', 'living-world.js',
  'douglassville-layout.js', 'realism-library.js', 'presentation-runtime.js',
  'cinematic-visual-library.js', 'cinematic-animation-library.js',
  'cinematic-environment-library.js', 'replayability-engine.js',
  'npc-agency-engine.js', 'npc-world-slice.js', 'social-rumor-engine.js',
  'player-reputation-engine.js', 'coastline-runtime-fix.js',
  'coastline-stability-v8.js', 'transition-manager.js', 'transition-manager-browser.js',
  'coastline-sw.js', 'coastline-world-transitions.js', 'coastline-island-regions.js', 'render-culling.js'
];
for (const file of files) {
  if (!existsSync(path.join(root, file))) throw new Error('Missing runtime file: ' + file);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  const destination = path.join(output, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, file), destination);
}
const html = await readFile(path.join(root, 'game-v3.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), html);
let sw = await readFile(path.join(output, 'coastline-sw.js'), 'utf8');
// The website cache may have advanced independently. Give the standalone package
// its own version and cache only files that are actually shipped in this package.
sw = sw.replace(/const CACHE_NAME='[^']+';/, "const CACHE_NAME='coastline-itch-static-v2';");
const packagedCore = ['./', './index.html', ...files.map(file => './' + file)];
sw = sw.replace(/const CORE=\[[^\]]*\];/, "const CORE=[" + packagedCore.map(file => "'" + file + "'").join(',') + "]");
if (!sw.includes("'./index.html'") || !sw.includes('coastline-itch-static-v2')) {
  throw new Error('Unable to configure service-worker cache for the packaged entry point.');
}
await writeFile(path.join(output, 'coastline-sw.js'), sw);

// Fail the release build if any local ES-module dependency is absent from the package.
const packaged = new Set([...files, 'index.html']);
for (const file of files.filter(name => name.endsWith('.js') || name.endsWith('.html'))) {
  const source = await readFile(path.join(output, file), 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"](.+?)['"]/g)) {
    const specifier = match[1];
    if (specifier.startsWith('./') && !packaged.has(specifier.slice(2))) {
      throw new Error(file + ' imports missing packaged dependency: ' + specifier);
    }
  }
}
const packagedIndex = await readFile(path.join(output, 'index.html'), 'utf8');
if (packagedIndex !== html) throw new Error('Packaged index.html does not match the game entry point.');
for (const match of sw.matchAll(/['"]\.\/([^'"]+)['"]/g)) {
  if (!packaged.has(match[1])) throw new Error('Service worker references missing packaged file: ' + match[1]);
}
console.log('Prepared and validated dist/itch-html with ' + (files.length + 1) + ' files.');
