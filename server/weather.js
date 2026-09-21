import { parseTimestamp } from './model.js';

// KMA SFCTM2: TM STN WD WS ... TA(index11). SI is accumulated MJ/m²,
// deliberately excluded: it is not instantaneous irradiance.
export function parseKMA(text, { station, now = Date.now() } = {}) {
  if (typeof text !== 'string') throw new Error('KMA 응답은 텍스트여야 합니다');
  const candidates = [];
  for (const line of text.split(/\r?\n/)) {
    const clean = line.trim(); if (!clean || clean.startsWith('#')) continue;
    const fields = clean.split(/\s+/);
    if (!/^\d{12}$/.test(fields[0] || '') || fields.length < 12) continue;
    const observedStation = Number(fields[1]);
    if (!Number.isInteger(observedStation) || (station !== undefined && observedStation !== station)) continue;
    const t = fields[0];
    let observedAt;
    try { observedAt = parseTimestamp(`${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:${t.slice(10, 12)}`); } catch { continue; }
    const speed = Number(fields[3]), temperature = Number(fields[11]), direction = Number(fields[2]);
    if (!Number.isFinite(speed) || speed < 0 || speed > 100 || !Number.isFinite(temperature) || temperature < -60 || temperature > 60) continue;
    const weather = { wind_speed_ms: speed, temperature };
    if (Number.isInteger(direction) && direction >= 1 && direction <= 36) weather.wind_direction_deg = (direction * 10) % 360;
    candidates.push({ observedAt, station: observedStation, weather });
  }
  candidates.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const result = candidates[0];
  if (!result) throw new Error('KMA 유효 관측 행 없음 또는 응답 형식 변경');
  const age = now - Date.parse(result.observedAt);
  if (age > 3 * 60 * 60 * 1000) throw new Error('KMA 관측이 3시간보다 오래되었습니다');
  if (age <= -10 * 60 * 1000) throw new Error('KMA 관측이 현재보다 10분 이상 미래입니다');
  return result;
}
export const parseKmaObservation = parseKMA;
export async function refreshWeather(plant, { explicit = false, authKey = process.env.KMA_AUTH_KEY, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  if (!explicit && (plant.replay.freezeLiveWeather || plant.weatherSource === 'manual')) return { skipped: true };
  if (explicit) { plant.mode = 'weather'; plant.replay.freezeLiveWeather = false; }
  if (!authKey) { plant.weatherError = 'KMA_AUTH_KEY 미설정: 직전 유효 기상을 유지합니다'; return { ok: false, error: plant.weatherError }; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  // Track edits made while this request is in flight. An automatic response must not
  // overwrite a newly applied manual scenario or restored snapshot.
  const capturedWeather = plant.weather, capturedRun = plant.runId;
  try {
    const url = new URL('https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php');
    url.searchParams.set('stn', String(plant.station)); url.searchParams.set('help', '0'); url.searchParams.set('authKey', authKey);
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`KMA HTTP ${response.status}`);
    const observation = parseKMA(await response.text(), { station: plant.station, now });
    if (plant.runId !== capturedRun || plant.weather !== capturedWeather || (!explicit && (plant.replay.freezeLiveWeather || plant.weatherSource === 'manual'))) return { skipped: true };
    plant.weather = { ...plant.weather, ...observation.weather };
    plant.weatherSource = 'kma'; plant.weatherObservedAt = observation.observedAt; plant.weatherError = null;
    return { ok: true, observation };
  } catch (error) {
    // Never return fetch exception text: some implementations include URL/authKey.
    const safe = error.name === 'AbortError' ? 'KMA 조회 12초 시간 초과' : /^KMA (HTTP \d+|유효 관측 행 없음 또는 응답 형식 변경|관측이 3시간보다 오래되었습니다|관측이 현재보다 10분 이상 미래입니다)$/.test(error.message) ? error.message : 'KMA 조회 실패: 네트워크 또는 응답 오류';
    if (plant.runId === capturedRun && plant.weather === capturedWeather) plant.weatherError = safe;
    return { ok: false, error: safe };
  } finally { clearTimeout(timer); }
}
