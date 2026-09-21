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

## REVIEW-004 remaining UI acceptance

Native CUA at authenticated3103, same dedicated hybrid test RTU. Keyboard output slider20% resulted chart decline and rows200.2/200kW, aggregate400.2; stop showed chart0 and OFF rows; start returned400.2 and CURTAILED20%. Restored100% and total925.08. Separate API snapshots assert sum(generator power)=plant power=last chart sample for each stage.

RTU search `Round2 UI` yielded one row; select then 발전 제어 화면 preserved the selected fixture. Guide selection switched to solar RTU12833923-5f3c-42aa-9f33-4fd8930a3bf1 and four topics updated. Code-copy clipboard was pasted into an unsubmitted registration CSV draft, verified exact topic text, then canceled. Keyboard Tab moved selector→연결 준비; accessible labels and keyboard slider operation observed. Wind0°→140° visibly changed rotor-plane yaw with camera unchanged; restored241°.

Defect found: completed start/stop/set_limit result target column showed — despite server c.targets populated. Fixed fallback sum only for nonempty targets where all targetKw are finite; null feedback targets remain —. Built and refreshed browser, confirmed start400.2/400.2, stop0/0, restoredlimit925.1/925.1. No requirement/schema change. Evidence `artifacts/checkpoints/browser-flows/review004-ui.json` and `controls-stages.json` PASS. Root to assign central issue identifier. Test RTU final on=true,limit100%,direction241°,allfaultsfalse. Other plants not modified.

## IDEA-005 registration preview (1.1.0 candidate)

Native CUA on authenticated local fixture3103 exercised explicit preview without creating an RTU. Two kW rows100/200 at2026-01-01T09:00/09:10+09:00 showed rowCount2, linear interpolation, min100/max200, normalized rows100/200, UTC00:00/00:10Z and KST09:00/09:10+09:00. Changing unit removed prior preview immediately. Two kWh rows10/10 showed hold interpolation and both normalized60kW. Editing CSV immediately removed the result. Invalid power_kw `bad` on row3 displayed `csv 행 3 power_kw: 유한한 숫자여야 합니다`. Inline screenshot visually verified readable preview styling within the scrollable modal.

Native session became Mac-locked while preparing hybrid split preview; hybrid screenshot, complete scroll-to-footer, and narrow preview are not claimed here. Parent's controlled browser harness separately tests all4 input invalidations, delayed response success/error, duplicate guard, authenticated requests, and page errors. Native test did not create or alter an RTU. Code adds file-read revision protection for manual CSV edits and newer file selections, disables preview/registration during file read, reports read errors, and invalidates pending revisions on unmount. Build passed after this fix. File-read race behavior requires parent harness verification; code inspection is not recorded as behavioral proof.

## IDEA-006 recent command snapshots (1.2.0 candidate)

The Devices and Lab recent-command panels include `최근 명령 상태 JSON 내보내기` for the selected RTU. The button calls the authenticated download helper, which checks HTTP success before creating a blob/download. Filenames use sanitized RTU ID and UTC digits only. A synchronous ref blocks duplicate clicks while pending; errors appear locally. The panel identifies its selected RTU and describes at most20 recent stored-state snapshots, distinct from external VPP receipt evidence or a full audit log. Command panels are keyed by RTU so switching clears old rows/errors and isolates old async responses. No new dependency or CSV-preview change.

Production build passed. Native Mac remains locked; actual downloaded contents, authenticated failure without file, and RTU-switch isolation are assigned to the parent's browser harness. This note does not claim those behavioral checks from code inspection.

## IDEA-007 selected RTU scenarios (1.3.0 candidate)

Implements PRD FR-SCENE-03 / UI-10 / AT-SCENE-SELECT-01 in the existing scenario panel. Rendering filters each row by selected plantId. Title, loading state, empty state, and scope guidance identify the selected RTU and direct users to the existing RTU selector for another plant. Requests retain the original scenario IDs and server restore/export semantics. No API, storage, dependency, or scenario JSON change.

List request revisions and mounted-lifetime checks ignore late list/save completions after selection change. Success notices capture the actual request-time RTU name and UUID. Existing global operation busy state flows through Lab to disable scenario actions across A→B→A remounts; a synchronous local ref prevents duplicate clicks within one render, including downloads. Local errors/loading are distinct from an empty list. Existing Lab tab reset on RTU selection remains unchanged.

Behavioral acceptance is assigned to the parent's isolated browser fixture: same-name A/B scenarios, empty RTU, delayed list/save/restore responses, selection transitions, duplicate guards, actual exports, target-only restore effects, narrow and keyboard navigation. Source review is not behavioral evidence. Build was initially held at parent request to preserve the 1.2.0 dist for independent KMA error reproduction.

## ISSUE-020 KMA refresh feedback

Root reproduced the existing contradictory HTTP200/weatherError plus green-success notice in `artifacts/checkpoints/weather-feedback-before`. The refresh action now passes an explicit null notice to the existing global action helper: that one path clears/suppresses the green notice while preserving state refresh, busy accounting, and HTTP-error handling. Other action notices retain their behavior.

The weather panel displays a request-time RTU name/UUID receipt. A returned weatherError is shown as an alert with the returned source. Otherwise the receipt is neutral and asks the user to inspect actual source/observation time; HTTP200 is not claimed as a new observation success. A mounted-lifetime guard ignores receipts arriving after RTU/menu changes, and a synchronous ref plus disabled button prevents repeated refresh requests in the same mounted panel. Server contracts and weather mutation behavior are unchanged.

Full Vite build passed after ISSUE-020 and IDEA-007 source edits (main index-Bq6rJvbB.js, package still1.2.0 before root's planned version bump). Existing lazy3D chunk warning remains. Root owns actual missing-key, neutral return, and selection-transition browser acceptance; these are not claimed from source inspection.
