import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPlant, stepPlant} from '../server/model.js';
import {Store} from '../server/store.js';
import {createTelemetryAudit} from '../scripts/telemetry-audit.mjs';

function fixture({count = 2, frames = 2} = {}) {
  const p = createPlant({name: 'observer fixture', type: 'wind', count, ratedKw: 100, csv: 'timestamp,power_kw\n2026-01-01 00:00,100\n2026-01-01 00:10,100'});
  const store = new Store(':memory:');
  try {
    for (let i = 0; i < frames; i++) store.addFrame(p, stepPlant(p, 1000));
    return {p, topic: `vpp/rtu/${p.id}/telemetry`, messages: store.batch(p.id).map(row => JSON.parse(row.body))};
  } finally {store.close();}
}
const bytes = value => Buffer.from(JSON.stringify(value));

test('real model and store split full SCADA into valid size-bounded packets, including equal wall timestamps', () => {
  const f = fixture({count: 100, frames: 60});
  const a = createTelemetryAudit([f.p]);
  assert.ok(f.messages.length > 1);
  for (const x of f.messages) assert.deepEqual(a.receive(f.topic, bytes(x)).reasons, []);
  const s = a.snapshot();
  assert.equal(s.invalidMessages, 0); assert.equal(s.rtus[0].samples, 60); assert.equal(s.rtus[0].sampleDiscontinuities, 0);
  assert.equal(s.rtus[0].observedTwoMessagesAnd60Samples, true);
});

test('same-body QoS1 duplicate is counted; a changed body with same ID is an anomaly', () => {
  const f = fixture(), x = f.messages[0], a = createTelemetryAudit([f.p]);
  a.receive(f.topic, bytes(x));
  assert.deepEqual(a.receive(f.topic, bytes(x)).reasons, []);
  assert.deepEqual(a.receive(f.topic, bytes({...x, powerKw: 500})).reasons, ['duplicate_id_changed_payload']);
  const s = a.snapshot(); assert.equal(s.duplicateMessages, 2); assert.equal(s.rtus[0].samples, 2); assert.equal(s.invalidMessages, 1);
});

test('shared sequence jumps, sensor gaps, restored run and baseline changes are contextual observations', () => {
  const f = fixture(), a = createTelemetryAudit([f.p]);
  a.receive(f.topic, bytes(f.messages[0]), {now: 1000});
  const next = structuredClone(f.messages[0]); next.messageId = randomUUID(); next.sequence += 8;
  for (const [i, sample] of next.samples.entries()) sample.simulationSeconds = 20 + i;
  next.scada = structuredClone(next.samples.at(-1));
  assert.deepEqual(a.receive(f.topic, bytes(next), {now: 61000}).reasons, []);
  const restored = structuredClone(next); restored.messageId = randomUUID(); restored.sequence++; restored.runId = randomUUID();
  for (const sample of restored.samples) {sample.runId = restored.runId; sample.generators[0].id = 'WT-99';}
  restored.scada = structuredClone(restored.samples.at(-1));
  assert.deepEqual(a.receive(f.topic, bytes(restored), {now: 121000}).reasons, []);
  const s = a.snapshot(130000).rtus[0];
  assert.equal(s.sequenceForwardJumps, 1); assert.equal(s.sampleDiscontinuities, 1); assert.equal(s.runTransitions, 1);
  assert.equal(s.baselineDriftMessages, 1); assert.equal(s.maxReceiptGapMs, 60000); assert.equal(s.silenceMs, 9000);
});

test('independent structural defects are reported without throwing on malformed samples', () => {
  const f = fixture();
  const cases = [
    [x => {x.samples[0].plant.id = randomUUID();}, 'sample_identity'],
    [x => {x.samples[0].runId = randomUUID();}, 'sample_identity'],
    [x => {x.sampleCount++;}, 'sample_count'],
    [x => {x.scada.powerKw++;}, 'last_scada_mismatch'],
    [x => {delete x.samples[0].electrical;}, 'missing_scada_field'],
    [x => {x.samples[0].electrical = {};}, 'electrical_fields'],
    [x => {x.samples[0].weather = null;}, 'weather_fields'],
    [x => {x.samples[0].faults = {};}, 'fault_fields'],
    [x => {x.samples[0].sourceTimestamp = '1';}, 'sample_timestamp'],
    [x => {delete x.samples[0].generators[0].on;}, 'generator_fields'],
    [x => {x.samples[0].generators[0].powerKw++;}, 'aggregate_power_mismatch'],
    [x => {x.samples[0].generators[0].powerKw = {toString: null};}, 'generator_values'],
    [x => {x.samples[0].generators[1].id = x.samples[0].generators[0].id;}, 'generator_identity'],
    [x => {x.samples[0].generators[0].id = {toString: null};}, 'generator_identity'],
    [x => {x.messageId = {toString: null};}, 'envelope_contract'],
    [x => {x.runId = {toString: null};}, 'envelope_contract'],
    [x => {x.samples[0] = null;}, 'invalid_sample']
  ];
  for (const [change, reason] of cases) {
    const a = createTelemetryAudit([f.p]), x = structuredClone(f.messages[0]); change(x);
    assert.ok(a.receive(f.topic, bytes(x)).reasons.includes(reason), reason);
  }
  const a = createTelemetryAudit([f.p]);
  assert.deepEqual(a.receive(f.topic, Buffer.alloc(120001)).reasons, ['payload_size_or_type']);
  assert.deepEqual(a.receive(f.topic, Buffer.from('{')).reasons, ['invalid_json']);
  assert.deepEqual(a.receive(f.topic, Buffer.from('['.repeat(50) + '0' + ']'.repeat(50))).reasons, ['unsupported_json_depth']);
});

test('RTU identity, retained delivery and bounded dedup scope remain explicit', () => {
  const f = fixture(), a = createTelemetryAudit([f.p], {dedupLimit: 2});
  assert.ok(a.receive(`vpp/rtu/${randomUUID()}/telemetry`, bytes(f.messages[0])).reasons.includes('topic_envelope_identity'));
  assert.ok(a.receive(f.topic, bytes(f.messages[0]), {retained: true}).reasons.includes('retained_telemetry'));
  for (let i = 0; i < 3; i++) a.receive(f.topic, bytes({...f.messages[0], messageId: randomUUID(), sequence: i + 2}));
  assert.equal(a.snapshot().dedupEntries, 2);
  const other = fixture(); a.receive(other.topic, bytes(other.messages[0]));
  assert.equal(a.snapshot().unknownRtuMessages, 1);
  assert.match(a.snapshot().claimBoundary, /No pre-subscription coverage/);
});
