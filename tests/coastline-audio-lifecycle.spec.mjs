import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const gameSource = () => readFile(new URL('../game-v3.html', import.meta.url), 'utf8');

test('successful first vehicle entry unlocks audio before driving sound updates', async () => {
  const source = await gameSource();
  const start = source.indexOf('function enterVehicle(v){');
  assert.notEqual(start, -1, 'authoritative vehicle-entry function exists');
  const body = source.slice(start, start + 900);
  assert.match(body, /unlockAudio\(\)/, 'first vehicle entry must unlock/resume Web Audio from the user gesture');
});

test('engine audio resumes after page visibility returns without creating a second audio graph', async () => {
  const source = await gameSource();
  assert.match(source, /document\.addEventListener\('visibilitychange',\(\)=>\{[^}]*audioContext\?\.state==='suspended'[^}]*audioContext\.resume\(\)/s);
  assert.match(source, /function unlockAudio\(\)\{if\(audioReady\)\{if\(audioContext\?\.state==='suspended'\)audioContext\.resume\(\)/);
});
