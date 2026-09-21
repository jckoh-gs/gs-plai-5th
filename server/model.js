import { randomUUID, randomInt } from 'node:crypto';
import { parse } from 'csv-parse/sync';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clone = (x) => structuredClone(x);
const fail = (message) => { throw new Error(message); };
function object(value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${field}: 객체가 필요합니다`); }
function number(value, field, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${field}: ${min}~${max}${integer ? ' 정수' : ''} 범위여야 합니다`);
  return value;
}
function bool(value, field) { if (typeof value !== 'boolean') fail(`${field}: boolean이어야 합니다`); return value; }
function keys(value, allowed, name) { object(value, name); for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${name}.${key}: 지원하지 않는 필드`); }
export function parseTimestamp(value, label = 'timestamp') {
  if (typeof value !== 'string') fail(`${label}: ISO 날짜가 필요합니다`);
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) fail(`${label}: YYYY-MM-DD HH:mm[:ss] 날짜 형식이어야 합니다`);
  const [, ys, mos, ds, hs, mins, ss = '0', zone = '+09:00'] = m;
  const [y, mo, d, h, minute, s] = [ys, mos, ds, hs, mins, ss].map(Number);
  const date = new Date(0); date.setUTCFullYear(y, mo - 1, d); date.setUTCHours(h, minute, s, 0);
  if (mo < 1 || mo > 12 || d < 1 || date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d || h > 23 || minute > 59 || s > 59) fail(`${label}: 실제 달력에 없는 날짜 또는 시간`);
  let offset = 0;
  if (zone !== 'Z') {
    const z = zone.replace(':', ''); const zh = Number(z.slice(1, 3)); const zm = Number(z.slice(3));
    if (zh > 23 || zm > 59) fail(`${label}: 잘못된 시간대`);
    offset = (zh * 60 + zm) * (z[0] === '+' ? 1 : -1);
  }
  return new Date(date.getTime() - offset * 60000).toISOString();
}
const aliases = { datetime: 'timestamp', 시간: 'timestamp', 일시: 'timestamp', 발전량: 'power_kw', 출력: 'power_kw', 풍력출력: 'wind_power_kw', 태양광출력: 'solar_power_kw', 풍속: 'wind_speed_ms', 풍향: 'wind_direction_deg', 일사량: 'irradiance_wm2', 전압: 'voltage', 전류: 'current_a' };
const ranges = { power_kw: [0, 1e9], wind_power_kw: [0, 1e9], solar_power_kw: [0, 1e9], wind_speed_ms: [0, 100], wind_direction_deg: [0, 360], irradiance_wm2: [0, 2000], voltage: [0, 1e9], current_a: [0, 1e9] };
function normalizeCSV(text, { type = 'wind', unit = 'kw', semantics = 'sample', irradiance = false } = {}) {
  if (typeof text !== 'string' || !text.trim()) fail('csv: 비어 있지 않은 UTF-8 CSV/TSV가 필요합니다');
  if (Buffer.byteLength(text, 'utf8') > 20 * 1024 * 1024) fail('csv: 20MB 이하이어야 합니다');
  if (!['wind', 'solar', 'hybrid'].includes(type)) fail('type: wind / solar / hybrid');
  if (!['kw', 'kwh'].includes(unit)) fail('unit: kw / kwh');
  if (!['sample', 'mean'].includes(semantics)) fail('semantics: sample / mean');
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim()) || '';
  let records;
  try { records = parse(text, { bom: true, delimiter: firstLine.includes('\t') ? '\t' : ',', trim: true, skip_empty_lines: true, info: true }); }
  catch (e) { fail(`csv 행 ${e.lines || '?'}: ${e.message}`); }
  if (records.length < 3 || records.length > 100001) fail('csv: 헤더 제외 2~100000행이어야 합니다');
  const headers = records[0].record.map((name) => aliases[name.trim()] || name.trim());
  if (new Set(headers).size !== headers.length) fail('csv 행 1: 중복 열 이름');
  const required = irradiance ? ['timestamp', 'irradiance_wm2'] : ['timestamp', ...(headers.includes('power_kw') ? ['power_kw'] : type === 'hybrid' ? ['wind_power_kw', 'solar_power_kw'] : ['power_kw'])];
  for (const field of required) if (!headers.includes(field)) fail(`csv 행 1: 필수 ${field} 열이 없습니다`);
  let previous;
  const rows = records.slice(1).map(({ record, info }) => {
    const row = {};
    for (let col = 0; col < headers.length; col++) {
      const field = headers[col], value = record[col];
      if (field === 'timestamp') row.timestamp = parseTimestamp(value, `csv 행 ${info.lines} timestamp`);
      else if (ranges[field] && (!irradiance || field === 'irradiance_wm2')) {
        if (value === '') { if (required.includes(field)) fail(`csv 행 ${info.lines} ${field}: 필수 값이 비어 있습니다`); continue; }
        // Number accepts hexadecimal and whitespace; CSV quantities deliberately use decimal syntax only.
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) fail(`csv 행 ${info.lines} ${field}: 유한한 숫자여야 합니다`);
        row[field] = number(Number(value), `csv 행 ${info.lines} ${field}`, ...ranges[field]);
        if (!irradiance && unit === 'kwh' && ['power_kw', 'wind_power_kw', 'solar_power_kw'].includes(field)) row[field] *= 6;
      }
    }
    const ms = Date.parse(row.timestamp);
    if (previous !== undefined && ms - previous !== 600000) fail(`csv 행 ${info.lines} timestamp: 중복·역순·누락 없이 정확히 600초 간격이어야 합니다`);
    previous = ms; return row;
  });
  return { rows, unit: irradiance ? 'wm2' : unit, semantics: irradiance ? 'sample' : semantics, interpolation: irradiance || (unit === 'kw' && semantics === 'sample') ? 'linear' : 'hold' };
}
export function parseCSV(text, options = {}) { return normalizeCSV(text, options); }
export function parseIrradianceCSV(text) { return normalizeCSV(text, { irradiance: true }); }
export function sampleAt(dataset, seconds) {
  const duration = dataset.rows.length * 600;
  const offset = ((seconds % duration) + duration) % duration;
  const index = Math.floor(offset / 600), f = (offset % 600) / 600;
  const row = dataset.rows[index], next = dataset.rows[index + 1];
  const result = { ...row, timestamp: new Date(Date.parse(row.timestamp) + (offset % 600) * 1000).toISOString() };
  if (dataset.interpolation === 'linear' && next) for (const [key, value] of Object.entries(row)) {
    if (typeof value !== 'number' || typeof next[key] !== 'number') continue;
    if (key === 'wind_direction_deg') result[key] = ((value + (((next[key] - value + 540) % 360) - 180) * f) % 360 + 360) % 360;
    else result[key] = value + (next[key] - value) * f;
  }
  if (own(result, 'wind_direction_deg')) result.wind_direction_deg %= 360;
  return result;
}
const stations = [{ lat: 37.69, lon: 128.75, station: 100, region: '대관령' }, { lat: 36.42, lon: 129.37, station: 277, region: '영덕' }, { lat: 33.36, lon: 126.26, station: 185, region: '제주' }, { lat: 34.83, lon: 126.10, station: 165, region: '신안' }];
export const DEFAULT_FAULTS = Object.freeze({ offline: false, latencyMs: 0, dropPct: 0, sensorFreeze: false, scadaReject: false, actuatorStuck: false });
export function createPlant(input) {
  object(input, '등록');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80) fail('name: 공백 제거 후 1~80자');
  if (!['wind', 'solar', 'hybrid'].includes(input.type)) fail('type: wind / solar / hybrid');
  const type = input.type, count = number(input.count ?? 6, 'count', type === 'hybrid' ? 2 : 1, 100, true);
  const ratedKw = number(input.ratedKw ?? 3000, 'ratedKw', 1, 1e6);
  const rampKwPerSec = number(input.rampKwPerSec ?? ratedKw / 20, 'rampKwPerSec', 0.01, ratedKw);
  const dataset = parseCSV(input.csv, { type, unit: input.unit ?? 'kw', semantics: input.semantics ?? 'sample' });
  let lat, lon, region = null, virtualCoordinates = false;
  if (input.lat === undefined && input.lon === undefined) {
    const candidate = stations[randomInt(stations.length)];
    lat = candidate.lat + (randomInt(50001) - 25000) / 1e6; lon = candidate.lon + (randomInt(50001) - 25000) / 1e6;
    region = candidate.region; virtualCoordinates = true;
  } else { lat = number(input.lat, 'lat', -90, 90); lon = number(input.lon, 'lon', -180, 180); }
  const nearest = [...stations].sort((a, b) => (a.lat - lat) ** 2 + (a.lon - lon) ** 2 - ((b.lat - lat) ** 2 + (b.lon - lon) ** 2))[0];
  const station = number(input.station ?? nearest.station, 'station', 1, 9999, true);
  const generators = Array.from({ length: count }, (_, i) => {
    const generatorType = type === 'hybrid' ? (i < Math.ceil(count / 2) ? 'wind' : 'solar') : type;
    return { id: `${generatorType === 'wind' ? 'WT' : 'PV'}-${String(i + 1).padStart(2, '0')}`, type: generatorType, ratedKw, rampKwPerSec, on: true, limitPct: 100, targetLimitKw: null, targetKw: 0, availableKw: 0, powerKw: 0, startupDelaySeconds: 0, startupRemaining: 0, cutInMs: 3, ratedWindMs: 12, cutOutMs: 25, windCurve: null, temperatureCoefficient: -0.004, solarEfficiency: 1, status: 'IDLE' };
  });
  return { id: randomUUID(), runId: randomUUID(), name, type, lat, lon, station, region, virtualCoordinates, coordinateSource: virtualCoordinates ? '지역 인근 가상 좌표' : '사용자 입력 좌표', dataset, generators, replay: { speed: 1, paused: false, seed: 42, noisePct: 0, freezeLiveWeather: false }, simulationSeconds: 0, seconds: 0, loopCount: 0, rngState: 42, faultRngState: 12345, mode: 'csv', weather: { wind_speed_ms: 8, wind_direction_deg: 240, irradiance_wm2: 650, temperature: 22 }, weatherSource: 'default', weatherObservedAt: null, weatherError: null, irradianceDataset: null, faults: { ...DEFAULT_FAULTS }, history: [], createdAt: new Date().toISOString() };
}
export function windFactor(generator, speed) {
  if (speed < generator.cutInMs || speed >= generator.cutOutMs) return 0;
  if (generator.windCurve) {
    const curve = generator.windCurve;
    if (speed <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) if (speed <= curve[i][0]) return curve[i - 1][1] + (curve[i][1] - curve[i - 1][1]) * (speed - curve[i - 1][0]) / (curve[i][0] - curve[i - 1][0]);
    return curve.at(-1)[1];
  }
  return speed >= generator.ratedWindMs ? 1 : (speed ** 3 - generator.cutInMs ** 3) / (generator.ratedWindMs ** 3 - generator.cutInMs ** 3);
}
export function effectiveWeather(plant, source = sampleAt(plant.dataset, plant.seconds)) {
  const weather = { ...plant.weather };
  let irradianceSource = 'manual';
  // A manual/KMA weather scenario controls the weather model; source CSV weather remains authoritative in CSV replay only.
  if (plant.mode === 'csv') for (const field of ['wind_speed_ms', 'wind_direction_deg', 'irradiance_wm2']) if (own(source, field)) { weather[field] = source[field]; if (field === 'irradiance_wm2') irradianceSource = 'scada_csv'; }
  const ds = plant.irradianceDataset;
  if (ds) {
    const elapsed = (Date.parse(source.timestamp) - Date.parse(ds.rows[0].timestamp)) / 1000;
    // Separate irradiance is timestamp aligned, never cyclic and never extrapolated beyond its last timestamp.
    if (elapsed >= 0 && elapsed <= (ds.rows.length - 1) * 600) { weather.irradiance_wm2 = sampleAt(ds, elapsed).irradiance_wm2; irradianceSource = 'irradiance_csv'; }
  }
  weather.wind_direction_deg %= 360;
  return { weather, irradianceSource };
}
export function generatorStatus(g) {
  if (!g.on) return g.powerKw > 0.01 ? 'STOPPING' : 'OFF';
  if (g.startupRemaining > 0) return 'STARTING';
  if (Math.abs(g.powerKw - g.targetKw) > 0.01) return 'RAMPING';
  if (g.targetKw < g.availableKw - 0.01) return 'CURTAILED';
  if (g.powerKw <= 0.01) return 'IDLE';
  return 'RUNNING';
}
function makeFrame(plant, now, source, weatherData) {
  const powerKw = plant.generators.reduce((n, g) => n + g.powerKw, 0);
  const sourcePowerKw = source.power_kw ?? ((source.wind_power_kw ?? 0) + (source.solar_power_kw ?? 0));
  const timestamp = new Date(now).toISOString();
  return { timestamp, time: timestamp, sourceTimestamp: source.timestamp, simulationSeconds: plant.simulationSeconds, runId: plant.runId, mode: plant.mode, quality: 'SIMULATED', powerKw, availableKw: plant.generators.reduce((n, g) => n + g.availableKw, 0), plant: Object.fromEntries(['id', 'name', 'type', 'lat', 'lon', 'station'].map((key) => [key, plant[key]])), weather: { ...weatherData.weather }, weatherSource: plant.weatherSource, weatherObservedAt: plant.weatherObservedAt, irradianceSource: weatherData.irradianceSource, electrical: { voltage: source.voltage ?? null, sourceCurrentA: source.current_a ?? null, estimatedCurrentA: sourcePowerKw > 0 && source.current_a !== undefined ? source.current_a * powerKw / sourcePowerKw : null, currentMethod: '원본 전류 × 제어 후 출력 / 원본 출력; 원본 0 kW는 추정 불가' }, generators: plant.generators.map(({ windCurve, ...g }) => ({ ...g, status: generatorStatus(g), customWindCurve: Boolean(windCurve) })), faults: { ...plant.faults }, controlPath: 'RTU -> virtual SCADA -> generators' };
}
export function snapshotPlant(plant, now = Date.now()) { const source = sampleAt(plant.dataset, plant.seconds); return makeFrame(plant, now, source, effectiveWeather(plant, source)); }
// One call = one virtual second regardless of replay.speed. Process current source position,
// then advance seconds. The returned frame refers to the processed source position and resulting output.
// Paused callers receive null, making accidental sample persistence impossible.
export function stepPlant(plant, now = Date.now()) {
  if (plant.replay.paused) return null;
  const source = sampleAt(plant.dataset, plant.seconds), weatherData = effectiveWeather(plant, source), w = weatherData.weather;
  plant.rngState = (Math.imul(1664525, plant.rngState) + 1013904223) >>> 0;
  const noise = 1 + (2 * plant.rngState / 2 ** 32 - 1) * plant.replay.noisePct / 100;
  const counts = { wind: plant.generators.filter((g) => g.type === 'wind').length, solar: plant.generators.filter((g) => g.type === 'solar').length };
  for (const g of plant.generators) {
    const raw = plant.mode === 'csv' ? (source.power_kw !== undefined ? source.power_kw / plant.generators.length : source[`${g.type}_power_kw`] / counts[g.type]) : g.ratedKw * (g.type === 'wind' ? windFactor(g, w.wind_speed_ms) : clamp(w.irradiance_wm2 / 1000 * (1 + g.temperatureCoefficient * (w.temperature - 25)) * g.solarEfficiency, 0, 1));
    g.availableKw = clamp(raw * noise, 0, g.ratedKw);
    g.targetKw = g.on ? Math.min(g.availableKw, g.ratedKw * g.limitPct / 100, g.targetLimitKw ?? Infinity) : 0;
    if (g.on && g.startupRemaining > 0) { g.targetKw = 0; g.startupRemaining = Math.max(0, g.startupRemaining - 1); }
    if (!plant.faults.actuatorStuck) g.powerKw = Math.max(0, g.powerKw + clamp(g.targetKw - g.powerKw, -g.rampKwPerSec, g.rampKwPerSec));
    g.status = generatorStatus(g);
  }
  plant.simulationSeconds++;
  const frame = makeFrame(plant, now, source, weatherData);
  plant.seconds = (plant.seconds + 1) % (plant.dataset.rows.length * 600);
  if (plant.seconds === 0) plant.loopCount = (plant.loopCount ?? 0) + 1;
  plant.history.push({ timestamp: frame.timestamp, sourceTimestamp: frame.sourceTimestamp, simulationSeconds: frame.simulationSeconds, powerKw: frame.powerKw, availableKw: frame.availableKw });
  if (plant.history.length > 300) plant.history.splice(0, plant.history.length - 300);
  return frame;
}
export function updateGenerator(plant, id, patch) {
  const allowed = ['ratedKw', 'rampKwPerSec', 'on', 'limitPct', 'targetLimitKw', 'startupDelaySeconds', 'cutInMs', 'ratedWindMs', 'cutOutMs', 'windCurve', 'temperatureCoefficient', 'solarEfficiency'];
  keys(patch, allowed, 'generator');
  const g = plant.generators.find((item) => item.id === id); if (!g) fail(`generator ${id}: 없습니다`);
  const next = { ...g, ...clone(patch) };
  for (const [field, min, max] of [['ratedKw', 1, 1e6], ['rampKwPerSec', .01, next.ratedKw], ['limitPct', 0, 100], ['startupDelaySeconds', 0, 3600], ['cutInMs', 0, 40], ['ratedWindMs', .1, 50], ['cutOutMs', .2, 60], ['temperatureCoefficient', -.02, .01], ['solarEfficiency', .01, 1]]) number(next[field], field, min, max);
  bool(next.on, 'on');
  if (next.targetLimitKw !== null) number(next.targetLimitKw, 'targetLimitKw', 0, 1e9);
  if (!(next.cutInMs < next.ratedWindMs && next.ratedWindMs < next.cutOutMs)) fail('cutInMs < ratedWindMs < cutOutMs이어야 합니다');
  if (next.windCurve !== null) {
    if (!Array.isArray(next.windCurve) || next.windCurve.length < 2 || next.windCurve.length > 100) fail('windCurve: 2~100개 [풍속,정격비율]');
    let previous = -Infinity;
    for (const point of next.windCurve) {
      if (!Array.isArray(point) || point.length !== 2) fail('windCurve: [풍속,정격비율]');
      number(point[0], 'windCurve 풍속', 0, 60); number(point[1], 'windCurve 정격비율', 0, 1);
      if (point[0] <= previous) fail('windCurve: 중복 없는 오름차순 풍속'); previous = point[0];
    }
  }
  if (!g.on && next.on) next.startupRemaining = next.startupDelaySeconds;
  if (!next.on) next.startupRemaining = 0;
  next.powerKw = Math.min(next.powerKw, next.ratedKw);
  next.availableKw = Math.min(next.availableKw, next.ratedKw);
  next.status = generatorStatus(next);
  Object.assign(g, next); return g;
}
export function updateReplay(plant, patch) {
  keys(patch, ['speed', 'paused', 'seed', 'noisePct', 'freezeLiveWeather', 'seconds'], 'replay');
  const next = { ...plant.replay, ...patch }; delete next.seconds;
  number(next.speed, 'speed', 1, 60, true); number(next.seed, 'seed', 0, 2 ** 32 - 1, true); number(next.noisePct, 'noisePct', 0, 50);
  bool(next.paused, 'paused'); bool(next.freezeLiveWeather, 'freezeLiveWeather');
  if (own(patch, 'seconds')) number(patch.seconds, 'seconds', 0, plant.dataset.rows.length * 600 - 1, true);
  plant.replay = next;
  if (own(patch, 'seed')) plant.rngState = patch.seed;
  if (own(patch, 'seconds')) plant.seconds = patch.seconds;
  return plant;
}
export function updateWeather(plant, patch) {
  keys(patch, ['mode', 'wind_speed_ms', 'wind_direction_deg', 'irradiance_wm2', 'temperature'], 'weather');
  if (own(patch, 'mode') && !['csv', 'weather'].includes(patch.mode)) fail('mode: csv / weather');
  const next = { ...plant.weather };
  for (const [field, min, max] of [['wind_speed_ms', 0, 40], ['wind_direction_deg', 0, 360], ['irradiance_wm2', 0, 2000], ['temperature', -40, 60]]) if (own(patch, field)) next[field] = number(patch[field], field, min, max);
  next.wind_direction_deg %= 360;
  plant.weather = next;
  if (own(patch, 'mode')) plant.mode = patch.mode;
  if (Object.keys(patch).some((k) => k !== 'mode')) { plant.weatherSource = 'manual'; plant.weatherObservedAt = null; plant.weatherError = null; }
  return plant;
}
export function updateFaults(plant, patch) {
  keys(patch, Object.keys(DEFAULT_FAULTS), 'faults');
  const next = { ...plant.faults, ...patch };
  for (const field of ['offline', 'sensorFreeze', 'scadaReject', 'actuatorStuck']) bool(next[field], field);
  number(next.latencyMs, 'latencyMs', 0, 30000); number(next.dropPct, 'dropPct', 0, 100);
  plant.faults = next; return plant;
}
export function publicPlant(plant) {
  const { dataset, irradianceDataset, ...rest } = plant;
  const meta = (ds) => ds ? { unit: ds.unit, semantics: ds.semantics, interpolation: ds.interpolation, rowCount: ds.rows.length, durationSeconds: ds.rows.length * 600, firstTimestamp: ds.rows[0].timestamp, lastTimestamp: ds.rows.at(-1).timestamp } : null;
  return { ...clone(rest), dataset: meta(dataset), irradianceDataset: meta(irradianceDataset), ...snapshotPlant(plant), id: plant.id, name: plant.name, type: plant.type, generators: clone(plant.generators) };
}
