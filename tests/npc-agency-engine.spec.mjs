import test from 'node:test';
import assert from 'node:assert/strict';
import { createNpcAgency, NPC_ROLES, NPC_STORY_ARCS, npcRoll } from '../npc-agency-engine.js';

test('NPC identity and deterministic rolls are stable', () => {
  assert.equal(npcRoll('seed', 'npc-1'), npcRoll('seed', 'npc-1'));
  const world = createNpcAgency({ seed: 'save-a', definitions: [{ id: 'worker-1', name: 'Mara', role: 'publicWorks' }] });
  assert.equal(world.agent('worker-1').name, 'Mara');
  assert.equal(world.agent('worker-1').role, 'publicWorks');
});

test('role schedules produce believable work actions at different times', () => {
  const world = createNpcAgency({ definitions: [
    { id: 'worker', role: 'publicWorks' },
    { id: 'sanitation', role: 'sanitation' },
    { id: 'resident', role: 'resident' },
  ] });
  world.step({ time: 1, hour: 9, maxAgents: 3, deltaHours: 0 });
  assert.equal(world.agent('worker').action, 'repair_infrastructure');
  assert.equal(world.agent('sanitation').action, 'collect_waste');
  world.step({ time: 2, hour: 22, maxAgents: 3, deltaHours: 0 });
  assert.equal(world.agent('resident').action, 'rest');
});

test('world events change NPC behavior and can advance a personal story arc', () => {
  const world = createNpcAgency({ definitions: [
    { id: 'worker', role: 'publicWorks', arcId: 'signalOutage' },
    { id: 'medic', role: 'paramedic', arcId: 'paramedicStrain' },
    { id: 'mechanic', role: 'mechanic', arcId: 'garageDebt' },
    { id: 'driver', role: 'suspiciousDriver', arcId: 'nightRoute' },
  ] });
  world.publishEvent({ id: 'signal-1', type: 'signal_outage', targetNpc: 'worker', time: 10, location: 'main-street' });
  world.step({ time: 10, hour: 10, maxAgents: 4, deltaHours: 0 });
  assert.equal(world.agent('worker').action, 'repair_infrastructure');
  assert.equal(world.agent('worker').arcStage, 1);
  assert.ok(world.outcomes().some(event => event.type === 'worker_noticed_signal'));

  world.publishEvent({ id: 'emergency-1', type: 'emergency', time: 11, severity: 2 });
  assert.equal(world.agent('medic').action, 'respond_to_emergency');
  assert.ok(world.agent('medic').memory.some(item => item.type === 'emergency_dispatched'));

  world.publishEvent({ id: 'debt-1', type: 'customer_debt', targetNpc: 'mechanic', time: 12 });
  world.step({ time: 12, hour: 12, maxAgents: 4, deltaHours: 0 });
  assert.equal(world.agent('mechanic').arcStage, 1);

  world.publishEvent({ id: 'sighting-1', type: 'night_sighting', targetNpc: 'driver', time: 13 });
  world.step({ time: 13, hour: 22, maxAgents: 4, deltaHours: 0 });
  assert.equal(world.agent('driver').arcStage, 1);
});

test('meaningful player interaction changes relationship and bounded memory', () => {
  const world = createNpcAgency({ definitions: [{ id: 'neighbor', role: 'resident', relationships: { player: 0 } }], maxMemory: 3 });
  world.publishEvent({ id: 'help-1', type: 'player_helped_npc', targetNpc: 'neighbor', time: 1 });
  assert.equal(world.agent('neighbor').relationships.player, 12);
  for (let i = 0; i < 10; i++) world.publishEvent({ id: 'story-' + i, type: 'small_event', targetNpc: 'neighbor', time: i + 2 });
  assert.ok(world.agent('neighbor').memory.length <= 3);
});

test('decision budget bounds work and snapshot can restore agent state', () => {
  const definitions = Array.from({ length: 30 }, (_, i) => ({ id: 'npc-' + i, role: 'resident' }));
  const world = createNpcAgency({ seed: 'bounded', definitions });
  const result = world.step({ time: 5, hour: 14, maxAgents: 7 });
  assert.equal(result.processed, 7);
  assert.equal(result.changed.length, 7);
  const restored = createNpcAgency({ seed: 'bounded', initialState: world.snapshot() });
  assert.equal(restored.agents().length, 30);
  assert.deepEqual(restored.agent('npc-0'), world.agent('npc-0'));
  assert.equal(world.rules().decisionBudget, 'bounded actors per step; no per-render-frame language-model calls');
});

test('role and story catalogs are data-driven and frozen', () => {
  assert.ok(Object.isFrozen(NPC_ROLES.publicWorks.routine));
  assert.equal(NPC_STORY_ARCS.nightRoute.stages.length, 3);
});
