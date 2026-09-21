import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, parseIrradianceCSV, parseTimestamp, sampleAt, createPlant, stepPlant, snapshotPlant, updateGenerator, updateReplay, updateWeather, updateFaults, publicPlant, windFactor } from '../server/model.js';
const csv = (a = 100, b = 200, extra = '') => `timestamp,power_kw${extra}\n2026-01-01 00:00,${a}\n2026-01-01 00:10,${b}`;
const plant = (options = {}) => createPlant({ name: '시험', type: 'wind', count: 1, ratedKw: 1000, rampKwPerSec: 1000, csv: csv(), ...options });
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test('CSV/TSV BOM and Korean aliases, unit and missing weather', () => {
  const data = parseCSV('\uFEFF일시\t발전량\t전압\t전류\n2026-01-01 00:00\t 10 \t380\t35\n2026-01-01 00:10\t20\t380\t70', { unit: 'kwh' });
  assert.equal(data.rows[0].power_kw, 60); assert.equal(data.unit, 'kwh'); assert.equal(data.interpolation, 'hold'); assert.equal(data.rows[0].wind_speed_ms, undefined);
  assert.equal(parseCSV(csv()).rows[0].timestamp, '2025-12-31T15:00:00.000Z');
});
test('linear 300/599/600 boundaries and last interval hold, no wrapping interpolation', () => {
  const ds = parseCSV(csv());
  near(sampleAt(ds, 300).power_kw, 150); near(sampleAt(ds, 599).power_kw, 100 + 100 * 599 / 600);
  assert.equal(sampleAt(ds, 600).power_kw, 200); assert.equal(sampleAt(ds, 1199).power_kw, 200); assert.equal(sampleAt(ds, 1200).power_kw, 100);
  assert.equal(sampleAt(ds, 300).timestamp, '2025-12-31T15:05:00.000Z');
});
test('mean/kWh energy holds original interval without claiming ramp-adjusted energy', () => {
  const mean = parseCSV(csv(), { semantics: 'mean' }); assert.equal(sampleAt(mean, 599).power_kw, 100);
  const ds = parseCSV(csv(10, 20), { unit: 'kwh', semantics: 'sample' });
  let energy = 0; for (let second = 0; second < 600; second++) energy += sampleAt(ds, second).power_kw / 3600;
  near(energy, 10); assert.equal(sampleAt(ds, 599).power_kw, 60); assert.equal(sampleAt(ds, 600).power_kw, 120);
});
test('direction shortest arc and optional missing data never backwards-filled', () => {
  const ds = parseCSV('timestamp,power_kw,wind_direction_deg,voltage\n2026-01-01 00:00,100,350,\n2026-01-01 00:10,200,10,380');
  assert.equal(sampleAt(ds, 300).wind_direction_deg, 0); assert.equal(sampleAt(ds, 300).voltage, undefined);
});
test('strict actual dates, offsets, seconds, leap years', () => {
  assert.equal(parseTimestamp('2024-02-29T23:59:59Z'), '2024-02-29T23:59:59.000Z');
  assert.equal(parseTimestamp('2026-01-01T00:00+0900'), '2025-12-31T15:00:00.000Z');
  assert.equal(parseTimestamp('2026-01-01T00:00-03:30'), '2026-01-01T03:30:00.000Z');
  for (const bad of ['2025-02-29 00:00', '2026-04-31 00:00', '2026-01-01 24:00', '2026-01-01 00:60', '2026-01-01T00:00+24:00', 'January 1 2026']) assert.throws(() => parseTimestamp(bad), /timestamp/);
});
test('invalid CSV errors identify original row/field; duplicate, reverse, gap, NaN, empty', () => {
  for (const timestamp of ['2026-01-01 00:00', '2025-12-31 23:50', '2026-01-01 00:20', '2026-02-30 00:10']) assert.throws(() => parseCSV(`timestamp,power_kw\n2026-01-01 00:00,1\n${timestamp},2`), /행 3 timestamp/);
  for (const power of ['', 'NaN', 'Infinity', '-1', '1000000001', '0xff']) assert.throws(() => parseCSV(csv(power)), /행 2 power_kw/);
  assert.throws(() => parseCSV('timestamp,power_kw,출력\n2026-01-01 00:00,1,1\n2026-01-01 00:10,2,2'), /중복 열/);
  assert.throws(() => parseCSV('timestamp,power_kw\n2026-01-01 00:00,1'), /2~100000/);
});
test('registration validates whole input and generates correct hybrid IDs and virtual coordinates', () => {
  const p = plant({ type: 'hybrid', count: 5 });
  assert.deepEqual(p.generators.map((g) => g.id), ['WT-01', 'WT-02', 'WT-03', 'PV-04', 'PV-05']);
  assert.ok(p.virtualCoordinates); assert.match(p.coordinateSource, /가상/); assert.ok(p.generators.every((g) => g.on && g.powerKw === 0 && g.limitPct === 100));
  const explicit = plant({ lat: 37.69, lon: 128.75 }); assert.equal(explicit.station, 100); assert.equal(explicit.virtualCoordinates, false);
  for (const patch of [{ name: ' ' }, { count: 0 }, { count: 1.5 }, { type: 'hybrid', count: 1 }, { lat: 1 }, { station: 0 }, { ratedKw: 0 }, { rampKwPerSec: 1001 }]) assert.throws(() => plant(patch));
});
test('CSV total allocation and hybrid separate allocation, voltage/current provenance', () => {
  const p = plant({ count: 2, csv: 'timestamp,power_kw,voltage,current_a\n2026-01-01 00:00,1000,380,100\n2026-01-01 00:10,1000,380,100' });
  p.generators.forEach((g) => updateGenerator(p, g.id, { limitPct: 20 }));
  const frame = stepPlant(p); assert.equal(frame.powerKw, 400); assert.equal(frame.generators[0].availableKw, 500); assert.equal(frame.electrical.voltage, 380); assert.equal(frame.electrical.sourceCurrentA, 100); assert.equal(frame.electrical.estimatedCurrentA, 40);
  const hybrid = plant({ type: 'hybrid', count: 3, csv: 'timestamp,wind_power_kw,solar_power_kw\n2026-01-01 00:00,800,300\n2026-01-01 00:10,800,300' });
  assert.deepEqual(stepPlant(hybrid).generators.map((g) => g.powerKw), [400, 400, 300]);
  const zero = plant({ csv: csv(0, 0) }); assert.equal(stepPlant(zero).electrical.estimatedCurrentA, null);
});
test('weather wind power cubic/rated/cut-out and custom interpolation', () => {
  const p = plant(), g = p.generators[0];
  updateWeather(p, { mode: 'weather', wind_speed_ms: 2 }); assert.equal(stepPlant(p).powerKw, 0);
  updateWeather(p, { wind_speed_ms: 12 }); assert.equal(stepPlant(p).powerKw, 1000);
  updateWeather(p, { wind_speed_ms: 25 }); assert.equal(stepPlant(p).powerKw, 0);
  near(windFactor(g, 8), (8 ** 3 - 3 ** 3) / (12 ** 3 - 3 ** 3));
  updateGenerator(p, g.id, { windCurve: [[4, .1], [8, .5], [10, .8]] }); near(windFactor(g, 6), .3); near(windFactor(g, 3), .1); near(windFactor(g, 15), .8); assert.equal(windFactor(g, 25), 0);
  assert.throws(() => updateGenerator(p, g.id, { windCurve: [[4, .1], [4, .2]] }), /오름차순/);
  updateGenerator(p, g.id, { windCurve: null }); near(windFactor(g, 8), (512 - 27) / (1728 - 27));
});
test('solar temperature correction, saturation, efficiency and manual night irradiance', () => {
  const p = plant({ type: 'solar' });
  updateWeather(p, { mode: 'weather', irradiance_wm2: 1000, temperature: 25 }); assert.equal(stepPlant(p).powerKw, 1000);
  updateWeather(p, { temperature: 50 }); assert.equal(stepPlant(p).powerKw, 900);
  updateWeather(p, { irradiance_wm2: 2000 }); assert.equal(stepPlant(p).powerKw, 1000);
  updateWeather(p, { irradiance_wm2: 0 }); assert.equal(stepPlant(p).powerKw, 0);
  updateWeather(p, { irradiance_wm2: 1000, temperature: 25 }); updateGenerator(p, 'PV-01', { solarEfficiency: .5 }); assert.equal(stepPlant(p).powerKw, 500);
});
test('ramp, stopping, fractional startup and actuator freeze', () => {
  const p = plant({ csv: csv(1000, 1000), rampKwPerSec: 50 }), g = p.generators[0];
  updateGenerator(p, g.id, { targetLimitKw: 500, startupDelaySeconds: 1.5 });
  assert.equal(stepPlant(p).powerKw, 50); assert.equal(g.status, 'RAMPING'); assert.equal(stepPlant(p).powerKw, 100);
  updateGenerator(p, g.id, { on: false }); assert.equal(stepPlant(p).powerKw, 50); assert.equal(g.status, 'STOPPING'); assert.equal(stepPlant(p).powerKw, 0); assert.equal(g.status, 'OFF');
  updateGenerator(p, g.id, { on: true }); assert.equal(g.startupRemaining, 1.5);
  assert.equal(stepPlant(p).powerKw, 0); assert.equal(g.startupRemaining, .5); assert.equal(stepPlant(p).powerKw, 0); assert.equal(g.startupRemaining, 0); assert.equal(stepPlant(p).powerKw, 50);
  updateFaults(p, { actuatorStuck: true }); assert.equal(stepPlant(p).powerKw, 50); assert.equal(g.targetKw, 500);
  updateFaults(p, { actuatorStuck: false }); assert.equal(stepPlant(p).powerKw, 100);
});
test('percentage limit and rated reductions, unchanged CSV power on weather-only edit', () => {
  const p = plant({ csv: csv(1000, 1000) }), g = p.generators[0];
  updateGenerator(p, g.id, { limitPct: 20 }); assert.equal(stepPlant(p).powerKw, 200);
  updateGenerator(p, g.id, { limitPct: 100, targetLimitKw: 500 }); assert.equal(stepPlant(p).powerKw, 500);
  updateWeather(p, { wind_speed_ms: 0 }); assert.equal(stepPlant(p).powerKw, 500);
  updateGenerator(p, g.id, { ratedKw: 200, rampKwPerSec: 200 }); assert.equal(g.powerKw, 200); assert.equal(stepPlant(p).powerKw, 200);
});
test('all PATCH validators are atomic including RNG and source metadata', () => {
  const p = plant();
  for (const mutate of [() => updateGenerator(p, 'WT-01', { on: false, cutInMs: 30 }), () => updateGenerator(p, 'WT-01', { limitPct: 10, ratedKw: null }), () => updateReplay(p, { seed: 5, speed: 61 }), () => updateWeather(p, { mode: 'weather', temperature: 61 }), () => updateFaults(p, { offline: true, dropPct: 101 }), () => updateFaults(p, { offline: 'true' })]) {
    const before = structuredClone(p); assert.throws(mutate); assert.deepEqual(p, before);
  }
});
test('LCG common noise, independent fault RNG, snapshot deterministic replay and pause', () => {
  const p = plant({ count: 2, csv: csv(1000, 1000) }); updateReplay(p, { seed: 42, noisePct: 20 });
  const q = structuredClone(p), outputs = [];
  for (let i = 0; i < 10; i++) { const a = stepPlant(p, 0), b = stepPlant(q, 0); assert.deepEqual(a, b); assert.equal(a.generators[0].powerKw, a.generators[1].powerKw); outputs.push(a.powerKw); }
  assert.ok(new Set(outputs).size > 1); assert.equal(p.faultRngState, 12345);
  updateReplay(p, { paused: true }); const frozen = structuredClone(p); assert.equal(stepPlant(p), null); assert.deepEqual(p, frozen);
  updateReplay(p, { seconds: 900 }); assert.equal(p.generators[0].powerKw, frozen.generators[0].powerKw);
});
test('separate irradiance CSV aligns source timestamp and falls back outside range', () => {
  const p = plant({ type: 'solar' }); updateWeather(p, { mode: 'weather', irradiance_wm2: 123 });
  p.irradianceDataset = parseIrradianceCSV('timestamp,irradiance_wm2\n2026-01-01 00:00,100\n2026-01-01 00:10,900');
  updateReplay(p, { seconds: 300 }); let frame = snapshotPlant(p); assert.equal(frame.weather.irradiance_wm2, 500); assert.equal(frame.irradianceSource, 'irradiance_csv');
  updateReplay(p, { seconds: 601 }); frame = snapshotPlant(p); assert.equal(frame.weather.irradiance_wm2, 123); assert.equal(frame.irradianceSource, 'manual');
  assert.throws(() => parseIrradianceCSV('timestamp,irradiance_wm2\n2026-01-01 00:00,2001\n2026-01-01 00:10,900'));
});
test('frame includes complete state and excludes custom curve data; API retains curve', () => {
  const p = plant(); updateGenerator(p, 'WT-01', { windCurve: [[0, 0], [10, 1]] });
  const frame = stepPlant(p, 0); assert.equal(frame.timestamp, '1970-01-01T00:00:00.000Z'); assert.equal(frame.sourceTimestamp, '2025-12-31T15:00:00.000Z'); assert.equal(frame.simulationSeconds, 1); assert.equal(p.seconds, 1);
  assert.equal(frame.generators[0].customWindCurve, true); assert.equal(frame.generators[0].windCurve, undefined); assert.equal(frame.quality, 'SIMULATED'); assert.ok(frame.electrical.currentMethod);
  const output = publicPlant(p); assert.equal(output.dataset.rowCount, 2); assert.equal(output.dataset.rows, undefined); assert.deepEqual(output.generators[0].windCurve, [[0, 0], [10, 1]]);
  output.generators[0].windCurve[0][1] = 1; assert.equal(p.generators[0].windCurve[0][1], 0);
});
test('loop count records actual dataset wraps, not seeks, and survives scenario JSON snapshots', () => {
  const p = plant(); assert.equal(p.loopCount, 0);
  updateReplay(p, { seconds: 1199 }); assert.equal(p.loopCount, 0);
  stepPlant(p, 0); assert.equal(p.seconds, 0); assert.equal(p.loopCount, 1);
  assert.equal(publicPlant(p).loopCount, 1);
  updateReplay(p, { seconds: 900 }); updateReplay(p, { seconds: 0 }); assert.equal(p.loopCount, 1);
  const snapshot = JSON.parse(JSON.stringify(p));
  updateReplay(p, { seconds: 1199 }); stepPlant(p, 0); assert.equal(p.loopCount, 2);
  const restored = JSON.parse(JSON.stringify(snapshot)); restored.runId = 'new-scenario-run'; restored.history = [];
  assert.equal(restored.loopCount, 1); assert.equal(restored.seconds, 0);
  updateReplay(restored, { seconds: 1199, paused: true }); assert.equal(stepPlant(restored), null); assert.equal(restored.loopCount, 1);
  updateReplay(restored, { paused: false }); stepPlant(restored, 0); assert.equal(restored.loopCount, 2);
});
