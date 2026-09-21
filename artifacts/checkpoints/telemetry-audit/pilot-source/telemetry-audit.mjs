import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isGeneratorId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-7 + Math.max(Math.abs(a), Math.abs(b)) * 1e-9;
const own = (value, key) => Object.hasOwn(value, key);
function boundedDepth(value) {
  const pending = [[value, 0]];
  while (pending.length) {
    const [item, depth] = pending.pop();
    if (!item || typeof item !== 'object') continue;
    if (depth > 32) return false;
    for (const child of Object.values(item)) if (child && typeof child === 'object') pending.push([child, depth + 1]);
  }
  return true;
}

// This observer checks only received data. Gaps and silence are observations,
// never proof of broker uptime, missing persisted frames, or data loss.
export function createTelemetryAudit(plants, {dedupLimit = 10000} = {}) {
  if (!Number.isInteger(dedupLimit) || dedupLimit < 1 || dedupLimit > 100000) throw Error('Invalid dedup limit');
  if (!Array.isArray(plants) || !plants.length || plants.length > 100) throw Error('Invalid baseline plants');
  const rtus = new Map();
  for (const p of plants) {
    if (!p || !isUuid(p.id) || rtus.has(p.id) || !Array.isArray(p.generators) || !p.generators.length) throw Error('Invalid baseline RTU');
    const ids = p.generators.map(g => g.id);
    if (ids.some(id => !isGeneratorId(id)) || new Set(ids).size !== ids.length) throw Error('Invalid baseline generators');
    rtus.set(p.id, {rtuId: p.id, generatorIds: ids.sort(), messages: 0, uniqueMessages: 0, duplicateMessages: 0, invalidMessages: 0, baselineDriftMessages: 0, samples: 0, firstReceivedAt: null, lastReceivedAt: null, maxReceiptGapMs: 0, highestSequence: null, sequenceForwardJumps: 0, sequenceNonIncreasing: 0, runTransitions: 0, sampleDiscontinuities: 0, lastRunId: null, lastSimulationSeconds: null});
  }
  const seen = new Map();
  let received = 0, unknownRtuMessages = 0, invalidMessages = 0, duplicateMessages = 0;
  const totals = {};
  function receive(topic, bytes, {now = Date.now(), retained = false} = {}) {
    received++;
    const reasons = new Set();
    const add = reason => reasons.add(reason);
    let x;
    const result = (r = null) => {
      if (reasons.size) {
        invalidMessages++;
        if (r) r.invalidMessages++;
        for (const reason of reasons) totals[reason] = (totals[reason] || 0) + 1;
      }
      return {rtuId: r?.rtuId || null, reasons: [...reasons]};
    };
    if (!Buffer.isBuffer(bytes) || bytes.length > 120000) { add('payload_size_or_type'); return result(); }
    try { x = JSON.parse(bytes.toString('utf8')); } catch { add('invalid_json'); return result(); }
    if (!boundedDepth(x)) { add('unsupported_json_depth'); return result(); }
    const id = /^vpp\/rtu\/([^/]+)\/telemetry$/.exec(topic)?.[1];
    if (!x || typeof x !== 'object' || Array.isArray(x) || !id || x.rtuId !== id) { add('topic_envelope_identity'); return result(); }
    const r = rtus.get(id);
    if (!r) { unknownRtuMessages++; return result(); }
    r.messages++;
    if (r.lastReceivedAt !== null) r.maxReceiptGapMs = Math.max(r.maxReceiptGapMs, now - Date.parse(r.lastReceivedAt));
    r.firstReceivedAt ??= new Date(now).toISOString();
    r.lastReceivedAt = new Date(now).toISOString();
    if (retained) add('retained_telemetry');
    if (x.schemaVersion !== 2 || !isUuid(x.messageId) || !isUuid(x.runId) || !Number.isSafeInteger(x.sequence) || x.sequence < 1) add('envelope_contract');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const key = isUuid(x.messageId) ? `${id}/${x.messageId}` : null;
    if (key !== null && seen.has(key)) {
      duplicateMessages++; r.duplicateMessages++;
      if (seen.get(key) !== hash) add('duplicate_id_changed_payload');
      return result(r);
    }
    if (key !== null) {
      seen.set(key, hash);
      if (seen.size > dedupLimit) seen.delete(seen.keys().next().value);
    }
    r.uniqueMessages++;
    if (Number.isSafeInteger(x.sequence)) {
      if (r.highestSequence !== null && x.sequence <= r.highestSequence) r.sequenceNonIncreasing++;
      else if (r.highestSequence !== null && x.sequence > r.highestSequence + 1) r.sequenceForwardJumps++;
      r.highestSequence = Math.max(r.highestSequence ?? x.sequence, x.sequence);
    }
    if (!Array.isArray(x.samples) || !Number.isInteger(x.sampleCount) || x.sampleCount < 1 || x.sampleCount > 60 || x.sampleCount !== x.samples.length) {
      add('sample_count'); return result(r);
    }
    const last = x.samples.at(-1);
    if (!isDeepStrictEqual(x.scada, last)) add('last_scada_mismatch');
    for (const key of ['runId', 'timestamp', 'sourceTimestamp', 'mode', 'quality', 'powerKw', 'availableKw', 'electrical', 'weather']) {
      if (!own(x, key) || !isDeepStrictEqual(x[key], last?.[key])) add('summary_mismatch');
    }
    if (x.batchFirstTimestamp !== x.samples[0]?.timestamp) add('batch_first_timestamp');
    let drift = false;
    for (const f of x.samples) {
      if (!f || typeof f !== 'object' || Array.isArray(f)) { add('invalid_sample'); continue; }
      r.samples++;
      if (f.plant?.id !== id || f.runId !== x.runId) add('sample_identity');
      for (const key of ['timestamp', 'time', 'sourceTimestamp', 'simulationSeconds', 'runId', 'mode', 'quality', 'powerKw', 'availableKw', 'plant', 'weather', 'weatherSource', 'weatherObservedAt', 'irradianceSource', 'electrical', 'generators', 'faults', 'controlPath']) {
        if (!own(f, key)) add('missing_scada_field');
      }
      if (!Number.isSafeInteger(f.simulationSeconds) || f.simulationSeconds < 0 || !finite(f.powerKw) || !finite(f.availableKw) || f.quality !== 'SIMULATED') add('sample_values');
      if (typeof f.timestamp !== 'string' || !Number.isFinite(Date.parse(f.timestamp)) || f.time !== f.timestamp) add('sample_timestamp');
      if (!Array.isArray(f.generators) || !f.generators.length) { add('generators_missing'); continue; }
      const ids = f.generators.map(g => g?.id);
      const validIds = ids.every(isGeneratorId);
      if (!validIds || new Set(ids).size !== ids.length) add('generator_identity');
      if (validIds && !isDeepStrictEqual(ids.sort(), r.generatorIds)) drift = true;
      for (const g of f.generators) {
        if (!g || !finite(g.powerKw) || !finite(g.availableKw) || !finite(g.ratedKw)) add('generator_values');
      }
      if (!close(f.powerKw, f.generators.reduce((n, g) => n + (finite(g?.powerKw) ? g.powerKw : NaN), 0)) || !close(f.availableKw, f.generators.reduce((n, g) => n + (finite(g?.availableKw) ? g.availableKw : NaN), 0))) add('aggregate_power_mismatch');
      if (r.lastRunId !== null && f.runId !== r.lastRunId) r.runTransitions++;
      if (r.lastRunId === f.runId && Number.isSafeInteger(f.simulationSeconds) && r.lastSimulationSeconds !== null && f.simulationSeconds !== r.lastSimulationSeconds + 1) r.sampleDiscontinuities++;
      r.lastRunId = isUuid(f.runId) ? f.runId : null;
      r.lastSimulationSeconds = Number.isSafeInteger(f.simulationSeconds) ? f.simulationSeconds : null;
    }
    if (drift) r.baselineDriftMessages++;
    return result(r);
  }
  return {
    receive,
    snapshot(now = Date.now()) {
      return {received, invalidMessages, duplicateMessages, unknownRtuMessages, reasons: {...totals}, dedupLimit, dedupEntries: seen.size, claimBoundary: 'Received telemetry only. Forward sequence jumps may be command events. Duplicate QoS1 delivery, sample discontinuities, silence, baseline drift and run transitions require context; none alone proves data loss. No pre-subscription coverage.', rtus: [...rtus.values()].map(r => ({...r, generatorIds: [...r.generatorIds], silenceMs: r.lastReceivedAt === null ? null : Math.max(0, now - Date.parse(r.lastReceivedAt)), observedTwoMessagesAnd60Samples: r.uniqueMessages >= 2 && r.samples >= 60}))};
    }
  };
}
