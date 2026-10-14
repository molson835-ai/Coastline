// Player conduct is a persistent, regional behavioral profile—not a morality meter.
// Events decay slowly and are capped; callers own witness selection and visible consequences.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = value => { let h = 2166136261; for (const ch of String(value ?? '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function conductRoll(seed, key) {
  let x = (hash(seed) ^ hash(key) ^ 0x27d4eb2d) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
export const CONDUCT_EVENTS = Object.freeze({
  collision: Object.freeze({ tag: 'reckless', weight: -8, label: 'caused a collision' }),
  nearMiss: Object.freeze({ tag: 'reckless', weight: -3, label: 'nearly caused a collision' }),
  speeding: Object.freeze({ tag: 'reckless', weight: -2, label: 'drove dangerously fast' }),
  helpedWorker: Object.freeze({ tag: 'helpful', weight: 8, label: 'helped a local worker' }),
  completedJob: Object.freeze({ tag: 'reliable', weight: 5, label: 'completed a local job' }),
  damagedProperty: Object.freeze({ tag: 'careless', weight: -6, label: 'damaged public property' }),
  repairedProperty: Object.freeze({ tag: 'helpful', weight: 6, label: 'helped repair public property' }),
});
export function createPlayerReputation({ seed = 'coastline-conduct-v1', initialState = {}, maxHistory = 100 } = {}) {
  const regions = new Map(Object.entries(initialState.regions ?? {}).map(([key, value]) => [key, { score: clamp(Number(value.score) || 0, -100, 100), traits: { ...(value.traits ?? {}) }, lastEventAt: Number(value.lastEventAt) || 0 }]));
  const history = [...(initialState.history ?? [])].slice(-Math.max(1, maxHistory));
  let serial = Math.max(Number(initialState.serial) || 0, history.reduce((m, e) => Math.max(m, Number(String(e.id).match(/(\d+)$/)?.[1]) || 0), 0));
  function region(id = 'town') {
    const key = String(id || 'town');
    if (!regions.has(key)) regions.set(key, { score: 0, traits: {}, lastEventAt: 0 });
    return regions.get(key);
  }
  function decay(entry, time) {
    const elapsedDays = Math.max(0, (Number(time) - entry.lastEventAt) / 86400);
    if (elapsedDays > 0) entry.score *= Math.pow(0.985, elapsedDays);
    entry.lastEventAt = Math.max(entry.lastEventAt, Number(time) || 0);
  }
  return Object.freeze({
    record({ type, region: regionId = 'town', time = 0, severity = 1, witnessed = true, source = 'world', detail = {} } = {}) {
      const rule = CONDUCT_EVENTS[type];
      if (!rule) return null;
      const key = String(regionId || 'town'), entry = region(key), now = Number(time) || 0;
      decay(entry, now);
      const strength = clamp(Number(severity) || 1, 0.25, 3);
      const witnessedWeight = witnessed ? 1 : 0.25;
      const delta = clamp(rule.weight * strength * witnessedWeight, -20, 20);
      entry.score = clamp(entry.score + delta, -100, 100);
      entry.traits[rule.tag] = clamp((entry.traits[rule.tag] ?? 0) + Math.abs(delta), 0, 100);
      const event = { id: 'conduct-' + (++serial), type, region: key, time: now, severity: strength, witnessed: Boolean(witnessed), source, delta: Number(delta.toFixed(2)), score: Number(entry.score.toFixed(2)), detail: { ...detail }, label: rule.label };
      history.push(event); if (history.length > maxHistory) history.shift();
      return { ...event, detail: { ...event.detail } };
    },
    score(regionId = 'town', time = 0) { const entry = region(regionId); decay(entry, Number(time) || 0); return Number(entry.score.toFixed(2)); },
    profile(regionId = 'town', time = 0) {
      const entry = region(regionId); decay(entry, Number(time) || 0);
      const score = Number(entry.score.toFixed(2));
      return { region: String(regionId || 'town'), score, traits: { ...entry.traits }, standing: score >= 25 ? 'trusted' : score <= -25 ? 'wary' : 'unknown', tendencies: Object.keys(entry.traits).sort((a, b) => entry.traits[b] - entry.traits[a]).slice(0, 3) };
    },
    witnessChance({ region: regionId = 'town', eventType = 'collision', witnessId = 'ambient', visibility = 1 } = {}) {
      const profile = this.profile(regionId);
      const base = eventType === 'helpedWorker' || eventType === 'repairedProperty' ? 0.58 : 0.72;
      const visibilityFactor = clamp(Number(visibility) || 0, 0, 1);
      return clamp((base + (profile.score < -20 ? 0.08 : 0) + conductRoll(seed, [regionId, eventType, witnessId].join('|')) * 0.16) * visibilityFactor, 0, 1);
    },
    history() { return history.map(event => ({ ...event, detail: { ...event.detail } })); },
    snapshot() { return { version: 1, seed, serial, regions: Object.fromEntries([...regions].map(([key, value]) => [key, { score: value.score, traits: { ...value.traits }, lastEventAt: value.lastEventAt }])), history: this.history() }; },
    rules() { return Object.freeze({ version: 1, regionalReputation: true, eventHistoryBound: maxHistory, scoreRange: [-100, 100], decay: 'slow exponential; recent actions matter more', moralityMeter: false }); },
  });
}
