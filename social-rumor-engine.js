// Coastline social knowledge simulation: rumors move through relationships,
// decay with time, and may lose confidence or accuracy as they are retold.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function hash(value) {
  let h = 2166136261;
  for (const ch of String(value ?? '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function socialRoll(seed, key) {
  let x = (hash(seed) ^ hash(key) ^ 0x85ebca6b) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
export const RUMOR_TOPICS = Object.freeze({
  signalOutage: Object.freeze({ title: 'Main Street signal failure', trueClaim: 'A traffic signal failed and a public-works technician repaired it.', distortedClaim: 'Someone tampered with the Main Street signal.', category: 'civic' }),
  strangeHeadlights: Object.freeze({ title: 'Headlights after dark', trueClaim: 'A driver reported headlights following them along the creek road.', distortedClaim: 'An unmarked car is watching people near the creek.', category: 'mystery' }),
  wildlifeCrossing: Object.freeze({ title: 'Wildlife near the road', trueClaim: 'A deer crossed near the wooded road.', distortedClaim: 'Something large was moving beside the road at night.', category: 'wildlife' }),
  emergencyCall: Object.freeze({ title: 'Late-night emergency call', trueClaim: 'An ambulance answered a late-night call.', distortedClaim: 'Something serious happened on the east side.', category: 'emergency' }),
});
function normalizePerson(person = {}) {
  return {
    id: String(person.id ?? 'person-' + hash(JSON.stringify(person))),
    name: String(person.name ?? 'Local resident'),
    region: String(person.region ?? 'town'),
    ties: { ...(person.ties ?? {}) },
    accuracy: clamp(Number(person.accuracy ?? 0.7), 0, 1),
    sociability: clamp(Number(person.sociability ?? 0.5), 0, 1),
    knowledge: { ...(person.knowledge ?? {}) },
    lastShared: { ...(person.lastShared ?? {}) },
  };
}
export function createSocialRumorEngine({ seed = 'coastline-rumors-v1', people = [], initialState = {}, maxRumors = 80 } = {}) {
  const roster = new Map();
  for (const person of [...(initialState.people ?? []), ...people]) {
    const normalized = normalizePerson(person);
    if (!roster.has(normalized.id) || people.some(p => String(p.id) === normalized.id)) roster.set(normalized.id, normalized);
  }
  const rumors = [...(initialState.rumors ?? [])].slice(-Math.max(1, maxRumors)).map(r => ({ ...r, history: [...(r.history ?? [])] }));
  let serial = Math.max(Number(initialState.serial) || 0, rumors.reduce((m, r) => Math.max(m, Number(String(r.id).match(/(\d+)$/)?.[1]) || 0), 0));
  const seen = new Set(rumors.map(r => r.id));
  function person(id) { return roster.get(String(id)); }
  function addRumor({ topic, sourceId, time = 0, confidence = 0.8, claim = 'uncertain report', location = 'town', evidence = 'hearsay', id }) {
    if (!RUMOR_TOPICS[topic] || !person(sourceId)) return null;
    const rumorId = String(id ?? 'rumor-' + (++serial));
    if (seen.has(rumorId)) return rumors.find(r => r.id === rumorId) ?? null;
    const source = person(sourceId);
    const rumor = { id: rumorId, topic, sourceId: source.id, location: String(location), claim: String(claim), evidence, confidence: clamp(confidence, 0, 1), createdAt: Number(time) || 0, lastSpreadAt: Number(time) || 0, history: [{ personId: source.id, time: Number(time) || 0, confidence: clamp(confidence, 0, 1), claim: String(claim), evidence }] };
    rumors.push(rumor); seen.add(rumorId);
    source.knowledge[topic] = { rumorId, confidence: rumor.confidence, claim: rumor.claim, learnedAt: rumor.createdAt, sourceId: source.id };
    if (rumors.length > maxRumors) { const removed = rumors.shift(); seen.delete(removed.id); for (const p of roster.values()) if (p.knowledge[topic]?.rumorId === removed.id) delete p.knowledge[topic]; }
    return { ...rumor, history: rumor.history.map(x => ({ ...x })) };
  }
  return Object.freeze({
    addPerson(definition) { const p = normalizePerson(definition); if (roster.has(p.id)) return false; roster.set(p.id, p); return true; },
    observe({ topic, personId, time = 0, confidence = 0.9, evidence = 'direct', location = 'town' } = {}) {
      const p = person(personId), details = RUMOR_TOPICS[topic];
      if (!p || !details) return null;
      const directConfidence = evidence === 'direct' ? confidence : confidence * 0.78;
      return addRumor({ topic, sourceId: personId, time, confidence: directConfidence, claim: details.trueClaim, location, evidence });
    },
    share({ rumorId, fromId, toId, time = 0 } = {}) {
      const rumor = rumors.find(r => r.id === rumorId), from = person(fromId), to = person(toId);
      if (!rumor || !from || !to || from.id === to.id || from.region !== to.region) return null;
      const knowledge = from.knowledge[rumor.topic];
      if (!knowledge || knowledge.rumorId !== rumor.id) return null;
      const tie = clamp(Number(from.ties[to.id] ?? to.ties[from.id] ?? 0.45), 0, 1);
      const cooldown = Number(from.lastShared[rumor.id] ?? -Infinity);
      if ((Number(time) || 0) - cooldown < 30) return null;
      const spreadChance = 0.15 + from.sociability * 0.4 + tie * 0.35;
      if (socialRoll(seed, [rumor.id, from.id, to.id, Math.floor((Number(time) || 0) / 30)].join('|')) > spreadChance) return null;
      const distortionRoll = socialRoll(seed, [rumor.id, from.id, to.id, 'distortion'].join('|'));
      const distortionThreshold = clamp(0.12 + (1 - from.accuracy) * 0.58 + (1 - tie) * 0.2, 0.05, 0.85);
      const distorted = distortionRoll < distortionThreshold;
      const confidence = clamp(knowledge.confidence * (distorted ? 0.72 : 0.91), 0.05, 1);
      const claim = distorted ? RUMOR_TOPICS[rumor.topic].distortedClaim : knowledge.claim;
      const existing = to.knowledge[rumor.topic];
      if (existing && existing.confidence >= confidence) { from.lastShared[rumor.id] = Number(time) || 0; return null; }
      to.knowledge[rumor.topic] = { rumorId: rumor.id, confidence, claim, learnedAt: Number(time) || 0, sourceId: from.id, distorted };
      rumor.history.push({ personId: to.id, fromId: from.id, time: Number(time) || 0, confidence, claim, evidence: distorted ? 'distorted-retelling' : 'retold' });
      if (rumor.history.length > 100) rumor.history.shift();
      rumor.lastSpreadAt = Number(time) || 0;
      from.lastShared[rumor.id] = Number(time) || 0;
      return { rumorId: rumor.id, fromId: from.id, toId: to.id, confidence, claim, distorted };
    },
    step({ time = 0, maxTransfers = 4 } = {}) {
      let transfers = 0;
      const candidates = [...rumors].sort((a, b) => a.lastSpreadAt - b.lastSpreadAt || a.id.localeCompare(b.id));
      for (const rumor of candidates) {
        const carriers = [...roster.values()].filter(p => p.knowledge[rumor.topic]?.rumorId === rumor.id).sort((a, b) => a.id.localeCompare(b.id));
        for (const from of carriers) {
          for (const to of roster.values()) {
            if (transfers >= Math.max(0, Math.floor(maxTransfers))) break;
            if (from.id === to.id || from.region !== to.region || to.knowledge[rumor.topic]?.rumorId === rumor.id) continue;
            if (this.share({ rumorId: rumor.id, fromId: from.id, toId: to.id, time })) transfers++;
          }
          if (transfers >= Math.max(0, Math.floor(maxTransfers))) break;
        }
        if (transfers >= Math.max(0, Math.floor(maxTransfers))) break;
      }
      return { transfers, people: roster.size, rumors: rumors.length };
    },
    knowledge(personId) { const p = person(personId); return p ? Object.fromEntries(Object.entries(p.knowledge).map(([k, v]) => [k, { ...v }])) : {}; },
    rumors() { return rumors.map(r => ({ ...r, history: r.history.map(x => ({ ...x })) })); },
    snapshot() { return { version: 1, seed, serial, people: [...roster.values()].map(p => ({ ...p, ties: { ...p.ties }, knowledge: { ...p.knowledge }, lastShared: { ...p.lastShared } })), rumors: rumors.map(r => ({ ...r, history: r.history.map(x => ({ ...x })) })) }; },
    rules() { return Object.freeze({ version: 1, deterministic: true, maxTransfersPerStep: 'caller bounded', informationModel: 'person-specific knowledge with confidence and possible distortion', noGlobalOmniscience: true }); },
  });
}
