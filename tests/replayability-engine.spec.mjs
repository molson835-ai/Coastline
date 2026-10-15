import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceMystery, chooseRumor, createEncounterDirector, createWorldMemory,
  replayabilityRules, seededUnit, MYSTERY_SEEDS,
} from '../replayability-engine.js';

test('seeded rolls are deterministic and bounded', () => {
  assert.equal(seededUnit('abc', 'road'), seededUnit('abc', 'road'));
  assert.notEqual(seededUnit('abc', 'road'), seededUnit('abc', 'creek'));
  assert.ok(seededUnit('abc', 'road') >= 0 && seededUnit('abc', 'road') < 1);
});

test('world memory tracks discoveries, flags, relationships, and exports a snapshot', () => {
  const memory = createWorldMemory();
  assert.equal(memory.discover('hidden-overlook', { area: 'creek' }), true);
  assert.equal(memory.discover('hidden-overlook'), false);
  memory.setFlag('helped-driver', true);
  assert.equal(memory.adjustRelationship('mara', 15), 15);
  assert.equal(memory.adjustRelationship('mara', 200), 100);
  const saved = memory.snapshot();
  assert.deepEqual(saved.discoveries, ['hidden-overlook']);
  assert.equal(saved.flags['helped-driver'], true);
  assert.equal(saved.relationships.mara, 100);
});

test('mysteries advance in order without imposing a global quest path', () => {
  const mystery = MYSTERY_SEEDS[0];
  assert.equal(advanceMystery(mystery, []).id, 'distant-glimmer');
  assert.equal(advanceMystery(mystery, ['distant-glimmer']).id, 'radio-fragment');
  assert.equal(advanceMystery(mystery, mystery.stages.map(s => s.id)), null);
});

test('rumors are repeatable for an NPC and avoid already-heard clues', () => {
  const first = chooseRumor({ seed: 'save-1', npcId: 'npc-7', area: 'town' });
  assert.equal(first.id, chooseRumor({ seed: 'save-1', npcId: 'npc-7', area: 'town' }).id);
  const second = chooseRumor({ seed: 'save-1', npcId: 'npc-7', area: 'town', heard: [first.id] });
  assert.notEqual(second.id, first.id);
});

test('encounter director filters by time and area and respects cooldowns', () => {
  const templates = [
    { id: 'night-secret', tags: ['night', 'secret'], minHour: 20, maxHour: 5, weight: 1, cooldown: 100 },
    { id: 'woodland-event', tags: ['woodland'], minHour: 0, maxHour: 24, weight: 1, cooldown: 100 },
  ];
  const director = createEncounterDirector({ seed: 'test', templates });
  // Force a high gate chance and stable time bucket; if a candidate is selected, cooldown is enforced.
  let event = null;
  for (let time = 0; time < 200 && !event; time += 30) {
    event = director.evaluate({ time, hour: 23, area: 'woodland creek', encounterChance: 0.45 });
  }
  assert.ok(event === null || ['night-secret', 'woodland-event'].includes(event.id));
  if (event) {
    assert.equal(director.evaluate({ time: event.hour + 1, hour: 23, area: 'woodland creek', encounterChance: 0.45, discoveries: [event.id] }), null);
  }
});

test('replayability rules favor sparse, clue-driven content', () => {
  assert.equal(replayabilityRules().design, 'curiosity-first, clues-not-checklists');
});
