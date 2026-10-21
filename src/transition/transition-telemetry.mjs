const RESOURCE_KEYS = Object.freeze([
  'meshes', 'geometries', 'textures', 'drawCalls', 'triangles',
  'vehicles', 'npcs', 'colliders', 'instances'
]);
const EVENT_DETAIL_KEYS = new Set([
  'gateId', 'sourceWorldId', 'destinationWorldId', 'gateType', 'at',
  'reason', 'code', 'message', 'phase', 'status'
]);
function clone(value) { return value === undefined ? undefined : structuredClone(value); }
function nonNegativeInteger(value, name, minimum = 1) {
  if (!Number.isInteger(value) || value < minimum) throw new TypeError(`${name} must be an integer >= ${minimum}`);
  return value;
}
function timestamp(clock) {
  const value = clock();
  if (!Number.isFinite(value)) throw new TypeError('telemetry clock must return a finite timestamp');
  return value;
}
function compactDetails(details = {}) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const result = {};
  for (const key of EVENT_DETAIL_KEYS) {
    const value = details[key];
    if (['string', 'number', 'boolean'].includes(typeof value) || value === null) {
      if (typeof value !== 'number' || Number.isFinite(value)) result[key] = value;
    }
  }
  return result;
}
function compactFailure(failure) {
  if (!failure) return null;
  if (failure instanceof Error) return { name: failure.name || 'Error', message: String(failure.message || 'transition failed').slice(0, 500) };
  if (typeof failure !== 'object') return { name: 'Error', message: String(failure).slice(0, 500) };
  const name = typeof failure.name === 'string' ? failure.name.slice(0, 100) : 'Error';
  const message = typeof failure.message === 'string' ? failure.message.slice(0, 500) : 'transition failed';
  const code = typeof failure.code === 'string' ? failure.code.slice(0, 100) : null;
  const rollbackError = failure.rollbackError && typeof failure.rollbackError === 'object'
    ? {
        name: typeof failure.rollbackError.name === 'string' ? failure.rollbackError.name.slice(0, 100) : 'Error',
        message: typeof failure.rollbackError.message === 'string' ? failure.rollbackError.message.slice(0, 500) : 'rollback failed'
      }
    : null;
  return { name, message, code, ...(rollbackError ? { rollbackError } : {}) };
}
/** Bounded transition lifecycle telemetry; never stores player state or frame-by-frame history. */
export class TransitionTelemetry {
  constructor({ maxRecords = 100, maxEventsPerRecord = 64, maxResourceSamplesPerRecord = 8, clock = () => Date.now() } = {}) {
    this.maxRecords = nonNegativeInteger(maxRecords, 'maxRecords');
    this.maxEventsPerRecord = nonNegativeInteger(maxEventsPerRecord, 'maxEventsPerRecord');
    this.maxResourceSamplesPerRecord = nonNegativeInteger(maxResourceSamplesPerRecord, 'maxResourceSamplesPerRecord');
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    this.clock = clock;
    this.records = new Map();
    this.order = [];
    this.droppedRecords = 0;
  }
  start(id, metadata = {}) {
    this.#assertId(id);
    const existing = this.records.get(id);
    if (existing) return this.#copy(existing);
    const startedAt = timestamp(this.clock);
    const safe = compactDetails(metadata);
    const record = {
      id,
      sourceWorldId: typeof metadata?.sourceWorldId === 'string' ? metadata.sourceWorldId : null,
      destinationWorldId: typeof metadata?.destinationWorldId === 'string' ? metadata.destinationWorldId : null,
      gateId: typeof metadata?.gateId === 'string' ? metadata.gateId : null,
      gateType: typeof metadata?.gateType === 'string' ? metadata.gateType : null,
      status: 'RUNNING', startedAt, updatedAt: startedAt, completedAt: null, durationMs: null,
      milestonesMs: {}, events: [], resources: [], failure: null, droppedEvents: 0, droppedResourceSamples: 0
    };
    this.records.set(id, record);
    this.order.push(id);
    this.#pushEvent(record, { name: 'STARTED', at: startedAt, details: safe });
    while (this.order.length > this.maxRecords) {
      const oldest = this.order.shift();
      if (this.records.delete(oldest)) this.droppedRecords += 1;
    }
    return this.#copy(record);
  }
  mark(id, state, details = {}) {
    const record = this.records.get(id);
    if (!record) return null;
    if (typeof state !== 'string' || !state.trim()) throw new TypeError('telemetry state/event name is required');
    const at = Number.isFinite(details?.at) ? details.at : timestamp(this.clock);
    record.updatedAt = at;
    if (!Object.prototype.hasOwnProperty.call(record.milestonesMs, state)) record.milestonesMs[state] = Math.max(0, at - record.startedAt);
    this.#pushEvent(record, { name: state, at, details: compactDetails(details) });
    return this.#copy(record);
  }
  sampleResources(id, metrics = {}) {
    const record = this.records.get(id);
    if (!record) return null;
    const sample = { at: timestamp(this.clock) };
    for (const key of RESOURCE_KEYS) {
      const value = metrics?.[key];
      if (Number.isFinite(value) && value >= 0) sample[key] = value;
    }
    if (record.resources.length >= this.maxResourceSamplesPerRecord) {
      record.resources.shift();
      record.droppedResourceSamples += 1;
    }
    record.resources.push(sample);
    record.updatedAt = sample.at;
    return clone(sample);
  }
  complete(id, result = {}) {
    const record = this.records.get(id);
    if (!record) return null;
    if (record.status !== 'RUNNING') return this.#copy(record);
    const at = timestamp(this.clock);
    record.status = 'COMPLETE'; record.completedAt = at; record.updatedAt = at;
    record.durationMs = Math.max(0, at - record.startedAt);
    this.#pushEvent(record, { name: 'COMPLETE', at, details: compactDetails({
      reason: result?.cleanupWarnings?.length ? 'completed-with-cleanup-warnings' : 'completed', phase: 'COMPLETE'
    }) });
    return this.#copy(record);
  }
  fail(id, result = {}) {
    const record = this.records.get(id);
    if (!record) return null;
    if (record.status !== 'RUNNING') return this.#copy(record);
    const failure = compactFailure(result?.failure ?? result?.error ?? result);
    const at = timestamp(this.clock);
    const cancelled = failure?.code === 'TRANSITION_CANCELLED' || failure?.name === 'TransitionCancelledError';
    record.status = cancelled ? 'CANCELLED' : 'FAILED';
    record.failure = failure; record.completedAt = at; record.updatedAt = at;
    record.durationMs = Math.max(0, at - record.startedAt);
    this.#pushEvent(record, { name: record.status, at, details: compactDetails({
      reason: failure?.message, code: failure?.code, phase: result?.state
    }) });
    return this.#copy(record);
  }
  get(id) { const record = this.records.get(id); return record ? this.#copy(record) : null; }
  snapshot() {
    return { capacity: this.maxRecords, size: this.records.size, droppedRecords: this.droppedRecords,
      records: this.order.map(id => this.#copy(this.records.get(id))).filter(Boolean) };
  }
  clear() { this.records.clear(); this.order.length = 0; this.droppedRecords = 0; }
  #assertId(id) { if (typeof id !== 'string' || !id.trim()) throw new TypeError('transition telemetry ID is required'); }
  #pushEvent(record, event) {
    if (record.events.length >= this.maxEventsPerRecord) { record.events.shift(); record.droppedEvents += 1; }
    record.events.push(clone(event));
  }
  #copy(record) { return clone(record); }
}
export const TRANSITION_RESOURCE_KEYS = RESOURCE_KEYS;
