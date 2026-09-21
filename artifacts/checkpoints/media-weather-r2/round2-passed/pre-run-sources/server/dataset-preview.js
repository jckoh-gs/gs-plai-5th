import {parseCSV} from './model.js';

const kst = utc => `${new Date(Date.parse(utc) + 9 * 3600000).toISOString().slice(0, -1)}+09:00`;
const total = row => row.power_kw ?? (row.wind_power_kw + row.solar_power_kw);

// Use the registration parser without constructing an RTU or touching persistence.
export function previewDataset(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('미리보기: 객체가 필요합니다');
  if (!['wind', 'solar', 'hybrid'].includes(input.type)) throw Error('type: wind / solar / hybrid');
  const dataset = parseCSV(input.csv, {type: input.type, unit: input.unit ?? 'kw', semantics: input.semantics ?? 'sample'});
  let minPowerKw = Infinity, maxPowerKw = -Infinity;
  for (const row of dataset.rows) {
    const power = total(row);
    minPowerKw = Math.min(minPowerKw, power);
    maxPowerKw = Math.max(maxPowerKw, power);
  }
  const first = dataset.rows[0], last = dataset.rows.at(-1);
  return {
    schemaVersion: 1, type: input.type, unit: dataset.unit, semantics: dataset.semantics,
    interpolation: dataset.interpolation, rowCount: dataset.rows.length, intervalSeconds: 600,
    start: {utc: first.timestamp, kst: kst(first.timestamp)},
    end: {utc: last.timestamp, kst: kst(last.timestamp)},
    powerSource: first.power_kw !== undefined ? 'power_kw' : 'wind_plus_solar',
    minPowerKw, maxPowerKw,
    rows: dataset.rows.slice(0, 3).map(row => ({...row, totalPowerKw: total(row), timestampKst: kst(row.timestamp)})),
  };
}
