import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKMA, refreshWeather } from '../server/weather.js';
import { createPlant, updateWeather } from '../server/model.js';
const now = Date.parse('2026-09-21T00:00:00Z');
const row = (time = '202609210900', direction = '24', speed = '8', temperature = '22', station = '100') => `${time} ${station} ${direction} ${speed} 0 0 0 0 0 0 0 ${temperature} 999`;
const make = () => createPlant({ name: '기상 시험', type: 'wind', lat: 37.69, lon: 128.75, count: 1, csv: 'timestamp,power_kw\n2026-01-01 00:00,100\n2026-01-01 00:10,200' });
const fetchText = (text) => async () => ({ ok: true, text: async () => text });

test('KMA SFCTM2 field fixture uses index11 temperature, 10 degree wind and KST time', () => {
  const parsed = parseKMA(`#START7777\n# comment\n${row()}\n#7777END`, { station: 100, now });
  assert.deepEqual(parsed, { station: 100, observedAt: '2026-09-21T00:00:00.000Z', weather: { wind_speed_ms: 8, wind_direction_deg: 240, temperature: 22 } });
  assert.equal(parseKMA(row(undefined, '36'), { now }).weather.wind_direction_deg, 0);
  assert.equal(parseKMA(row(undefined, '-9'), { now }).weather.wind_direction_deg, undefined);
  assert.equal(parseKMA(row(undefined, '0'), { now }).weather.wind_direction_deg, undefined);
});
test('KMA malformed/stale/future/out-of-range/wrong-station responses fail', () => {
  for (const text of ['<html>error</html>', row(undefined, '24', '-9'), row(undefined, '24', '101'), row(undefined, '24', '8', '-99'), row('202602300900'), row(undefined, '24', '8', '22', '999')]) assert.throws(() => parseKMA(text, { station: 100, now }), /KMA/);
  assert.throws(() => parseKMA(row('202609210559'), { now }), /3시간/);
  assert.throws(() => parseKMA(row('202609210911'), { now }), /10분/);
  assert.doesNotThrow(() => parseKMA(row('202609210600'), { now }));
  assert.throws(() => parseKMA(row('202609210910'), { now }), /10분/);
  assert.doesNotThrow(() => parseKMA(row('202609210909'), { now }));
});
test('live refresh preserves irradiance; request has current observation parameters and no old tm', async () => {
  const p = make(); let called;
  const result = await refreshWeather(p, { authKey: 'test-key', now, fetchImpl: async (url, options) => { called = url; assert.ok(options.signal); return { ok: true, text: async () => row(undefined, '36', '12', '25') }; } });
  assert.equal(result.ok, true); assert.equal(p.weatherSource, 'kma'); assert.equal(p.weather.wind_speed_ms, 12); assert.equal(p.weather.irradiance_wm2, 650);
  assert.equal(called.searchParams.get('stn'), '100'); assert.equal(called.searchParams.has('tm'), false); assert.equal(p.mode, 'csv');
});
test('automatic manual/frozen skips; explicit lookup enters weather mode and releases freeze', async () => {
  const p = make(); updateWeather(p, { wind_speed_ms: 1 }); let count = 0;
  const options = { now, authKey: 'key', fetchImpl: async () => { count++; return { ok: true, text: async () => row() }; } };
  assert.equal((await refreshWeather(p, options)).skipped, true); assert.equal(count, 0);
  p.replay.freezeLiveWeather = true;
  assert.equal((await refreshWeather(p, { ...options, explicit: true })).ok, true); assert.equal(p.mode, 'weather'); assert.equal(p.replay.freezeLiveWeather, false); assert.equal(p.weatherSource, 'kma'); assert.equal(count, 1);
  p.replay.freezeLiveWeather = true; assert.equal((await refreshWeather(p, options)).skipped, true); assert.equal(count, 1);
});
test('failed live observations retain all last-valid values, source and timestamp without auth leaks', async () => {
  const p = make(); await refreshWeather(p, { now, authKey: 'key', fetchImpl: fetchText(row()) }); const valid = structuredClone(p.weather), observed = p.weatherObservedAt;
  const result = await refreshWeather(p, { now, authKey: 'SECRET', fetchImpl: async () => { throw new Error('URL authKey=SECRET'); } });
  assert.equal(result.ok, false); assert.deepEqual(p.weather, valid); assert.equal(p.weatherObservedAt, observed); assert.equal(p.weatherSource, 'kma'); assert.equal(JSON.stringify(result).includes('SECRET'), false); assert.equal(p.weatherError.includes('SECRET'), false);
  assert.equal((await refreshWeather(p, { now, authKey: '', explicit: true })).ok, false); assert.deepEqual(p.weather, valid);
});
test('missing direction preserves previous direction; SI never interpreted as irradiance', async () => {
  const p = make(); p.weather.wind_direction_deg = 123; p.weather.irradiance_wm2 = 789;
  await refreshWeather(p, { now, authKey: 'key', fetchImpl: fetchText(row(undefined, '-9')) });
  assert.equal(p.weather.wind_direction_deg, 123); assert.equal(p.weather.irradiance_wm2, 789);
});
test('manual edit during in-flight request is protected, including explicit request', async () => {
  for (const explicit of [false, true]) {
    const p = make(); let resolve;
    const promise = refreshWeather(p, { now, authKey: 'key', explicit, fetchImpl: () => new Promise((r) => { resolve = r; }) });
    updateWeather(p, { wind_speed_ms: 3 }); resolve({ ok: true, text: async () => row() });
    assert.equal((await promise).skipped, true); assert.equal(p.weather.wind_speed_ms, 3); assert.equal(p.weatherSource, 'manual');
  }
});
