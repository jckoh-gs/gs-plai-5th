# UI implementation and browser QA

2026-09-21, local application http://127.0.0.1:3101, native Chrome through cua_repl. Browser-tab provider failed request-header-policy loading twice; native Chrome fallback succeeded.

Observed:
- Dark green/lime dashboard shows three initial plants, aggregate live MW, rating, commanded-on count and separate producing count. SSE state updates visible.
- Wind scene rendered; solar and hybrid scenes rendered with plant selection, correct generator types. Solar panel angle improved after inspection to present its cell surface to initial camera. Lazy Three bundle is separate (886 kB / 239 kB gzip); build warning is retained.
- Registered `UI 인수 시험 RTU`, 1×1000 kW, ramp100, TSV containing timestamp/power_kw/voltage/current_a. Blank coordinates produced labeled 지역 인근 가상 좌표. ID `9f1c351d-7364-4967-bdf0-fc375fc38162`.
- REST target command `74dfc78d-a3f2-4c7d-a232-74bc1a04d4e5` visibly transitioned executing→completed with target25 / actual25 kW. Native numeric input automation entered25 (not intended125); verification claims25 only.
- Saved `UI 검증 · 25kW`; restored via UI, runId changed eeb587c4-3b3e-49bb-a836-53fd2a63c6dc→adb1131b-3ac8-4afe-8880-b4de725c5ea8. This dedicated test RTU remains in local DB for audit, with no injected faults.
- RTU page shows real generated sample count, HEALTHY/WAITING states, queue, exact clientId, original voltage/current, proportional estimated current, and completed REST command.
- Guide retains selected test RTU and renders its exact telemetry/status/ack/command-status topics.
- Final build succeeds. Three chunk warning only.

Implemented but needing broader independent browser acceptance: remote authenticated login/SSE, stale5s behavior under connection interruption, all six fault controls, all model fields, keyboard accessibility at narrow viewport, actual guide/sample/export download, wind drag/zoom/direction controls, error entry paths. Unit/API integration tests do not substitute for these UI interactions.

## Round 2 — isolated authenticated fixture

Actual native Chrome CUA interactions at port3103, dedicated hybrid RTU1198d24d-8257-4d8b-baa9-169461b827e6. Token was a synthetic test credential; no token screenshot was captured. API setup registered only the dedicated fixture; browser controls performed all subsequent changes.

All six faults applied and independently confirmed from API, then all reset through UI. Replay5×, seed777, live-weather freeze, pause/resume; wind model rated1001/ramp101/startup1/cutIn2/rated13/cutOut26/custom curve; solar efficiency0.8/temp coefficient−0.003; irradiance CSV2 rows registered and cleared. Manual weather mode and direction241°, keyboard CSV seek601 applied. Hybrid drag and wheel zoom visibly changed camera; corrected panel tilt exposes solar cells. Selected RTU persisted across dashboard/lab. Invalid CSV displayed `csv 행 3 power_kw: 유한한 숫자여야 합니다` and created no partial RTU. Wind CSV and scenario JSON downloads showed 완료 and downloaded contents were read and validated.

Evidence reconciler `scripts/browser-flows.cjs` asserts API state and exact downloaded artifacts. It explicitly does not automate UI and does not substitute API assertions for browser observations. Result: `artifacts/checkpoints/browser-flows/result.json` PASS. All injected faults cleared. Model/replay changes remain only on named QA fixture for reproducible evidence; no other plants changed. No file screenshots exported via undocumented CUA APIs.

Round2 code fixes: replay noise max50 matches contract; telemetry example uses rtuId; outbox guide distinguishes PUBACK completion marking from later retention deletion. `npm run build` passed after fixes.
