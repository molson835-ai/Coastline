// Coastline Living Characters: deterministic NPC agency, memory, and story arcs.
// This is a simulation layer, not a language-model dependency. Rendering, navigation,
// collision, dialogue presentation, and persistence remain owned by the host game.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hash = value => {
  let h = 2166136261;
  for (const ch of String(value ?? '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
export function npcRoll(seed, key) {
  let x = (hash(seed) ^ hash(key) ^ 0x9e3779b9) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export const NPC_ROLES = Object.freeze({
  publicWorks: Object.freeze({
    title: 'Public works technician', routine: Object.freeze([
      Object.freeze({ start: 6, end: 8, action: 'commute' }),
      Object.freeze({ start: 8, end: 12, action: 'repair_infrastructure' }),
      Object.freeze({ start: 12, end: 13, action: 'break' }),
      Object.freeze({ start: 13, end: 17, action: 'repair_infrastructure' }),
      Object.freeze({ start: 17, end: 21, action: 'personal_time' }),
      Object.freeze({ start: 21, end: 6, action: 'rest' }),
    ]),
    goals: Object.freeze(['finish_shift', 'keep_coworkers_safe', 'get_home']),
  }),
  paramedic: Object.freeze({
    title: 'Paramedic', routine: Object.freeze([
      Object.freeze({ start: 0, end: 24, action: 'standby' }),
    ]),
    goals: Object.freeze(['respond_to_emergency', 'protect_partner', 'recover']),
  }),
  sanitation: Object.freeze({
    title: 'Sanitation worker', routine: Object.freeze([
      Object.freeze({ start: 4, end: 11, action: 'collect_waste' }),
      Object.freeze({ start: 11, end: 12, action: 'break' }),
      Object.freeze({ start: 12, end: 13, action: 'finish_route' }),
      Object.freeze({ start: 13, end: 20, action: 'personal_time' }),
      Object.freeze({ start: 20, end: 4, action: 'rest' }),
    ]),
    goals: Object.freeze(['finish_route', 'help_neighbor', 'get_home']),
  }),
  mechanic: Object.freeze({
    title: 'Local mechanic', routine: Object.freeze([
      Object.freeze({ start: 7, end: 18, action: 'repair_vehicles' }),
      Object.freeze({ start: 18, end: 22, action: 'socialize' }),
      Object.freeze({ start: 22, end: 7, action: 'rest' }),
    ]),
    goals: Object.freeze(['earn_trust', 'repair_customer_vehicle', 'protect_shop']),
  }),
  resident: Object.freeze({
    title: 'Resident', routine: Object.freeze([
      Object.freeze({ start: 7, end: 9, action: 'morning_routine' }),
      Object.freeze({ start: 9, end: 17, action: 'work_or_errands' }),
      Object.freeze({ start: 17, end: 21, action: 'socialize' }),
      Object.freeze({ start: 21, end: 7, action: 'rest' }),
    ]),
    goals: Object.freeze(['maintain_relationships', 'meet_personal_goal', 'stay_safe']),
  }),
  suspiciousDriver: Object.freeze({
    title: 'Unsettled driver', routine: Object.freeze([
      Object.freeze({ start: 0, end: 5, action: 'avoid_attention' }),
      Object.freeze({ start: 5, end: 18, action: 'lay_low' }),
      Object.freeze({ start: 18, end: 24, action: 'move_between_areas' }),
    ]),
    goals: Object.freeze(['avoid_detection', 'settle_debt', 'take_risk']),
  }),
});

export const NPC_STORY_ARCS = Object.freeze({
  signalOutage: Object.freeze({
    id: 'signalOutage', title: 'The Broken Signal', role: 'publicWorks',
    stages: Object.freeze([
      Object.freeze({ id: 'notice_failure', when: 'signal_outage', outcome: 'worker_noticed_signal' }),
      Object.freeze({ id: 'missed_parts', when: 'parts_delayed', outcome: 'repair_delayed' }),
      Object.freeze({ id: 'restore_signal', when: 'parts_arrived', outcome: 'signal_restored' }),
    ]),
  }),
  paramedicStrain: Object.freeze({
    id: 'paramedicStrain', title: 'One More Call', role: 'paramedic',
    stages: Object.freeze([
      Object.freeze({ id: 'long_shift', when: 'emergency_chain', outcome: 'paramedic_exhausted' }),
      Object.freeze({ id: 'ask_for_help', when: 'player_or_partner_help', outcome: 'paramedic_supported' }),
      Object.freeze({ id: 'recovery', when: 'rest_period', outcome: 'paramedic_recovered' }),
    ]),
  }),
  garageDebt: Object.freeze({
    id: 'garageDebt', title: 'The Garage Ledger', role: 'mechanic',
    stages: Object.freeze([
      Object.freeze({ id: 'overdue_bill', when: 'customer_debt', outcome: 'mechanic_under_pressure' }),
      Object.freeze({ id: 'offer_work', when: 'player_offers_help', outcome: 'mechanic_trusts_player' }),
      Object.freeze({ id: 'pay_it_forward', when: 'repair_completed', outcome: 'free_repair_available' }),
    ]),
  }),
  nightRoute: Object.freeze({
    id: 'nightRoute', title: 'The Long Way Home', role: 'suspiciousDriver',
    stages: Object.freeze([
      Object.freeze({ id: 'unusual_route', when: 'night_sighting', outcome: 'route_pattern_noticed' }),
      Object.freeze({ id: 'evidence', when: 'evidence_found', outcome: 'driver_exposed_or_cleared' }),
      Object.freeze({ id: 'consequence', when: 'case_resolved', outcome: 'area_danger_changed' }),
    ]),
  }),
});

function scheduleAction(role, hour) {
  const schedule = NPC_ROLES[role]?.routine ?? NPC_ROLES.resident.routine;
  return schedule.find(slot => slot.start < slot.end
    ? hour >= slot.start && hour < slot.end
    : hour >= slot.start || hour < slot.end)?.action ?? 'personal_time';
}

function normalizeAgent(definition) {
  const role = NPC_ROLES[definition.role] ? definition.role : 'resident';
  const traits = { conscientiousness: 0.5, sociability: 0.5, courage: 0.5, riskTolerance: 0.5, ...(definition.traits ?? {}) };
  for (const key of Object.keys(traits)) traits[key] = clamp(Number(traits[key]) || 0, 0, 1);
  return {
    id: String(definition.id), name: String(definition.name ?? definition.id), role,
    home: definition.home ?? null, workplace: definition.workplace ?? null,
    traits, needs: { rest: 0.2, safety: 0.1, belonging: 0.3, purpose: 0.25, ...(definition.needs ?? {}) },
    relationships: { ...(definition.relationships ?? {}) },
    arcId: definition.arcId && NPC_STORY_ARCS[definition.arcId] ? definition.arcId : null,
    arcStage: Math.max(0, Number(definition.arcStage) || 0),
    state: definition.state ?? 'living',
    action: definition.action ?? 'personal_time',
    memory: [...(definition.memory ?? [])].slice(-24),
    flags: { ...(definition.flags ?? {}) },
    lastDecisionAt: Number.isFinite(definition.lastDecisionAt) ? definition.lastDecisionAt : -Infinity,
    x: Number(definition.x) || 0, z: Number(definition.z) || 0,
  };
}

function publicAgent(agent) {
  return {
    id: agent.id, name: agent.name, role: agent.role, home: agent.home, workplace: agent.workplace,
    traits: { ...agent.traits }, needs: { ...agent.needs }, relationships: { ...agent.relationships },
    arcId: agent.arcId, arcStage: agent.arcStage, state: agent.state, action: agent.action,
    memory: agent.memory.map(item => ({ ...item })), flags: { ...agent.flags },
    lastDecisionAt: agent.lastDecisionAt, x: agent.x, z: agent.z,
  };
}

export function createNpcAgency({ seed = 'coastline-npc-v1', definitions = [], initialState = {}, maxMemory = 24 } = {}) {
  const agents = new Map();
  for (const definition of definitions) agents.set(String(definition.id), normalizeAgent(definition));
  for (const saved of initialState.agents ?? []) agents.set(String(saved.id), normalizeAgent(saved));
  const worldEvents = [...(initialState.events ?? [])].slice(-100);
  const eventIds = new Set(worldEvents.map(event => event.id).filter(Boolean));
  const outcomes = [...(initialState.outcomes ?? [])].slice(-100);
  let eventSerial = worldEvents.length;

  function remember(agent, type, detail = {}, time = 0) {
    agent.memory.push({ type, time, ...detail });
    if (agent.memory.length > maxMemory) agent.memory.splice(0, agent.memory.length - maxMemory);
  }
  function emit(type, detail = {}, time = 0) {
    const event = Object.freeze({ id: 'npc-world-' + (++eventSerial), type, time, ...detail });
    worldEvents.push(event);
    if (worldEvents.length > 100) worldEvents.shift();
    eventIds.add(event.id);
    outcomes.push(event);
    if (outcomes.length > 100) outcomes.shift();
    return event;
  }
  function applyEvent(event) {
    for (const agent of agents.values()) {
      if (event.targetNpc && event.targetNpc !== agent.id) continue;
      if (event.type === 'player_helped_npc' && event.targetNpc === agent.id) {
        agent.relationships.player = clamp((agent.relationships.player ?? 0) + 12, -100, 100);
        agent.needs.belonging = clamp(agent.needs.belonging - 0.12, 0, 1);
        remember(agent, 'player_helped', { eventId: event.id }, event.time);
      }
      if (event.type === 'emergency' && agent.role === 'paramedic') {
        agent.flags.emergency_chain = true;
        agent.action = 'respond_to_emergency';
        agent.flags.activeEmergency = event.id;
        remember(agent, 'emergency_dispatched', { eventId: event.id, severity: event.severity ?? 1 }, event.time);
      }
      if (event.type === 'signal_outage' && agent.role === 'publicWorks') {
        agent.flags.signal_outage = true;
        agent.flags.signalOutage = true;
        remember(agent, 'infrastructure_failure', { location: event.location ?? 'unknown' }, event.time);
      }
      if (event.type === 'parts_delayed' && agent.role === 'publicWorks') agent.flags.parts_delayed = true;
      if (event.type === 'parts_arrived' && agent.role === 'publicWorks') agent.flags.parts_arrived = true;
      if (event.type === 'parts_arrived' && agent.flags.signalOutage) {
        agent.flags.signalOutage = false;
        remember(agent, 'repair_materials_arrived', { eventId: event.id }, event.time);
        emit('signal_restored', { sourceNpc: agent.id, location: event.location ?? 'unknown' }, event.time);
      }
      if (event.type === 'customer_debt' && agent.role === 'mechanic') agent.flags.customer_debt = true;
      if (event.type === 'player_offers_help' && agent.role === 'mechanic') agent.flags.player_offers_help = true;
      if (event.type === 'repair_completed' && agent.role === 'mechanic') agent.flags.repair_completed = true;
      if (event.type === 'player_helped_npc' && agent.role === 'paramedic' && event.targetNpc === agent.id) agent.flags.player_or_partner_help = true;
      if (event.type === 'rest_period' && agent.role === 'paramedic') agent.flags.rest_period = true;
      if (event.type === 'night_sighting' && agent.role === 'suspiciousDriver') agent.flags.night_sighting = true;
      if (event.type === 'evidence_found' && agent.role === 'suspiciousDriver') agent.flags.evidence_found = true;
      if (event.type === 'case_resolved' && agent.role === 'suspiciousDriver') agent.flags.case_resolved = true;
      if (event.type === 'vehicle_breakdown' && agent.role === 'mechanic') {
        agent.flags.pendingRepair = event.vehicleId ?? event.id;
        remember(agent, 'repair_opportunity', { vehicleId: agent.flags.pendingRepair }, event.time);
      }
      if (event.type === 'crime_report' && agent.role === 'suspiciousDriver') {
        agent.flags.pressure = clamp((agent.flags.pressure ?? 0) + 0.2, 0, 1);
        agent.action = 'avoid_attention';
        remember(agent, 'local_pressure_increased', { location: event.location ?? 'unknown' }, event.time);
      }
    }
  }

  return Object.freeze({
    addAgent(definition) {
      const agent = normalizeAgent(definition);
      if (agents.has(agent.id)) return false;
      agents.set(agent.id, agent);
      return true;
    },
    agent(id) {
      const agent = agents.get(String(id));
      return agent ? publicAgent(agent) : null;
    },
    agents() { return [...agents.values()].map(publicAgent); },
    publishEvent(event) {
      if (!event || typeof event.type !== 'string') return null;
      if (event.id && eventIds.has(event.id)) return null;
      const normalized = { ...event, id: event.id ?? 'external-' + (++eventSerial), time: Number(event.time) || 0 };
      eventIds.add(normalized.id);
      worldEvents.push(normalized);
      if (worldEvents.length > 100) worldEvents.shift();
      applyEvent(normalized);
      return Object.freeze({ ...normalized });
    },
    step({ time = 0, hour = 12, deltaHours = 0.25, maxAgents = 12, activeNpcIds = null } = {}) {
      const selected = [...agents.values()]
        .filter(agent => !activeNpcIds || activeNpcIds.includes(agent.id))
        .map(agent => ({ agent, urgency: Math.max(agent.needs.rest, agent.needs.safety, agent.needs.belonging, agent.needs.purpose) + npcRoll(seed, agent.id + '|' + Math.floor(time / 5)) * 0.01 }))
        .sort((a, b) => b.urgency - a.urgency || a.agent.id.localeCompare(b.agent.id))
        .slice(0, Math.max(0, Math.floor(maxAgents)));
      const changed = [];
      for (const { agent } of selected) {
        for (const key of Object.keys(agent.needs)) agent.needs[key] = clamp(agent.needs[key] + Math.max(0, deltaHours) * (key === 'rest' ? 0.025 : 0.008), 0, 1);
        if (agent.state !== 'living') continue;
        const roleAction = scheduleAction(agent.role, ((hour % 24) + 24) % 24);
        let action = roleAction;
        if (agent.needs.safety > 0.88) action = 'seek_safety';
        else if (agent.needs.rest > 0.92) action = 'rest';
        else if (agent.role === 'paramedic' && agent.flags.activeEmergency) action = 'respond_to_emergency';
        else if (agent.role === 'publicWorks' && agent.flags.signalOutage) action = 'repair_infrastructure';
        else if (agent.role === 'mechanic' && agent.flags.pendingRepair) action = 'repair_vehicles';
        else if (agent.role === 'suspiciousDriver' && (agent.flags.pressure ?? 0) > 0.5) action = 'avoid_attention';
        const changedAction = action !== agent.action;
        agent.action = action;
        agent.lastDecisionAt = time;
        if (changedAction) remember(agent, 'action_changed', { action }, time);
        if (agent.arcId) {
          const arc = NPC_STORY_ARCS[agent.arcId];
          const stage = arc.stages[agent.arcStage];
          if (stage && agent.flags[stage.when]) {
            agent.arcStage += 1;
            remember(agent, 'story_stage_advanced', { arcId: arc.id, stageId: stage.id }, time);
            emit(stage.outcome, { sourceNpc: agent.id, arcId: arc.id, stageId: stage.id }, time);
          }
        }
        changed.push({ id: agent.id, action: agent.action, arcId: agent.arcId, arcStage: agent.arcStage });
      }
      return Object.freeze({ processed: selected.length, changed: Object.freeze(changed), pendingEvents: worldEvents.length });
    },
    outcomes() { return outcomes.map(event => ({ ...event })); },
    snapshot() {
      return {
        version: 1, seed,
        agents: [...agents.values()].map(publicAgent),
        events: worldEvents.map(event => ({ ...event })),
        outcomes: outcomes.map(event => ({ ...event })),
      };
    },
    rules() {
      return Object.freeze({
        version: 1, architecture: 'deterministic-event-driven-agency',
        decisionBudget: 'bounded actors per step; no per-render-frame language-model calls',
        behaviorTiers: ['ambient-schedule', 'contextual-goal', 'persistent-story-arc'],
        memory: 'bounded episodic records with serializable snapshots',
        consequences: 'world events can change NPC actions, needs, relationships, and story flags',
        dialogue: 'host-authored or optional external generation; never required for simulation',
      });
    },
  });
}
