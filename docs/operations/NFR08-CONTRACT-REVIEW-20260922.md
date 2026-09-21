# NFR-08 documentation and client review

Reviewed source at HEAD f9147d1 (2026-09-22 KST). Scope: protocol, internal contracts, UI guide source, MQTT client/parser, current server topic/payload producers, checked-in CSV samples. No remote writes, MQTT publication, RTU creation, or full test suite execution. This is a source review, not final delivery acceptance or external AWS/VPP verification.

## Findings requiring root decision

1. **P2 — standalone protocol quickstart misses environment preparation.** `docs/protocol.md:24-29` runs `npm run broker` then `npm start` without applying `.env.example`. `docker-compose.yml:5` exposes 18883; `server/config.js:8` defaults to 1883. A fresh checkout following only this block starts disconnected or connects to an unrelated broker on 1883. The introductory paragraph describes optional environment use but does not perform it. README lines 13-21 already supply the correct environment step. Proposed protocol correction: use `npm ci`, prepare `.env` only when absent (never overwrite existing configuration), retain the broker/build/start sequence, and label the resulting local UI as 3101 and broker as 18883. Runtime-default 3001/1883 may remain documented separately. Protocol is runtime-hashed; no edit made here.

2. **P2 — monitor discards RTU online status.** `scripts/client-message.js:20` returns a narrowed payload without `online`; `scripts/vpp-client.js:36` prints that result. RTU status producers in `server/transport.js` send `{rtuId,online,...}`. Pure local parser fixtures using both true and false returned identical objects with `status:null` and no online field. Thus protocol line 231's instruction to inspect RTU status cannot distinguish online/offline with the supplied monitor. Proposed runtime correction: include a strictly boolean `online` (otherwise null) in parsed status output, with focused fixtures for retained online and LWT offline; do not change command-status meaning.

3. **P3 — protocol carries unsupported legacy migration wording.** `docs/protocol.md:171` promises v1 command-ID preservation and possible `legacy_accepted`. Current `server/store.js` creates/loads `command_runs`; `server/control.js` contains no legacy migration/read path and `scripts/client-message.js:2` does not accept `legacy_accepted`. The greenfield instruction expressly excludes legacy implementation reuse. Proposed correction: remove the legacy sentence or explicitly state old v1 DB migration is outside this greenfield contract; do not present old DBs as supported inputs. No protocol/runtime edit made here.

## Safe documentation correction applied

`docs/operations/CONTRACTS.md` now distinguishes public health/config endpoints, accurately scopes command cancellation to generator model edits/scenario restoration, and states the actual bare-runtime versus example/Compose ports. This changes internal documentation only.

## Checks that matched

- Per-RTU telemetry, ack, command-status, status, setpoint and command topic directions agree between protocol, transport and client. Configured prefix is used by server/client; UI uses the selected RTU's telemetryTopic to derive examples.
- QoS1/retain=false for telemetry/commands/results and retained RTU status/LWT agree. Client subscribes before dispatch, sends a generated commandId, waits for its actual terminal status and never synthesizes completion from PUBACK.
- Timeout/report environment names and report schema fields agree; absent observed serverVersion/runId remain null. Report writes use a same-directory temporary file then rename.
- Current telemetry fields match Store batching and model frame construction: immutable envelope, samples/scada, summary fields, timestamp/sourceTimestamp/runId, electrical provenance and customWindCurve boolean.
- Samples wind.csv, solar.csv and hybrid.csv all parsed locally with the current parser: 144 rows each, 2026-09-20T15:00:00.000Z through 2026-09-21T14:50:00.000Z. No server was started and no user data was changed.

Review is limited to the above files and pure fixtures; existing deployment evidence is not re-certified by this note.
