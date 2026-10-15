import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist', 'itch-html');
const files = [
  'game-v3.html', 'world-model.js', 'world-engine.js', 'living-world.js',
  'douglassville-layout.js', 'realism-library.js', 'presentation-runtime.js',
  'cinematic-visual-library.js', 'cinematic-animation-library.js',
  'cinematic-environment-library.js', 'replayability-engine.js',
  'npc-agency-engine.js', 'npc-world-slice.js', 'social-rumor-engine.js',
  'player-reputation-engine.js', 'coastline-sw.js'
];
for (const file of files) {
  if (!existsSync(path.join(root, file))) throw new Error('Missing runtime file: ' + file);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await copyFile(path.join(root, file), path.join(output, file));
const html = await readFile(path.join(root, 'game-v3.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), html);
let sw = await readFile(path.join(output, 'coastline-sw.js'), 'utf8');
sw = sw.replace('coastline-static-v6', 'coastline-static-v7');
sw = sw.replace("const CORE=['./','./game-v3.html'", "const CORE=['./','./index.html','./game-v3.html'");
if (!sw.includes("'./index.html'") || !sw.includes('coastline-static-v7')) {
  throw new Error('Unable to configure service-worker cache for the packaged entry point.');
}
await writeFile(path.join(output, 'coastline-sw.js'), sw);
console.log('Prepared dist/itch-html with ' + (files.length + 1) + ' files.');
