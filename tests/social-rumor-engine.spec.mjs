import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialRumorEngine, RUMOR_TOPICS, socialRoll } from '../social-rumor-engine.js';

const people = [
  { id: 'mara', name: 'Mara', region: 'main-street', sociability: 0.9, accuracy: 0.95, ties: { diner: 0.95, dispatcher: 0.9, mechanic: 0.85 } },
  { id: 'diner', name: 'Diner regular', region: 'main-street', sociability: 0.95, accuracy: 0.4, ties: { dispatcher: 0.95, mechanic: 0.9 } },
  { id: 'dispatcher', name: 'Radio dispatcher', region: 'main-street', sociability: 0.8, accuracy: 0.99, ties: { mechanic: 0.9 } },
  { id: 'mechanic', name: 'Mechanic', region: 'main-street', sociability: 0.9, accuracy: 0.55 },
  { id: 'creek-resident', name: 'Creek resident', region: 'creek-road', sociability: 0.95, accuracy: 0.6 },
];

test('rumor rolls and observation records are deterministic', () => {
  assert.equal(socialRoll('seed', 'signal'), socialRoll('seed', 'signal'));
  const world = createSocialRumorEngine({ seed: 'town-1', people });
  const rumor = world.observe({ topic: 'signalOutage', personId: 'mara', time: 10, location: 'Main Street' });
  assert.equal(rumor.topic, 'signalOutage');
  assert.equal(world.knowledge('mara').signalOutage.claim, RUMOR_TOPICS.signalOutage.trueClaim);
  assert.equal(world.knowledge('dispatcher').signalOutage, undefined);
});

test('rumors spread through local relationships with bounded work and imperfect retellings', () => {
  const world = createSocialRumorEngine({ seed: 'town-social-test', people });
  const rumor = world.observe({ topic: 'signalOutage', personId: 'mara', time: 10, location: 'Main Street' });
  const result = world.step({ time: 60, maxTransfers: 20 });
  assert.ok(result.transfers > 0);
  assert.ok(result.transfers <= 20);
  assert.ok(world.rumors()[0].history.length > 1);
  assert.equal(world.knowledge('creek-resident').signalOutage, undefined, 'rumors should not teleport between disconnected regions');
  assert.ok(world.snapshot().people.some(person => person.id === 'dispatcher'));
  assert.ok(rumor.id.startsWith('rumor-'));
});

test('social memory survives a snapshot restore and the transfer budget is respected', () => {
  const world = createSocialRumorEngine({ seed: 'save-social', people });
  world.observe({ topic: 'wildlifeCrossing', personId: 'mara', time: 2 });
  world.step({ time: 40, maxTransfers: 2 });
  const restored = createSocialRumorEngine({ seed: 'save-social', initialState: world.snapshot() });
  assert.deepEqual(restored.snapshot(), world.snapshot());
  assert.equal(restored.rules().noGlobalOmniscience, true);
  assert.equal(restored.step({ time: 100, maxTransfers: 1 }).transfers <= 1, true);
});

test('evicting an old rumor clears knowledge for the evicted topic only', () => {
  const world = createSocialRumorEngine({ people, maxRumors: 1 });
  world.observe({ topic: 'signalOutage', personId: 'mara', time: 1 });
  world.observe({ topic: 'wildlifeCrossing', personId: 'diner', time: 2 });
  assert.equal(world.rumors().length, 1);
  assert.equal(world.knowledge('mara').signalOutage, undefined);
  assert.ok(world.knowledge('diner').wildlifeCrossing);
});

test('invalid sources and topics are safely ignored', () => {
  const world = createSocialRumorEngine({ people });
  assert.equal(world.observe({ topic: 'unknown', personId: 'mara' }), null);
  assert.equal(world.observe({ topic: 'signalOutage', personId: 'missing' }), null);
  assert.equal(world.share({ rumorId: 'missing', fromId: 'mara', toId: 'diner' }), null);
});

test('player conduct rumors have grounded claims and can be learned by witnesses', () => {
  const world = createSocialRumorEngine({ seed: 'conduct-rumors', people });
  const reckless = world.observe({ topic: 'recklessDriving', personId: 'mara', time: 10, location: 'Main Street' });
  assert.equal(reckless.claim, RUMOR_TOPICS.recklessDriving.trueClaim);
  const helpful = world.observe({ topic: 'helpfulDriver', personId: 'diner', time: 20, location: 'Main Street' });
  assert.equal(helpful.claim, RUMOR_TOPICS.helpfulDriver.trueClaim);
  const damage = world.observe({ topic: 'propertyDamage', personId: 'dispatcher', time: 30, location: 'Main Street' });
  assert.equal(damage.claim, RUMOR_TOPICS.propertyDamage.trueClaim);
  assert.ok(world.knowledge('dispatcher').propertyDamage);
  assert.equal(world.rules().noGlobalOmniscience, true);
});
