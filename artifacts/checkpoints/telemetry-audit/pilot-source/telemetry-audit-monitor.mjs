// A separate read-only subscriber; never restarts or replaces the primary soak.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import mqtt from 'mqtt';
import {createTelemetryAudit} from './telemetry-audit.mjs';

const run = JSON.parse(fs.readFileSync('docs/operations/run.json', 'utf8'));
const freezeAt = Date.parse(run.freezeAt);
const requestedSeconds = process.env.TELEMETRY_AUDIT_SECONDS === undefined ? null : Number(process.env.TELEMETRY_AUDIT_SECONDS);
if (!Number.isFinite(freezeAt) || Date.now() >= freezeAt || requestedSeconds !== null && (!Number.isFinite(requestedSeconds) || requestedSeconds <= 0)) throw Error('Invalid or expired observation window');
const stopAt = Math.min(freezeAt, requestedSeconds === null ? freezeAt : Date.now() + requestedSeconds * 1000);
const token = fs.readFileSync('artifacts/private/deploy/api-token', 'utf8').trim();
const response = await fetch(`${run.deployment.uiTunnel}/api/state`, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(8000)});
if (!response.ok) throw Error('Baseline API unavailable');
const state = await response.json();
const audit = createTelemetryAudit(state.plants);
const sessionId = randomUUID();
const startedAt = new Date().toISOString();
const parent = 'artifacts/soak/telemetry-audit';
fs.mkdirSync(parent, {recursive: true});
const out = process.env.TELEMETRY_AUDIT_DIRECTORY || `${parent}/${startedAt.replace(/[:.]/g, '-')}-${sessionId.slice(0, 8)}`;
fs.mkdirSync(out, {recursive: false, mode: 0o700});
let connectionErrors = 0, connections = 0, disconnections = 0, connected = false, stopping = false, lastConnectedAt = null, lastDisconnectedAt = null;
const client = mqtt.connect(run.deployment.mqttTunnel, {username: 'vpp-client', password: fs.readFileSync('artifacts/private/deploy/client-password', 'utf8').trim(), clientId: `audit-${sessionId}`, reconnectPeriod: 1500, connectTimeout: 10000});
client.on('error', () => connectionErrors++);
client.on('connect', () => {connected = true; connections++; lastConnectedAt = new Date().toISOString(); client.subscribe('vpp/rtu/+/telemetry', {qos: 1}, error => {if (error) connectionErrors++;});});
client.on('close', () => {if (connected) {disconnections++; lastDisconnectedAt = new Date().toISOString();} connected = false;});
client.on('message', (topic, bytes, packet) => {
  const result = audit.receive(topic, bytes, {retained: Boolean(packet.retain)});
  if (result.reasons.length) fs.appendFileSync(path.join(out, 'anomalies.jsonl'), JSON.stringify({observedAt: new Date().toISOString(), ...result}) + '\n', {mode: 0o600});
});
const snapshot = extra => ({schemaVersion: 1, runId: run.runId, sessionId, startedAt, checkedAt: new Date().toISOString(), plannedStopAt: new Date(stopAt).toISOString(), expectedRuntimeCommit: run.deployment.sourceCommit, expectedAppImage: run.deployment.appImage, runtimeIdentityScope: 'Intended identity from run.json; use independent live Ready-image verification for actual identity', connected, connectionErrors, connections, disconnections, lastConnectedAt, lastDisconnectedAt, ...audit.snapshot(), ...extra});
function save(extra = {}) {
  const value = snapshot(extra);
  const pending = path.join(out, 'latest.json.part');
  fs.writeFileSync(pending, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
  fs.renameSync(pending, path.join(out, 'latest.json'));
  fs.appendFileSync(path.join(out, 'observations.jsonl'), JSON.stringify(value) + '\n', {mode: 0o600});
  return value;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {stopping = true;});
console.log(JSON.stringify({sessionId, directory: out, startedAt, stopAt: new Date(stopAt).toISOString(), readOnly: true}));
try {
  while (!stopping && Date.now() < stopAt) {save(); await new Promise(resolve => setTimeout(resolve, Math.min(10000, Math.max(0, stopAt - Date.now()))));}
} finally {
  await client.endAsync(true);
  const value = save({endedAt: new Date().toISOString(), endReason: stopping ? 'signal' : 'planned_stop', completionClaim: false});
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({sessionId, directory: out, endReason: value.endReason, invalidMessages: value.invalidMessages, completionClaim: false}));
}
