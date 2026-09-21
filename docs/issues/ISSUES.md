# 이슈 관리

신규 구현 전용. 독립 검토자 `/root/issues`. 운영 기준은 `docs/operations/run.json`, PRD 1.7이다. 다른 프로젝트 구현이나 과거 인도 증거를 사용하지 않는다. 아래 수정 검증은 작업본에서 수행했으며 배포 완료를 뜻하지 않는다.

## ISSUE-001 — 합성 샘플의 timestamp 형식 불일치

- 중요도: P1. 발견: 메인 개발 중.
- 증상/재현: 샘플 generator의 기존 ISO 밀리초 출력이 엄격한 CSV 날짜 parser에서 거절되어 데모 초기 등록 불가.
- 기대/실제: 배포 동봉 샘플 3종 모두 등록 가능해야 함 / 수정 전 거절(메인 보고; 독립 검토에서는 수정 전 실행 재현하지 않음).
- 원인: `.000Z` 포함 출력과 parser 계약 불일치. 소스 수정에서 `.replace('.000Z','Z')` 확인.
- 담당: 메인. 진행: 수정 적용 및 독립 회귀 검증 완료.
- 수정 commit: 아직 없음, 작업본 SHA는 `evidence/review-001-source.json`.
- 회귀: `tests/review-regressions.test.js`는 temp 디렉터리에서 실제 생성기를 실행, wind/solar/hybrid 각 144행 parser 통과와 총 시간 간격을 검증. `evidence/review-001.log` 통과.
- 잔여: k3s 빈 DB 데모 생성 시험과 실제 UI 확인 전 릴리스 범위 종료 아님.

## ISSUE-002 — 비동기 기상 결과가 이후 편집을 덮어쓸 수 있음

- 중요도: P1. 발견: 제품 검토 001.
- 증상/재현: 기상 HTTP 요청 지연 중 수동 기상 또는 관측소 변경 후 오래된 응답 도착.
- 기대/실제: 최신 사용자의 설정 우선 / 보호 없으면 이전 사본의 기상과 mode 저장 가능(원인 소스 확인, 수정 전 실행 재현은 없음).
- 원인: clone에 적용한 비동기 결과를 최신 plant와 비교 없이 저장하는 경합.
- 담당: 메인. 진행: signature 비교 수정, 독립 HTTP 회귀 검증 완료.
- 수정 commit: 작업본; SHA 별도 기록.
- 회귀: `tests/review-regressions.test.js`가 실제 Express endpoint 호출과 제어 가능한 KMA 응답을 사용. 수동 변경과 station 변경 두 경우 지연 응답 후 live Map 및 SQLite가 변경 전 최신 상태와 완전히 동일함. `evidence/review-001.log`.
- 잔여: 두 동시 요청 순서, 스냅샷 복원 경합, UI 브라우저 기상 흐름은 별도 검증 필요. 이 시험은 실제 기상청 접속을 주장하지 않음.

## ISSUE-003 — 지연된 transport callback의 오래된 모델 저장

- 중요도: P1. 발견/수정: 메인.
- 증상: publish 지연 동안 변경된 simulationSeconds가 callback의 이전 객체 저장으로 되돌아갈 가능성.
- 기대: callback는 최신 모델을 사용해야 함.
- 원인: capture한 객체와 현재 Map 객체의 생애주기 차이(메인 보고 및 수정 코드 확인).
- 담당: 메인. 진행: 회귀 검증 완료, 수정 commit 없음.
- 회귀: `tests/transport.test.js`의 `delayed pump reads latest model object and REST receipts persist` 독립 재실행, SQLite simulationSeconds=100 확인. `evidence/review-001.log`.
- 잔여: 실제 브로커/k3s fault 주입에서 이 경계만을 별도로 관측하지 않음.

## ISSUE-004 — 상위 transaction 실패 시 nested 명령 cache 불일치

- 중요도: P1. 발견/수정: 메인.
- 증상: 모델 저장 실패가 DB rollback을 일으켜도 취소된 command 메모리 cache가 복원되지 않을 수 있음.
- 기대: 원자적 실패 시 DB/메모리 모두 이전 accepted 유지.
- 원인: nested transaction의 rollback 경계(메인 보고). 수정 전 별도 실행 재현 없음.
- 담당: 메인. 진행: 회귀 검증 완료, 수정 commit 없음.
- 회귀: `tests/control.test.js`의 `outer model transaction rollback also restores nested command cancellation cache`와 durable dispatch failure 시험 독립 재실행 통과. `evidence/review-001.log`.
- 잔여: 디스크 용량 부족 등 실제 저장장치 장애 시험은 별도 범위.

## ISSUE-005 — 인수 기준과 현재 실행 증거의 범위 차이

- 중요도: P1 릴리스 게이트. 상태: OPEN. 담당: 메인, 제품 검토, 독립 검증.
- 확인: acceptance ledger는 142개 항목 모두 pending. 통합/고급 통합 PASS 로그는 존재하지만 전체 기준 충족은 아님.
- 재현/근거: `scripts/test-harness.js`는 telemetrySeconds=1. 따라서 AT-MQTT-02의 정상 60초/60샘플은 아직 증명하지 않음. `advanced-integration.js` restart는 runtime.stop()을 사용하므로 AT-MQTT-06의 PUBACK 이전 프로세스 종료 및 VPP dedup 증거가 아님.
- 기대: 요구사항별 직접 증거로 판정하고 narrow test로 broad pass 처리 금지.
- 추가 부족: k3s rollout/외부 UI, 인증 브라우저, 3D/선택/도구 사용, SSE 큰 payload, 안정 버전 manifest/격리 복원, 최종 1080p 음성/자막 동영상 및 PPT 렌더 검수.
- 조치: 메인에 즉시 전달. 실제 60초 interval 시험, 강제 종료/복구 시험, 브라우저와 배포/복원 시험을 수행하고 해당 source revision 기록할 것.
- 회귀 증거/종료: 대기. 시간 제한으로 미완료면 사실대로 잔여 목록에 남길 것.

## 검토 운영

메인 변경 후 재호출을 받아 차이를 점검한다. 수정 source hash와 실행 로그를 같은 review 번호로 묶는다. 코드 존재, 테스트 이름, 담당자 완료 선언만으로 릴리스 이슈를 닫지 않는다. 알려진 수정 사항은 회귀 완료로 기록하되 최초 실패의 독립 재현 유무를 명시한다. 새 P0/P1은 즉시 메인에 전송한다.

## Round 2 — ISSUE-005 세부 게이트 갱신

이 절은 Round 1의 당시 미검증 기록을 다음 범위에서 갱신한다. ISSUE-005 전체 상태는 계속 OPEN이다.

- **005-A / AT-MQTT-02: 로컬 요구 범위 검증 완료.** `scripts/sixty-second-integration.js`와 harness의 실제 `telemetrySeconds:60` override를 확인했다. `artifacts/checkpoints/sixty-second-first.log`는 초기 구간 59, 다음 완전 구간 60개이며 각 simulationSeconds 차이가 1인 것을 assertion으로 검증한다. 실제 관측 timestamp 범위는 08:20:05.245Z~08:21:04.296Z. 이 로그는 메인 실행 증거이며 독립 검토에서는 소스-로그 범위를 대조했다. 원격 k3s 성능 증거로 확대 해석하지 않는다.
- **005-B / AT-MQTT-06: 로컬 crash/재전송/fixture 수신기 중복 제거 검증 완료.** TCP proxy는 MQTT framing을 해석하여 broker→RTU PUBACK만 버린다. subscriber가 telemetry를 수신한 뒤 child에 SIGKILL, SQLite outbox acked=null/원본 body를 읽고 같은 DB 재기동 후 동일 ID와 JSON body를 확인한다. 독립 재실행 `evidence/review-002-crash.log` PASS. 수신기 dedup은 fixture의 Set이며 제품 CLI dedup 실행 검증이라고 표현하면 안 된다. 이 테스트는 강제 종료 경계에 대해 Round 1 graceful-stop 부족을 보완한다.
- **005-C / AT-VPP-REPORT-01~04: 일부 검증, 추가 검증 필요.** `report-first.log`와 실행 소스는 실제 CLI success exit0/125kW/오차0, observed timed_out exit1, unreachable broker 유한 종료 및 null 관측, 저장 실패 exit1을 증명한다. 그러나 saved JSON의 commandId 및 전체 전이/출력과 독립 subscriber 수신을 대조하지 않음. 저장 실패 case는 error 문구/exit만 검사하므로 '자동 재발행 없음'은 실행 assertion이 없고 소스 inspection 수준. 시험용 credential 비노출 fixture, result_wait_timeout과 observed timed_out 구별도 추가 증거 필요.
- **005-D / AT-VPP-REPORT-05: OPEN.** 결과 파일 없는 monitor/dispatch의 실제 호환성, schemaVersion2, 해당 최종 revision 전체 테스트/build 및 stable 태그 증거 연결 대기.
- **005-E / 브라우저 인수: OPEN.** browser-round2 스크린샷 파일 존재는 확인했으나 이번 검토는 픽셀/상호작용 확인을 수행하지 않음. main의 실제 DOM/console/UI 조작 증거를 요구사항별 연결할 것. 스크린샷만으로 명령 성공/SSE stale 복구를 추정하지 않는다.
- **005-F / k3s·backup/restore·manifest: OPEN.** rollout와 실제 접근/RTU 제어, 버전/이미지 식별, 격리 복원 DB/outbox/UI/MQTT 증거 대기.
- **005-G / 동영상·PPT: OPEN.** 최종 배포 버전의 1080p decoding, 음성/한글 자막, 포인터/확대 효과 및 PPT render QA 대기.

## ISSUE-006 — replay loopCount의 실제 wrap 기록

- 중요도: P2. 발견/수정: 모델 담당/메인; 독립 검토시 수정되어 있음.
- 기대: 데이터 끝→처음 실제 전이만 증가하며 seek는 증가시키지 않고 pause는 유지. snapshot 복원 시 저장된 값 유지.
- 원인/수정: source에서 `stepPlant`의 wrap 시 `loopCount` 증가 및 createPlant 초기값0 확인. 수정 전 오류의 별도 실행 재현 없음.
- 담당: 메인. 상태: 작업본 회귀 검증 완료; 릴리스 commit 대기.
- 회귀: `tests/model.test.js`의 `loop count records actual dataset wraps, not seeks, and survives scenario JSON snapshots` 독립 재실행. 1199→0 증가, seek 비증가, structured JSON snapshot 복원, pause 비증가를 검증. 이 시험은 실제 UI나 SQLite 재시작까지 증명하지 않음.
- 증거: `evidence/review-002-unit.log`, 19/19 pass. 샘플 생성/기상 경합 독립 regression도 함께 통과. 해당 source와 검사한 로그 SHA는 `evidence/review-002-source.json`.

## ISSUE-007 — expiresAt의 비 ISO/존재하지 않는 날짜 허용

- 중요도 P2, 확인된 입력 검증 결함. 상태: 수정 및 독립 회귀 완료, 최종 배포 revision 대기. 담당/수정자: `/root/issues` (메인에 변경 전 통보).
- 원인: `Date.parse` 성공 여부만 검사하면 `'1'`을 날짜로 해석하고 `2099-02-30T00:00:00Z`를 3월로 정규화한다. 전자는 rejected 대신 expired, 후자는 accepted가 될 수 있다.
- 수정: `server/control.js`에서 T·초·명시적 timezone을 요구하는 ISO 형식과 달력 유효성을 검사한다. 정상 UTC/offset 및 소수초 1~3자리, expiresAt 생략 기본값은 유지한다.
- 회귀: `tests/review-control.test.js`에서 숫자/비 ISO/없는 날짜/24시/잘못된 월 거절 및 정상 offset·millisecond 허용. 실제 broker의 impossible-date 명령도 rejected 수신.
- 증거: `evidence/review-003-unit.log` 11/11, `evidence/review-003-mqtt.log` PASS. 최종 commit과 배포 매핑은 메인이 릴리스 기록에 연결해야 한다.

## Round 3 — 독립 제어·보존 검증

- **expiresAt 본문 변경:** 같은 commandId에서 expiresAt만 바꾼 요청 거절을 단위 및 실제 MQTT 양쪽 검증. AT-CONTROL-05의 이 경계 보완.
- **잘못된 명령:** 실제 Mosquitto 경로에서 schemaVersion1, setpoint에 stop action, 없는 generator, 문자열/음수 target, 없는 날짜, 깨진 JSON, 8192바이트 초과 입력 8종 rejected 수신. oversized/malformed는 commandId=null ack임을 명시적으로 검사. AT-CONTROL-06 보완; 모든 가능한 잘못된 수치 조합을 전수 검증했다고 주장하지 않음.
- **우선순위:** 동일 priority의 겹치는 새 명령은 기존 superseded, 다른 generator 대상은 accepted 유지. 기존 높은/낮은 우선순위 검증과 함께 AT-CONTROL-08 보완.
- **실제 SQLite 재개:** DB를 닫고 새 Store/Controller로 미완료 executing command를 읽고 원래 deadlineAt 보존, deadline 경과시 timed_out 확인. 서버 프로세스 전체 재기동은 별도 통합 증거와 결합한다.
- **timeout 후 stop:** timeout 시 targetLimitKw=250 및 on=true 유지, 후속 stop→모델 step으로 on=false와 실제 powerKw=0 및 completed 확인. stop은 저장된 targetLimitKw 숫자를 삭제한다는 의미가 아니라 발전기 정지 동작이다. PRD §6.5 의미에 맞춰 검사했다.
- **보존기간:** 오래된 ACK 완료 outbox 및 연결 frame 삭제, 오래된 미확인 outbox의 body 동일 유지, pending/unbatched frame 유지, 명령 ID 및 scenario 유지. `tests/review-retention.test.js`. 차트용 samples는 독립 보존기간 정리되며 미전송 원본은 scada_frames/outbox에 남는다.
- **센서 누락:** 실제 broker/runtime에서 freeze 2301ms 동안 frame 수 불변, 재개 frame timestamp는 해제 이후, freeze 구간 timestamp 존재하지 않음, 양쪽 관측 간격≥2300ms. AT-MQTT-08의 no-backfill 직접 증거.

ISSUE-005의 배포/브라우저/복원/미디어 등 다른 게이트는 이 검증으로 닫지 않는다.

## Round 4 — 실제 프로세스 중단 후 미완료 제어 복원

`review-process-restart.js`는 별도 임시 DB·포트·무작위 MQTT prefix를 사용하고 실제 로컬 Mosquitto에서 수행했다. 기존 root/원격 런타임은 건드리지 않았다.

- REST로 실제 가용 출력보다 높은 1800kW 목표/8초 timeout을 접수하고 MQTT `executing` 수신 후 child 프로세스에 SIGKILL.
- 동일 SQLite에서 새로운 PID로 deadline 이전 재기동, REST 명령 조회가 executing이며 deadlineAt 원문 동일함을 확인.
- MQTT timed_out 수신 시각은 원 deadline보다 149ms 뒤. 재시작에 의한 timeout 연장 없음.
- timeout 뒤 발전기 targetLimitKw=900과 on=true 보존, 명시적 stop 접수 후 MQTT completed 및 REST on=false/powerKw=0 확인.
- `evidence/review-004-process.log` PASS. 이는 AT-CONTROL-10의 실제 프로세스 재시작 공백을 보완하고 AT-CONTROL-11의 timeout/stop 동작을 end-to-end로 증명한다.

별도 backup 복원 범위는 기존 `restore-integration.js` 소스 검토상 health/CSV/runId/scenario/명령 ID/실제 telemetry까지 검증한다. backup 시점에 미확인 outbox가 실제 존재하는 fixture, 복원 후 그 동일 body 전송, 복원 UI 조작 및 새 제어 왕복은 이 스크립트가 증명하지 않으며 다른 검증과 연결할 필요가 있다. 메인에 잔여 범위를 전달했다.

## Round 5 — 백업 outbox 및 복원 후 새 제어

이전 Round 4의 backend 복원 공백을 실제 실행으로 보완했다. `scripts/restore-integration.js`가 offline 상태에서 실제 pending telemetry를 기다린 다음 online backup API로 snapshot을 생성한다. 백업 DB에서 해당 ID의 acked=null과 원 body 일치를 확인한다. 별도 restore.sqlite, 새 MQTT prefix/client에서 복원하고 fault도 snapshot 값으로 복원됐는지 확인한다. offline 해제 후 broker가 받은 **raw UTF-8 body**를 백업 전 원 body와 완전히 비교한다. messageId/sequence/runId/rtuId와 원 관측값을 보존하고, 실제 PUBACK 후 restored DB acked 저장까지 검증한다.

이어 복원된 RTU에 새로운 MQTT setpoint 75kW를 보내 accepted→executing→completed, actualKw=75/errorKw=0을 확인했다. `evidence/review-005-restore.log` PASS. 변경 전 root/원격 DB는 사용하지 않고 임시 격리 fixture만 사용했다. **복원 UI 조작은 이 시험에 포함하지 않는다.** 메인이 별도 브라우저 시험으로 연결한다.

## ISSUE-008 — 첫 상태 수신 전 연결 배지 의미

- 중요도 P3. 수정자: 메인. 상태: 메인 브라우저 검증 PASS의 소스-증거 대조 완료.
- 증상/원인: 처음 유효 snapshot을 받기 전에도 '다시 연결 중'으로 표시하여 초기 대기와 재연결을 구별하지 못함.
- 수정: `updatedAt`이 없을 때 '상태 수신 대기', 이후 정상/지연/재연결 분기 유지. 기존 AT-FRESH 요구의 구현 보완이며 새 범위 아님.
- 증거: `scripts/browser-check.cjs`의 최초 `/api/state` 503 경계, 열린 SSE chunk 전달 중단, socket 단절, 복구 UI assertions와 `artifacts/checkpoints/browser-stream-boundaries.log` PASS를 대조했다. 이번 이슈 담당자가 브라우저 시험을 직접 재실행한 것은 아니다.
- 잔여: 실제 최종 배포 revision 연결과 복원 UI 흐름은 메인 검증 범위.

## ISSUE-009 — 완료된 start/stop/set_limit의 목표 출력 표시 누락

상태: 수정 및 실제 브라우저 검증 완료, 다음 최종 이미지 반영 대기. 명령 결과 표가 request.targetKw만 읽어 start/stop/set_limit의 관측된 대상별 목표를 비워 표시했다. targets가 비어 있지 않고 모든 targetKw가 유한한 경우에만 합계를 표시한다. 피드백 전 null을0으로 만들지 않는다. UI 검증에서 stop0/0, start400.2/400.2, set_limit400.2/400.2,100%복귀925.1/925.1을 확인했다. 증거: artifacts/checkpoints/browser-flows/review004-ui.json 및 controls-stages.json, web/QA.md.
