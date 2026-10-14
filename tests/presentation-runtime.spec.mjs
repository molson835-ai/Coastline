import test from 'node:test';
import assert from 'node:assert/strict';

const presentationSource = await (await import('node:fs/promises')).readFile(new URL('../presentation-runtime.js', import.meta.url), 'utf8');

test('presentation runtime stays DOM-only and event-driven', () => {
  assert.match(presentationSource, /MutationObserver/);
  assert.doesNotMatch(presentationSource, /requestAnimationFrame\(/);
  assert.doesNotMatch(presentationSource, /setInterval\(/);
  assert.match(presentationSource, /coast-idle/);
});

test('realism library exposes reusable regional construction profiles', async () => {
  const { REALISM_PROFILES, getRealismProfile, featureSet } = await import('../realism-library.js');
  for (const type of ['residentialStreet', 'arterial', 'retailStrip', 'serviceStation', 'riverTrail', 'farmstead']) {
    assert.ok(REALISM_PROFILES[type]);
    assert.ok(getRealismProfile(type).dimensions);
    assert.ok(featureSet(type).length >= 3);
  }
});
