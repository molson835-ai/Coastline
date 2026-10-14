import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerReputation, CONDUCT_EVENTS, conductRoll } from '../player-reputation-engine.js';

test('conduct events shape regional reputation and profile tendencies', () => {
  const reputation = createPlayerReputation({ seed: 'player-a' });
  reputation.record({ type: 'collision', region: 'Main Street', time: 10, severity: 1, witnessed: true });
  reputation.record({ type: 'helpedWorker', region: 'Main Street', time: 20, severity: 1, witnessed: true });
  assert.ok(Math.abs(reputation.profile('Main Street', 20).score) < 0.01);
  assert.equal(reputation.profile('Main Street', 20).standing, 'unknown');
  assert.ok(reputation.profile('Main Street', 20).tendencies.includes('reckless'));
  assert.equal(reputation.profile('Creek Road', 20).score, 0);
});

test('unwitnessed actions have reduced effect and scores remain bounded', () => {
  const reputation = createPlayerReputation();
  const event = reputation.record({ type: 'collision', region: 'town', time: 1, witnessed: false, severity: 2 });
  assert.equal(event.delta, -4);
  for (let i = 0; i < 40; i++) reputation.record({ type: 'collision', region: 'town', time: 10 + i, severity: 3 });
  assert.ok(reputation.profile('town', 100).score >= -100);
  assert.ok(reputation.profile('town', 100).score <= 100);
});

test('regional standing responds to repeated conduct and decays slowly', () => {
  const reputation = createPlayerReputation();
  for (let i = 0; i < 5; i++) reputation.record({ type: 'helpedWorker', region: 'west', time: i * 10, witnessed: true });
  assert.equal(reputation.profile('west', 50).standing, 'trusted');
  assert.ok(reputation.profile('west', 50).score > reputation.profile('west', 86400 * 10).score);
});

test('history is bounded, snapshots restore, and witness rolls are stable', () => {
  const reputation = createPlayerReputation({ seed: 'save-me', maxHistory: 3 });
  for (let i = 0; i < 8; i++) reputation.record({ type: 'completedJob', region: 'town', time: i });
  assert.equal(reputation.history().length, 3);
  const restored = createPlayerReputation({ seed: 'save-me', initialState: reputation.snapshot(), maxHistory: 3 });
  assert.deepEqual(restored.snapshot(), reputation.snapshot());
  assert.equal(conductRoll('same', 'witness'), conductRoll('same', 'witness'));
  assert.equal(restored.witnessChance({ region: 'town', eventType: 'collision', witnessId: 'ped-1' }), restored.witnessChance({ region: 'town', eventType: 'collision', witnessId: 'ped-1' }));
  assert.equal(restored.rules().moralityMeter, false);
});

test('unknown event types do not change state', () => {
  const reputation = createPlayerReputation();
  assert.equal(reputation.record({ type: 'invented' }), null);
  assert.equal(reputation.history().length, 0);
  assert.ok(CONDUCT_EVENTS.damagedProperty.weight < 0);
});
