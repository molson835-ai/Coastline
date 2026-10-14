// Coastline replayability engine: deterministic, data-driven, and cheap to evaluate.
// This module does not own rendering or persistence; the game shell can adapt those boundaries.

function hashText(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededUnit(seed, key = '') {
  let x = (hashText(seed) ^ hashText(key) ^ 0x9e3779b9) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export const ENCOUNTER_TEMPLATES = Object.freeze([
  Object.freeze({ id: 'stranded-driver', tags: ['roadside', 'human', 'help'], minHour: 5, maxHour: 23, weight: 1.2, cooldown: 900 }),
  Object.freeze({ id: 'odd-headlights', tags: ['night', 'suspense', 'vehicle'], minHour: 20, maxHour: 5, weight: 0.8, cooldown: 1500 }),
  Object.freeze({ id: 'wildlife-crossing', tags: ['woodland', 'wildlife', 'roadside'], minHour: 0, maxHour: 24, weight: 1.1, cooldown: 600 }),
  Object.freeze({ id: 'roadside-cache', tags: ['exploration', 'secret', 'reward'], minHour: 0, maxHour: 24, weight: 0.55, cooldown: 1800 }),
  Object.freeze({ id: 'unmarked-race', tags: ['driving', 'challenge', 'vehicle'], minHour: 18, maxHour: 2, weight: 0.65, cooldown: 1200 }),
  Object.freeze({ id: 'strange-radio', tags: ['mystery', 'audio', 'clue'], minHour: 0, maxHour: 24, weight: 0.45, cooldown: 2100 }),
]);

export function createWorldMemory(initial = {}) {
  const discoveries = new Set(initial.discoveries ?? []);
  const flags = new Map(Object.entries(initial.flags ?? {}));
  const relationships = new Map(Object.entries(initial.relationships ?? {}));
  const history = [...(initial.history ?? [])].slice(-100);
  return Object.freeze({
    hasDiscovered: id => discoveries.has(id),
    discover(id, detail = {}) {
      const fresh = !discoveries.has(id);
      discoveries.add(id);
      history.push({ type: 'discovery', id, ...detail });
      if (history.length > 100) history.shift();
      return fresh;
    },
    setFlag: (id, value = true) => flags.set(id, value),
    getFlag: (id, fallback = false) => flags.has(id) ? flags.get(id) : fallback,
    adjustRelationship(id, delta) {
      const value = Math.max(-100, Math.min(100, (relationships.get(id) ?? 0) + delta));
      relationships.set(id, value);
      return value;
    },
    relationship: id => relationships.get(id) ?? 0,
    record(type, detail = {}) {
      history.push({ type, ...detail });
      if (history.length > 100) history.shift();
    },
    snapshot: () => ({
      discoveries: [...discoveries],
      flags: Object.fromEntries(flags),
      relationships: Object.fromEntries(relationships),
      history: history.slice(-100),
    }),
  });
}

export function createEncounterDirector({ seed = 'coastline', templates = ENCOUNTER_TEMPLATES } = {}) {
  const lastTriggered = new Map();
  const seen = new Set();
  let serial = 0;
  return Object.freeze({
    evaluate(context = {}) {
      const hour = Number.isFinite(context.hour) ? context.hour : 12;
      const now = Number.isFinite(context.time) ? context.time : 0;
      const area = context.area ?? 'unknown';
      const weather = context.weather ?? 'clear';
      const discovered = new Set(context.discoveries ?? []);
      const candidates = [];
      for (const item of templates) {
        if (discovered.has(item.id)) continue;
        const last = lastTriggered.get(item.id);
        if (last !== undefined && now - last < item.cooldown) continue;
        const timeFits = item.minHour <= item.maxHour
          ? hour >= item.minHour && hour < item.maxHour
          : hour >= item.minHour || hour < item.maxHour;
        if (!timeFits) continue;
        const locationFit = !item.tags.includes('woodland') || /wood|creek|hill|trail/i.test(area);
        if (!locationFit) continue;
        let weight = item.weight;
        if (weather === 'fog' && item.tags.includes('suspense')) weight *= 1.7;
        if (weather === 'rain' && item.tags.includes('roadside')) weight *= 1.25;
        if (context.playerSpeed > 30 && item.tags.includes('exploration')) weight *= 0.35;
        const roll = seededUnit(seed, [item.id, area, Math.floor(now / 90), context.day ?? 1].join('|'));
        candidates.push({ item, score: roll / weight });
      }
      candidates.sort((a, b) => a.score - b.score);
      if (!candidates.length) return null;
      // Sparse triggers preserve quiet stretches and make unusual encounters feel unusual.
      const chance = Math.max(0.02, Math.min(0.45, context.encounterChance ?? 0.14));
      if (seededUnit(seed, `gate|${area}|${Math.floor(now / 30)}|${context.day ?? 1}`) > chance) return null;
      const chosen = candidates[0].item;
      lastTriggered.set(chosen.id, now);
      seen.add(chosen.id);
      serial += 1;
      return Object.freeze({ ...chosen, eventId: `${chosen.id}-${serial}`, area, weather, hour });
    },
    resetCooldown(id) { lastTriggered.delete(id); },
    seen: () => [...seen],
  });
}

export const MYSTERY_SEEDS = Object.freeze([
  Object.freeze({ id: 'creekside-lights', title: 'Lights Beyond the Creek', stages: Object.freeze([
    Object.freeze({ id: 'distant-glimmer', clue: 'A light appears where no road is marked.', unlock: 'listen-at-night' }),
    Object.freeze({ id: 'radio-fragment', clue: 'A broken radio repeats a road number.', unlock: 'follow-road-number' }),
    Object.freeze({ id: 'old-access-road', clue: 'A neglected access road hides behind the trees.', unlock: 'discover-hidden-place' }),
  ]) }),
  Object.freeze({ id: 'missing-mile-marker', title: 'The Missing Mile Marker', stages: Object.freeze([
    Object.freeze({ id: 'odd-marker', clue: 'One mile marker is newer than the road around it.', unlock: 'inspect-marker' }),
    Object.freeze({ id: 'handwritten-map', clue: 'A folded map points away from the highway.', unlock: 'find-turnoff' }),
    Object.freeze({ id: 'forgotten-overlook', clue: 'The turnoff ends at an overlook absent from local maps.', unlock: 'discover-overlook' }),
  ]) }),
]);

export function advanceMystery(mystery, completedStageIds = []) {
  if (!mystery?.stages?.length) return null;
  const completed = new Set(completedStageIds);
  const next = mystery.stages.find(stage => !completed.has(stage.id));
  return next ? Object.freeze({ mysteryId: mystery.id, title: mystery.title, ...next, stageIndex: mystery.stages.indexOf(next) }) : null;
}

export const RUMORS = Object.freeze([
  Object.freeze({ id: 'old-creek-road', line: 'My grandfather said there used to be a road along the creek.', tags: ['creek', 'road', 'secret'] }),
  Object.freeze({ id: 'late-night-racer', line: 'Some drivers only race after the shops close.', tags: ['night', 'race', 'driving'] }),
  Object.freeze({ id: 'radio-static', line: 'Sometimes the radio catches a voice between stations out by the hills.', tags: ['radio', 'hill', 'mystery'] }),
  Object.freeze({ id: 'strange-lights', line: 'I saw lights moving through the trees, but there was no car sound.', tags: ['woodland', 'night', 'suspense'] }),
]);

export function chooseRumor({ seed = 'coastline', npcId = 'local', area = 'town', heard = [] } = {}) {
  const available = RUMORS.filter(r => !heard.includes(r.id));
  if (!available.length) return null;
  return available[Math.floor(seededUnit(seed, `${npcId}|${area}`) * available.length)];
}

export function replayabilityRules() {
  return Object.freeze({
    design: 'curiosity-first, clues-not-checklists',
    eventCadence: 'sparse-and-context-sensitive',
    memory: 'player-actions-and-discoveries-persist-through-adapter',
    generation: 'seeded-recombination-of-authored-templates',
    suspense: 'ambiguity-with-fair-clues; quiet-is-valid',
    rewards: 'knowledge, shortcuts, encounters, challenges, places',
  });
}
