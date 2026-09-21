# 이슈 관리

신규 구현 전용. 독립 검토자 `/root/issues`. 현재 대조 기준은 제품1.7.0/PRD1.14 및 `docs/operations/run.json`이다. 다른 프로젝트 구현이나 과거 인도 증거를 사용하지 않는다. 아래 최초 발견·라운드 기록은 당시 상태이며, “commit 없음/배포 대기/현재/pending” 표현은 해당 시점의 이력이다. 현재 상태는 이 요약과 각 이슈의 마지막 후속 기록을 우선한다. 불변 증거·과거 실패·부분 snapshot은 삭제하거나 성공으로 바꾸지 않는다.

## 최종창 전 현재 상태 점검 — stable1.7

읽기 대조 근거는 `evidence/issue-status-pre-freeze-1.7.json`이다. 신규 실행·네트워크 재시험 없이 REVIEW037/038, 실제 복원 summary/태그/renderer receipt와 기존 이슈 회귀 근거를 대조했다. 현재1.7/runtime d98d3c4/image d1e4, 동일1cab snapshot의 현재1.7·이전1.6 복원23보고서+2Pod identity 및 매니페스트1731해시 검증과 원격 stable 태그가 완료됐다. 이것은 최종 영상·PPT·전체 작업시간 완료 선언이 아니다.

- ISSUE001–004·006–009: 기록된 수정과 독립 회귀 완료. 예전 “commit/최종 배포 대기”는 역사다. 현재 기능 체크포인트에 소스·시험 근거가 포함되지만 각 항목에 남긴 실제 저장장치 장애·특정 기상 경합·실브로커 단독 경계의 미시험 범위를 지우지 않는다. 실제 KMA 성공도 추정하지 않는다.
- ISSUE005: **OPEN — 최종창/최종 미디어/인도 게이트**. 초기142개 pending·60초/강제종료 증거 부재는 당시 기록이며 현재 상태가 아니다. 뒤의 실제60샘플/중단·재전송/보고서, 반복된 main UI·MQTT·정확 이미지·동일 백업 복원 및 REVIEW037/038로 기능 게이트는 보완됐다. 005-G와 최종 선택 버전의 신규 영상·같은 영상 PPT·검수·원래 시간 준수는 아직 완료가 아니다. 기존 기능복원 PASS를 최종창 새 선택의 PASS로 자동 전환하지 않는다.
- ISSUE010–019: 해당 전송/관측/검증도구의 수정과 기록된 회귀 완료. ISSUE015의 가짜 artifact 부정시험 PASS는 실제 media 검수와 다르다. ISSUE018의 host 대기 제한은 원격 취소 보장이 아니며 실제 잔여 작업 사건은 ISSUE024에서 별도 관리한다.
- ISSUE020–023: 기능 수정 검증 완료. ISSUE020의 실제 HTTP200 업무실패/중립·늦은응답 fixture 범위와 외부 KMA 미검증은 유지한다. ISSUE023의1.6 로컬·main·복원 및1.7 main66/양복원 이벤트 회귀·REVIEW033/037/038가 예전 독립 인수 대기를 해소한다. 이전1.5의 시각 대시는 알려진 버전 차이다.
- ISSUE024: 관찰된 사건 복구·backup 제한 보완·실제 재시험 완료, **최초 stall 원인 미확정/잔여 자원 위험 추적 유지**. 새 성공 snapshot으로 원래 사건의 원인을 확정하거나 기존 .part를 성공으로 해석하지 않는다.
- ISSUE025: **RESOLVED**. 운영 수정4b6009d, focused6 및 별도 전체312 PASS, client-only dry-run. 실제 재배포/rollback 검증을 새로 수행한 것은 아니다.

- ISSUE026: **FIX_VERIFIED_LOCAL / 원격·복원 인수 대기 — NFR08 연동 client/quickstart 계약 불일치**. 순수 before fixture에서 status online true/false 출력 유실을 확인했고 독립 quickstart 환경 준비 누락 및 지원하지 않는 legacy 문구를 함께 관리한다. IDEA012 v1/제품1.7.1/PRD1.15 채택 및 로컬 수정 검증 완료. 실제 main은1.7이며 원격·복원은 미완료다. 아래 최초 기록과 후속 참조.

번호가 없는 IDEA011 명령 목록 실패 가시성 기록도 현재 기능 인수 완료로 정리한다. 로컬8검증군의 합성503·header/body timeout·전환/해제 시험과 실제 main/현재1.7 복원 읽기, REVIEW037/038를 근거로 한다. 이전1.6에 신규 안내가 있다고 주장하지 않는다.

계속 남는 경계: 오디오의 실제 청취 미검증, 최종창 신규 미디어·동일 영상 PPT 검수, 실제 KMA/AWS/운영 VPP 외부 연동 미검증, 단일노드 k3s의 노드 HA 미검증은 해결로 바꾸지 않는다. SEC006의 현재 이미지 OS4매치/2CVE와 인증 사용자 자원 소모 잔여 위험은 보안 원장에 계속 연결한다. npm audit0/전체시험 PASS가 이를 해소하지 않는다. 원래 freeze21:37:33Z/deadline22:07:33Z를 유지하며 역할·전체목표는 아직 종료하지 않는다.


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
- 담당: 메인. 상태: 수정·회귀 완료; 최초 기록의 릴리스 commit 대기는 현재 stable 근거로 대체(상단 요약 참조).
- 회귀: `tests/model.test.js`의 `loop count records actual dataset wraps, not seeks, and survives scenario JSON snapshots` 독립 재실행. 1199→0 증가, seek 비증가, structured JSON snapshot 복원, pause 비증가를 검증. 이 시험은 실제 UI나 SQLite 재시작까지 증명하지 않음.
- 증거: `evidence/review-002-unit.log`, 19/19 pass. 샘플 생성/기상 경합 독립 regression도 함께 통과. 해당 source와 검사한 로그 SHA는 `evidence/review-002-source.json`.

## ISSUE-007 — expiresAt의 비 ISO/존재하지 않는 날짜 허용

- 중요도 P2, 확인된 입력 검증 결함. 상태: 수정 및 독립 회귀 완료, 현재 stable 소스·배포 근거 연결(상단 요약 참조). 담당/수정자: `/root/issues` (메인에 변경 전 통보).
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

상태: 수정 및 실제 브라우저 검증 완료, 현재 stable에 포함(상단 요약 참조). 최초 다음 이미지 반영 대기는 역사다. 명령 결과 표가 request.targetKw만 읽어 start/stop/set_limit의 관측된 대상별 목표를 비워 표시했다. targets가 비어 있지 않고 모든 targetKw가 유한한 경우에만 합계를 표시한다. 피드백 전 null을0으로 만들지 않는다. UI 검증에서 stop0/0, start400.2/400.2, set_limit400.2/400.2,100%복귀925.1/925.1을 확인했다. 증거: artifacts/checkpoints/browser-flows/review004-ui.json 및 controls-stages.json, web/QA.md.

## Round 6 — 시나리오 전체 필드/paused/미전송 보존

새 결함은 발견하지 않았다. `scripts/review-scenario-integration.js`를 격리 임시 DB·MQTT prefix 및 실제 로컬 broker로 실행해 `evidence/review-006-scenario.log` PASS를 얻었다.

- 실제 API로 paused=true, speed5, 위치317, seed7654/noise17, 수동 기상, 별도 일사 dataset, 발전기 제한/목표/램프/기동 지연/사용자 곡선을 구성한다. 기존 실제 발전 sample로 출력 상태와 history도 채운다.
- 저장 직전 전체 내부 plant를 독립 복제한 예상값과 JSON export의 snapshot을 deepEqual한다. dataset·irradiance dataset·모든 발전기 모델/실제 출력/제어·기상·장애·위치/배속/일시정지·rngState/faultRngState를 일부 요약값이 아니라 전체로 비교한다. 실제 history 및 명시적 임시 telemetryBuffer sentinel이 제외됨을 확인한다.
- 저장 후 필드를 다르게 바꾸고 복원, 허용된 runId 및 live-weather freeze 차이만 반영한 전체 예상 상태와 Map·SQLite를 deepEqual한다.
- 저장 전 offline으로 대기시킨 실제 telemetry row가 복원 후에도 같은 id/body로 존재한다. offline 해제 후 **paused가 그대로인 상태에서** 실제 MQTT 수신으로 기존 메시지 전송을 확인한다.
- pause 동안 simulationSeconds/frame 수가 변하지 않고 새 명령의 실제 시간 timeout은 계속 진행함을 확인한다.

이 증거는 FR-SCEN 저장/복원 필드, paused 의미, pending 보존 계약의 부족을 보완하며 UI 영상 또는 원격 배포 결과를 주장하지 않는다. 소스·로그 식별: `evidence/review-006-source.json`.

## ISSUE-010 — 대용량 원격 백업 전송 사본 잘림

상태: 수정 및 실제 전송·복원 검증 완료. 원격 online SQLite backup은 integrity_check=ok였으나 단일 kubectl stdout 바이너리 전송의 로컬 사본이167936bytes 짧아 무결성 검사에서 거부됐다. 원격 정상 원본은 보존했다. 압축 후256KiB 청크별 길이/SHA256, 전체 압축본 SHA256, 압축 해제본 길이/SHA256, 최종 SQLite integrity_check를 모두 확인하도록 보강했다. 실패한 사본은 채택하지 않고 private 영역에 구분 보존한다. 56594432bytes 원본을8청크로 전송했고 원격·로컬 SHA256이 일치했다. 같은 원격 snapshot을 새 전용PVC/최종이미지로 복원하여 실제 UI 및 MQTT125kW 왕복과 원본5단지/시나리오 보존을 확인했다. 증거: stable-backup-af7f223-round3.log와 stable-af7f223-restored-*; round2는 준비 스크립트 문자열 escape 오류 기록이며 원본 DB 결함이 아니다.

## Round 7 — 제품 1.1.0 / PRD 1.8 CSV 미리보기 독립 검토

현행 검토 기준을 제품1.1.0/PRD1.8로 갱신한다. 과거 라운드의 버전·미검증 기록은 당시 상태로 보존한다. `tests/review-preview.test.js` 추가 후 기존 preview/security 시험과 함께 12/12 PASS (`evidence/review-007-preview.log`).

- 3유형×2단위×2의미 12조합을 등록 parser와 비교. 표시하지 않는 네 번째 행의 최대값/끝 시각도 계산에 반영하며 그 행이 잘못되면 미리보기와 등록 모두 행5로 거절한다.
- 반환 최대3행 및 알려진 정규화 필드만 허용. 알 수 없는 열에 넣은 민감 fixture 값은 반환하지 않는다.
- 실제 HTTP에서 기존 단지가 있는 DB의 모든 테이블·total_changes·전체 모델을 요청 전후 비교. 인증 성공/실패 및 입력 오류에서 DB/모델 불변, MQTT sync/connect 호출 없음. runtime 타이머는 시작하지 않아 실제 부작용을 배경 수집과 혼동하지 않는다.
- 100000행 경계, 128열 경계, quoted delimiter/escaped quote/CRLF/multiline, 원문을 포함하지 않는 오류 응답은 보안 담당 수정 후 독립 재실행 PASS.

## ISSUE-011 — CSV parser 오류 응답의 원문 노출 및 할당 경계

중요도 P2, 담당/수정자 보안 세션, 상태 **수정·독립 회귀 완료**(최종1.1.0 배포 연결 대기). csv-parse 오류 문구가 잘못된 원 필드 내용을 포함할 수 있었다. 현재 `server/model.js`는 bounded code와 행 번호만 반환한다. 알 수 없는 prototype 명칭의 열도 own-property allowlist로 처리한다. parse 전 quote-aware128열 제한과 parse 중100000데이터행 제한을 적용한다. malformed sensitive-marker HTTP fixture에서 원문/토큰 미노출, authenticated400/unauthenticated401 확인. 증거 `tests/dataset-preview-security.test.js`, `evidence/review-007-preview.log`.

## 이전 게이트의 후속 증거 갱신

- **005-C 보고서 경계: 기능 검증 완료.** `report-round2.log` 및 현행 `report-integration.js`를 대조해 commandId/event/output을 독립 subscriber messageId와 비교, 저장 실패의 단일 발행, credential fixture 비노출을 확인했다. `report-timeout-first.log`는46.072초 후 result_wait_timeout/관측status=null/발행1로 서버 timed_out과 구분한다.
- **005-D 무보고서 호환성: 기능 검증 완료.** report-round2의 실제 monitor/dispatch 호환성 assertion 확인. 이것을1.1.0 최종 commit/image 릴리스 게이트 통과로 확대하지 않는다.
- **005-F 복원: 로컬 pending/outbox/새 제어는 Round5, 실제 프로세스 deadline은 Round4, 복원 브라우저 연결·stale·guide·오류 없음은 restored-browser/result.json이 보완한다.** ISSUE010에 메인이 기록한 별도 원격PVC/125kW 증거도 존재하나 이번 preview 검토에서 원격 실행을 재검증하지 않았다. 최종1.1.0 manifest/image/backup 일치는 별도 게이트.
- 전체 ISSUE005는 최종 릴리스 및 미디어/마감 게이트가 남아 OPEN이다.

## ISSUE-012 — 지연된 파일 읽기가 이후 CSV 수동 편집을 덮어쓸 위험

중요도 P2, 담당/수정자 메인. 상태 **수정 및 실제 브라우저 fixture 검증 완료**(최종1.1.0 배포 연결 대기). `File.text()` 비동기 완료 이전의 사용자 편집/다른 파일 선택과 경합하므로 fileRevision을 비교하고 오래된 결과를 무시한다. 파일 읽는 동안 등록/preview는 비활성화한다. previewRevision은 CSV/type/unit/semantics 변경시 늦은 성공/실패 응답을 무효화한다.

증거: `scripts/browser-preview-race.cjs`에서 File.text 지연 후 실제 다른 CSV 값으로 textarea를 편집하고 파일 읽기 완료를 풀어 최신 편집 유지, 파일 읽는 동안 두 버튼 disabled, 늦은 preview 성공/실패 폐기,390px 화면 page overflow 없음 확인. `artifacts/checkpoints/preview-browser/race.json` extended7requests PASS와 source를 대조했다. 브라우저는 메인이 실행했으며 독립 리뷰어의 추가 재실행은 아니다. 초기 fixture의 잘못된 버튼 selector 및 동일 값 fill로 change event가 안 난 실패는 제품 결함으로 기록하지 않는다.

## ISSUE-013 — 장시간 DB 증가에 대한 백업 메모리 및 실행 이미지 증거 경계

중요도 P2 운영 위험, 상태: streaming 수정과 증거 식별 보강 검증 완료. **실제 OOM은 관측하지 않았다.** 전체 SQLite를 readFileSync/gzipSync로 메모리에 적재하면14시간 증가한 DB에서1GiB 컨테이너 한도를 넘을 위험이 있어 메인이 remote gzip/hash 및 local chunk→file/gunzip/hash를 streaming으로 바꿨다.

독립 검토에서 deployment template만 비교하면 rollout 중 이전 pod에 exec할 수 있는 증거 경계를 발견했다. 허가받아 `pod-identity.mjs`를 추가, 정확히 하나의 Ready/nonterminating pod와 실제 app spec.image 및 container imageID digest를 검증한다. backup의 모든 exec를 해당 pod 이름에 고정하고 같은 UID/imageID가 유지되는지 **로컬 파일 승격 전** 재확인한다. remote-outbox-restart는 재시작 전후 실제 Ready pod image/digest와 UID 변경을 검사한다. verify-release의 --remote도 app와 mqtt 실제 실행 digest를 검사하며 큰 backup hash는 streaming 처리한다.

검증:
- 기존105144320바이트 immutable remote snapshot을 재전송,14청크와 전체 SHA256 일치/SQLite integrity ok. 원래 사본은 previous-transfer 이름으로 보존, 최종0600 확인. 새 metadata `deploy/verification/streaming-backup-8599ab9-identity-review.json`에는 전송 검증 대상 pod UID와 실제 imageID(`verifiedTransferPod`, `podVerificationStage=transfer`) 포함. snapshot 생성시각은09:31, 검증·재전송은09:36이므로 이 UID를 원래 snapshot 생성 pod로 주장하지 않는다.
- 실제 검증시 remote peak RSS85450752B, local206209024B. 이것은 이번105MB fixture의 관측이며 최대 향후 DB 크기 또는 완전 상수 메모리 보장은 아니다.
- Ready pod 없음/복수/종료중, 다른 spec image, 다른 실제 digest를 거절하는 단위 fixture PASS. 실제 app/mqtt Ready image도 읽기 전용 검증 PASS.
- remote-outbox-restart는 이번 변경 후 **다시 rollout하지 않았다**. 새로운 identity helper 단위/실제 읽기 검증과 이전 candidate8599 outbox 성공 증거를 구분한다. verify-release 전체 최종 manifest 검증은 릴리스 책임자가 수행한다.

실패 경로: 중간 실패하면 .part 및 remote gzip/backup을 남기며 PASS evidence를 만들지 않는다. 검증 전 local 승격하지 않고 기존 remote SQLite를 덮어쓰지 않는다. remote gzip 재생성과 검증 실패 시의 잔여 임시 파일은 데이터 손실 없이 후속 정리가 가능하다. timestamp/sourceCommit이 붙은 파일명은 provenance의 대체물이 아니며 재전송은 원래 snapshot capture 증거와 함께 사용해야 한다.

## Round 9 — 실제 느린 SSE 소비와 데모 재시작

`review-sse-demo.js`를 격리 temp DB/port와 현행 runtime으로 실행했다. 새 결함 없음. `evidence/review-009-sse-demo.log` 두 suite PASS.

- 실제 HTTP SSE 소비자의 response/socket을 pause한100기 fixture. quiet20 engine ticks에서20개 frame을 먼저 확인했다. 실제 TCP 송신을 유지한 채19 tick 후 서버 response.writableNeedDrain을 관측했다. 이후20 engine ticks 동안 화면 write20개를 건너뛰었지만 SQLite full frame20개가 모두 추가됐고 전체 simulationSeconds가1씩 연속했다. res.write는 실제 원본 호출을 전달하며 호출 횟수만 관측한다. writableNeedDrain을 mock하지 않았다.
- 이 시험은 명시적 runtime.tick로 실제 엔진/저장소/HTTP backpressure 상호작용을 확인한 bounded fixture이며 장시간 실시간1Hz 부하 인증은 아니다. 기존 실시간60초 시험과 적용 범위를 구분한다.
- SEED_DEMO=true runtime.start→stop→동일DB의 새 runtime.start에서 첫3개와 두 번째3개가 같고 wind/solar/hybrid 각각1개, 원래 ID 및 전체 정규화 datasets deepEqual을 확인했다. DB row count도3이며6개로 중복되지 않는다. main soak/원격 배포를 변경하지 않았다.

## Round 10 — 제품1.2.0 / PRD1.9 명령 상태 JSON export

새 결함은 발견하지 않았다. 독립 `tests/review-command-export.test.js`와 기존 기능/보안 시험을 함께 실행해6/6 PASS(`evidence/review-010-export.log`).

실제 Controller가 만든 completed40kW/오차0, 이후 새run의accepted 및 rejected를 HTTP export와 비교했다. accepted/dispatched/deadline/expires/updated 시각은 저장값 그대로, 누락은null, 각 행은 원래runId를 유지한다. 없는 수치를0으로 합성하지 않는다. 다른 RTU 명령은 분리되고 인증없는 요청은 존재/미존재 ID 모두401이며 attachment header가 없다. 요청 전후 모든 DB테이블/total_changes/전체plant/command 상태 deepEqual로 read-only 확인했다.

기존 시험을 독립 재실행해 갱신순최대20, 정확한 반환필드 allowlist, 잘못된시각/null/합계overflow 처리, credential URL/host+override+explicitbroker 비밀번호 정제, 긴ID128자 제한/정제flag를 확인했다. unknown 개인정보를 완전히 제거하거나 replay 가능한 식별자라고 주장하지 않는 DTO 메타데이터도 확인했다.

UI 소스는 클릭 당시 p.id로 URL/파일명을 함께 만든다. 메인 실제 브라우저 `export-browser/result.json`은 두 RTU4개/0개 저장상태 비교·401시파일없음·선택격리·credential비노출·좁은화면PASS이며 해당 script/source와 대조했다. 이번 독립 검토자는 브라우저를 다시 실행하지 않았다. 새로운1.2.0 배포/복원/최종 릴리스 게이트는 별도이며 기존1.1stable 및 soak는 변경하지 않았다.

## ISSUE-014 — 로컬 관측 터널 중단과 soak gap 의미

중요도 P2 운영 관측, 상태: 로컬 forward 복구 확인·관측 진단 개선 완료. 원격 앱 실패로 분류하지 않는다. 메인 확인으로 원격은 동일pod2/2Ready/restart0을 유지했으나 로컬 API/MQTT port-forward가 사라졌다. v1.1.0 observations의 최초 실패 poll09:47:50.699Z, 마지막09:55:59.633Z, 총44 API 실패. 09:56:09.795Z poll은 apiReady=true로 복귀했으며 당시connectionErrors245/apiErrors44를 그대로 보존했다. 당시 lastMessageAt은09:47:26.193Z여서 API 복귀만으로 MQTT 복귀를 주장하지 않는다. 이후10:04:51.205Z 관측은messages198/lastMessage10:04:24.025Z/API정상으로 MQTT 재수신을 증명하며 connectionErrors는246으로 유지된다. 해당 숫자는 누적 시점 차이이며 실패를 숨기거나 초기화하지 않았다.

기존 maxGapMs=18005는 **poll 시작 간격**이며 MQTT 무수신 간격이 아니다. 차후 실행용 `soak-diagnostics.mjs`는 maxPollGapMs를 명시하고 maxGapMs를 동일 의미의 호환 alias로 유지한다. maxTelemetryGapMs는 전체RTU에서 관측한 연속메시지 간 최대간격, telemetrySilenceMs는 마지막 수신 이후 현재경과이며 단일RTU의 유실 증명이 아니다. 연결/단절 전이 횟수와 마지막 연결/단절 시각도 별도 기록한다. 첫 연결 전 반복 실패와 중복close를 단절전이로 중복 집계하지 않는다.

집중시험2/2 PASS(`review-011-diagnostics.log`), 기존 network-recovery/tests.log8/8PASS 확인. 새로운 진단은 **현재 soak에 소급 적용되지 않으며 실행중 프로세스를 중단/재시작하지 않았다.** 역사적 observations 원문도 수정하지 않았다. 메인의 supervisor가 소유한 터널 복구·상태 검증과 결합해 관측 중단과 실제 앱 장애를 구별한다.

## ISSUE-015 — 최종 인도 inventory의 영상/PPT/재생성 source 연결 부족

중요도 P2 증거 정합성, 현재 상태 **수정·독립 회귀 완료**(아래 Round13). 다음은 수정 전 발견 기록이다. 실제 잘못된 최종 산출물이 생성됐다는 뜻이 아니며 source 검토에서 확인한 verifier 경계다.

- `verify-delivery.mjs`는 현재 selected MP4/video receipt와 deck/source/video-verification.json의 동일성을 비교하지 않고 deck verification도 제작에 사용한 videoSha256을 기록하지 않는다. 같은 release의 다른 영상/receipt로 바뀌면 PPT 제작 당시 영상과 다르더라도 inventory가 통과할 수 있다. 제작시 hash 검증은 존재하나 사후 인도 연결이 부족하다.
- reproduction files 배열이 없거나 비어도 루프가0회로 통과한다. 필수 recorder 코드/입력assets를 요구하지 않고 recordingConfigSha256/exactConfigSha256을 현재 config와 비교하지 않는다. 소스 파일 일부 누락을 completeness로 오인할 수 있다.
- digest 비교가 양쪽null이면 참이다. expected deployment digest가 유효함을 먼저 요구해야 한다.

권고: deck receipt에 사용 videoSha256을 기록하고 실제MP4/복사된video receipt와 비교, reproduction schema/nonempty/필수목록과 config hashes 검사, digest 유효성 명시. 메인 파일은 수정하지 않았다.

## Round 12 — 최종 미디어 보호 검토

release-binding 기존 부정 fixture를 독립 재실행3/3PASS. commit/run/runtime/digest/endpoint 및 유효한freeze window 검증은 존재한다. recorder는 실제remote release verification을 요구하고 최종visual/claims를pending으로 남긴다. deck는 완성·리뷰된 동일release 영상/실제SHA를 먼저 확인하며 최종 검수pending을 남긴다. inventory의 completionClaim=false/claimBoundary는 유지돼 목표완료 선언으로 오인하지 않는다. 렌더/원격mutation/최종촬영은 수행하지 않았다. ISSUE015는 이 긍정 판단과 별개의 artifact-check false-positive 가능성이다.

## Round 13 — ISSUE-015 수정 독립 부정 회귀

상태: **수정 및 독립 artifact 검증 회귀 완료**. 메인이 deck.videoSha256/copy receipt/실제MP4 연결, 유효digest 필수, nonempty regeneration목록·필수코드/assets·config hash 검사를 추가했다. `tests/review-media-delivery.test.js`는 임시cwd에 독립 가짜 artifact tree를 만들고 실제verify-delivery 프로세스를 실행한다. 실제 영상/PPT/원격을 생성하거나 변경하지 않는다.

5/5PASS(`evidence/review-013-delivery.log`): 일치하는fixture는 ARTIFACT_CHECKS_PASSED이지만 completionClaim=false; 같은release의영상교체는 exactreviewedvideo 검사 실패; 빈reproduction목록은 nonempty검사 실패; 잘못된configSHA는 exactconfig검사 실패; 양쪽잘못된digest는 validdigest검사 실패. 각 부정시험은 단순 nonzero가 아니라 해당하는 구체적 실패항목도 확인했다. 이 결과는 실제미디어 decoding/visual/claims/최종시간 준수를 대신하지 않는다.

## ISSUE-016 — read-only telemetry auditor의 전체 SCADA 검증 누락

중요도 P2 관측도구, 현재 상태 **수정·독립 회귀 완료**(아래 후속). 다음은 수정 전 발견 기록이며 앱/실제 telemetry 결함이 아니다. 독립 fixture가 실제 model+Store envelope를 만든 뒤 summary/scada도 일치하도록 변형하여 검사했다. 발전기 on/status/targetKw/limitPct/ramp/startup 필드 삭제, weather={}, faults=null, sourceTimestamp='1', timestamp/time='1'이 기존 auditor를 통과한다. nested presence/type 및 실제ISO시각 검증 부족이다. 메인에 즉시 전달했다.

`tests/review-telemetry-audit.test.js` 부정5건이 실패를 재현하고 정상 ramp-down(현재available보다큰출력)/nullable electrical은 통과한다. 기존5suite는 통과했다. `evidence/review-014-audit-before.log`는 수정 전 실패증거다. 회귀가 녹색이 되기 전 전체 테스트 통과로 표시하지 않는다. 루트 구현파일·현재soak/배포는 변경하지 않았다. raw payload/명령이름/credential을 로그로 출력하는 경로는 발견하지 않았고 gap/run/duplicate를 맥락관찰로 분리하는 claimBoundary는 적절하다.

### ISSUE-016 후속 — 강화 observer 회귀 확인

상태 **수정·독립 회귀 완료**. 메인이 필수 nested 필드/nullable 숫자/엄격UTC ISO/provenance 검사를 보완했다. 독립5부정fixture가 모두거절되고 정상ramp-down/전기값null은 계속 허용된다. 실제 model+Store100기분할/동일timestamp/QoS중복/run경계/sequence간격 포함 총11/11PASS(`review-014-audit-after.log`). 수신량에는invalid도 포함된다는 점과 quantity coverage≠acceptance를 claimBoundary에 명시한 것도 확인했다.

초기 live pilot은 구버전관측기이므로 강화검증 성공으로 소급취급하지 않는다. 원본source는 `artifacts/checkpoints/telemetry-audit/pilot-source`에 별도보존하며 메인이 다음 observer를 새디렉터리로 구분할 예정이다. 본 검토는 실행중pilot/primarysoak/supervisor를 조작하지 않았다.

## ISSUE-017 — 로컬 forward 재생성 시 outage/recovery 시각 갱신 누락

중요도 P2 운영 진단, 상태: 최소수정 적용·격리 회귀 검증. 원격앱 장애나 재시작이 아니라 로컬 관측연결 검증 실패와 재생성이다. 손실의 근본원인은 단정하지 않는다. 메인의 `artifacts/checkpoints/reconnect-20260921T1116/summary.json`·고정observations/supervisor-events/pod-after/resume-after 증거에서는 원격동일UID80c49ef9…/Ready2/2/restart0, supervisor11:16:17.529 forward_started→11:16:19.292ready, observers11:16:19.2재연결 및11:16:33전체RTU수신을 확인했다. 그러나 lastOutageAt/reconnectedAt은10:07값에 머물렀다.

원인: remote검증 성공/localReady=false 경로는 disconnected를 publish하지 않고 connecting으로 이동해 outageAt이 설정되지 않았다. 수정은 이전ready관측이 있을 때 local검증실패를 `disconnected/local_verification_failed`로 먼저 기록하고 기존 생성/재시도 경로를 유지한다. 처음기동은 장애로 만들지 않으며 반복실패는 최초관측outageAt을 유지, ready복귀가 실제관측복구시각을 갱신한다. healthy반복poll은 복구시각을 다시 쓰지 않는다.

회귀는 임시fakekubectl/로컬포트만 사용한다. ownedforward실제종료 뒤재생성과 아직살아있지만검증실패한ownedforward교체 양쪽을 시험한다. 원격pod는fixture에서동일하고 kubernetes_unavailable 없이 정확한outage/recovery시각을 확인한다. 기존singleton/외부포트보존/deadline/image/auth검사도 유지한다. 증거 `review-015-supervisor.log`.

**현재 supervisor98912/PID40434 및 observer5651·67091, 원격배포를 조작하지 않았다.** 파일수정은 이미실행중인구버전프로세스에 소급되지 않는다. 이번현장복구의 원본사실은 메인의별도보존증거로판단하고 새시각필드는 다음실행부터적용된다.

검증 보충: `review-015-supervisor.log`는9개중8개성공이며 기존wrong-image fixture에서 예상한remote_image_mismatch 대신kubernetes_unavailable을 반환한 일시실패를 보존한다. 새회귀2개는 모두성공했다. 코드변경없이 재실행한 `review-015-supervisor-rerun.log`는9/9PASS다. 초기실패는삭제하지 않았다. fakekubectl 실행지연 등이 가능하지만 원인은미확정이며 실제환경장애와 동일시하지 않는다.

### ISSUE-017 후속 — 수정된 로컬 supervisor 활성화

메인은11:19:16Z에 기존PID40434의시작시각·command를 재검증하고 정상종료한 뒤 수정된supervisor25872/PID54951을 시작했다.11:19:22.705Z ready 및ownedforward를 확인했고 양쪽observer는 재시작하지 않았다. 계획된교체의MQTT관측단절은11:19:16.737Z~22.849/23.022Z이며 이전11:16자연발생사건과 분리한다. 새프로세스의최초기동이므로outage/reconnected필드null은 과거장애없음이아니라 새프로세스범위다. 과거event원문을보존했다.

`artifacts/checkpoints/reconnect-20260921T1116/handoff-result.json`에 실제교체·실행sourceSHA·재수신과지속관찰ID를보존했다. main누적APIerror1/connectionErrors3, RTUobserverconnectionErrors5를초기화하지 않았고 수신구조오류/관측샘플불연속0이다. 원격deploy/Pod/제어를변경하지 않았다. 수정된시각기록경로의검증은격리시험이며 이를현장강제장애시험으로과장하지 않는다.

11:34Z 후속 실제 관측에서는 같은 수정 supervisor가 `local_verification_failed`를11:34:05.722Z, 정상 복귀를11:34:07.371Z에 기록했다. 시각 기록 경로가 이번 자연 발생 관측에서도 실행되었다. 동일 Pod UID/Ready 상태와 이후 RTU5개 재수신을 확인했고 강제 네트워크 중단이나 수동 supervisor 재시작은 하지 않았다. 실패 원인은 미확정이다. 원본 구간은 `artifacts/checkpoints/backup-recovery/reconnect-*.jsonl`에 있으며 누적 API오류2/primary연결오류3/추가관측연결오류6을 유지한다. 앞선 격리 시험과11:19 계획 교체의 증거는 변경하지 않는다.

## ISSUE-018 / REVIEW016 — remote backup의 무한 대기 및 미완성 최종명 노출

중요도 P1 마감 운영, 현재 상태: 수정·격리 회귀 완료(후속 REVIEW016 및 최종1MiB검증 참조). 최초 발견 시 OPEN/메인 패치 대기였으며 아래는 당시 관찰 이력이다. `scripts/remote-backup.mjs` 현행소스를 직접읽어 확인했다. 모든 execFile(kubectl discovery/exec/최종image검증)에 timeout이 없고 전체deadline/elapsed검사도 없다. 연결이응답하지않으면 await에서 멈춰3회chunkretry조차 다음회차로 진행하지못한다. 유한운영14시간 보장과 충돌하는 실제제어흐름 결함이며 이번검토에서 live연결을 강제로끊거나 실제hang을 유발하지 않았다.

신규remote snapshot은 backup(db,최종.sqlite)에 직접생성하고 chmod0600은완료후적용한다. 도중실패/remote process중단이면 미완성파일이최종이름으로남을수있다. 현재기존immutable backup이잘못됐다는증거는없다. 기존local.part→chunk/전체hash/integrity→podidentity→승격검사는유효하며보존해야한다.

필수회귀:
- discovery 및remoteexec정지fixture 모두유한timeout/kill로끝남. 개별재시도와전체시간예산둘다제한, 원래run.deadlineAt을늦추지않음.
- 이미마감이면kubectl실행없이실패. 충분한예산의정상fixture는기존기능유지.
- 신규remote snapshot은전용.part에0600으로생성,backup성공/무결성확인후원자적최종이름승격. 실패는최종이름/PASS증거를만들지않고기존final파일불변.
- 로컬kubectl종료가remote Node프로세스종료를보장한다고가정하지않음. remote자체마감/작업중단또는완료명승격guard를별도로검토.
- localgunzip/hash/SQLite검증도남은시간을고려하고deadline이후PASS를기록하지않음. .part잔존은미완료로구분하며원본DB를변경하지않음.

이번라운드는읽기검토와issues문서만수정했다. 실행중supervisor/soak/관측기및remote배포는조작하지않았다. root패치후별도독립fixture검토로검증상태갱신예정.

### REVIEW016 후속 — bounded backup 패치 독립 검증

ISSUE018 상태: 네트워크대기·미완성최종명 경계 **수정·격리회귀완료**, 아래시간보장범위 유의. 실제CLI의 모든kubectl호출(discovery/Ready/remoteexec/chunk/finalidentity)은 budget.exec를사용한다. 원래deadline과180초중빠른시각을전체예산으로두고각명령은남은예산이하SIGKILLtimeout이다. remote snapshot은0600전용.snapshot.part에서backup·integrity·마감검증후hardlink최종이름을생성하며기존최종파일을덮어쓰지않는다. 기존localstreaming/hash검증유지, PASS직전예산재확인,실패시privatejournal과정제진단을남긴다.

독립 `tests/review-backup.test.js` 실제CLI/fakekubectl에서 원래800ms남은deadline에hungchild를약810ms내종료,child민감stderr비노출/incompletejournal/noPASS확인. 이미만료한CLI는kubectl미실행. 두번째명령예산차단및remote만료시final/part미생성확인. 메인5fixture(성공SQLite/gzip,실패/기존보존포함)와함께9/9PASS `review-016-backup-after.log`.

엄밀한제한: 로컬동기SQLite integrity_check와sync파일I/O자체는budget.check로중간취소되지않는다. 검증이끝나면마감초과PASS는차단되지만hunglocalI/O를포함해프로세스가반드시180초내끝난다는보장은아니다. remoteexec강제종료가원격프로세스취소를보장하지않는것도명시적으로유지한다. prelinkdeadline으로늦은snapshot승격을막는다. 이회귀는격리fixture이며live중단/remote변경은없다. 최초review016관찰은보존했다.


### REVIEW016 최종 전송 chunk 변경 검토

chunkSize가256KiB→1MiB이고result.transferChunkBytes에실제값을기록한다. exec maxBuffer8MiB/개별15초/전체budget/3retry/부분·전체SHA/streaming검증은그대로다. 1MiB base64는약1.34MiB여서8MiB stdout상한안에들어간다. 실제CHUNK_SOURCE의1MiB랜덤원문및마지막137B조각을자식stdout으로읽고길이/hash/연결원문동일성을검증한새회귀를포함해독립재실행10/10PASS(`review-016-backup-final.log`). 기존before/after로그·source기록은변경하지않고최종source는별도 `review-016-backup-final-source.json`에기록했다.

실제335704064B백업의재전송은메인의별도실행증거이며본검토에서live재전송/중단을수행하지않았다. chunk개선만으로마감시예상DB전체가항상180초안에완료된다고보장하지않는다. 실제최종전송도예산내완료/hash/integrity/증거를별도로확인해야한다.

## ISSUE-019 — 격리 복원 snapshot 동일성 및 host 대기 경계

중요도 P2 최종복원 증거/운영, 현재상태: 패치·독립fixture검증완료(후속참조). 아래는초기확인·패치대기당시관찰이다. 기준구현 `e6e4f12:scripts/deploy-restore-rig.py`를직접확인했다. 이전init은목적DB가없을때복사하고SQLite integrity_check만검사했다. 목적DB가이미있으면복사를건너뛰므로파일이정상SQLite임은알수있지만최종manifest가선택한**정확한새snapshot**과동일함을해시로강제하지못했다. 이전restore증거가틀렸거나데이터가손상됐다는의미가아니다.

이전discovery의subprocess.check_output과apply의subprocess.run에host timeout이없고rollout의kubectl --timeout=180s만으로hostprocess 전체대기를제한하지못한다. 원래run.deadlineAt/전체예산을명령마다적용해야한다. 현재작업본에는source/destination streamingSHA검사와host20/30/180초·총210초/originaldeadline wrapper가작성되어있음을확인했으나담당완료후fixture/source를고정하여재검증할예정이다.

필수검증: 기대SHA정상복사및기존동일목적파일허용; source불일치·기존다른목적파일거절/기존파일불변; SHA일치라도비SQLite거절; --expected-sha256생략호환은exactSnapshotVerified=false; 원본PVC읽기전용·격리PVC유지; 만료/없는run은kubectl미실행; hungapply는유한종료/민감stdout비노출/자동재시도없음; timeout이원격apply취소증명은아님을표시. 335MB새백업전송성공을169MB구복원의동일snapshot증거로대체하지않는다.

최종운영순서는 `docs/operations/FINAL-RESTORE-PLAN.md`를따르며원래동결/종료시각은변경하지않는다. 계획문서는실제실행증거가아니다. 이번검토는원격실행없이소스/문서만읽고issues문서만변경했다.

### ISSUE019 후속 최종 격리 검토

현재상태 **패치·독립fixture검증완료**. deployment담당완료신호후최종5test파일과코드를재검토/독립실행하여5/5PASS(`review-017-restore-after.log`). 초기3test는미커밋초안의당시범위이며최종증거는이번5test sourcehash와연결한다.

정확한source/destination SHA와SQLite integrity를모두확인한init만앱기동을허용한다. 잘못된sourceSHA는복사전거절, 기존다른목적파일은덮어쓰지않음, matchingSHA라도비SQLite거절, 인수생략은exactSnapshotVerified=false인호환모드, 원본PVC이중readOnly/별도복원PVC를확인했다. hungapply는900ms원래deadline에약917ms로종료,raw민감출력억제/후속rollout없음. 만료/없는run은discovery도실행하지않았다. 모든host명령은공통command timeout wrapper를사용한다.

보장범위: host대기종료가이미원격에적용된리소스나init의취소를뜻하지않는다. 실제고유이름상태확인전재시도금지메시지유지. 앱이DB를변경한후같은rig재시작은exactSHA검사실패할수있으므로항상새격리PVC를사용한다. 실클러스터복원/후속UI·MQTT는미실행이며이fixturePASS가최종새snapshot복원완료를대체하지않는다. 기존immutable복원증거는수정하지않았다.

### ISSUE019 후속 — 검증용 HTTP 요청 대기 상한

deployment담당이 remote-restore-check.mjs, remote-preview.mjs, remote-integration.mjs, browser-check.cjs, browser-command-export.cjs의6개fetch호출에15초AbortSignal과redirect:error를추가했다. 독립검토자는해당6호출의소스를확인했다. 앱/runtime변경이아니며전체실행deadline은여전히메인감독범위다.

실행증거 `evidence/final-restore-http-boundary.json`은 **remote-preview 실제child+loopback 두경계만** 증명한다: 무응답15029ms에부모강제kill없이실패,302응답53ms에거절하고redirect목적요청0회. liveClusterAccess=false. `scripts/verify-proof-http-boundaries.mjs`는실행했던heredoc원본에설명주석을추가한보존소스다. 이검토에서재실행하지않았고5스크립트전체end-to-end/live회귀로표현하지않는다. 이전restore5test/sourcehash증거는변경하지않았다.


## ISSUE-020 — KMA 업무 실패 응답을 조회 성공으로 표시

중요도 P2 사용자 피드백, 현재 상태: 기능 수정·회귀 검증 완료, 현재 stable에 포함. 최초 로컬 검증 당시 원격 배포 대기는 역사다. 기존1.2 번들의 실제 로컬 브라우저에서 KMA_AUTH_KEY 미설정 상태로 KMA 조회를 누르면 HTTP200 응답의 plant.weatherError가 실패를 알리는데도 전역 초록색 “기상청 관측을 조회했습니다.”와 실패 경고가 동시에 표시됐다. 재현 원본은 `artifacts/checkpoints/weather-feedback-before/result.json` 및 `contradictory-feedback.png`이며 HTTP200/동시표시 true와 로드된 번들 SHA를 보존한다. 실제 KMA 요청이나 클러스터 장애를 뜻하지 않는다.

확정 원인은 서버가 현재 plant 상태를 반환하는 계약인데 Dashboard가 응답 weatherError를 읽지 않고 공통 act의 고정 성공 문구를 사용한 것이다. API/schema 변경 없이 weatherError는 오류로, 오류 없는 응답도 새 관측 적용을 단정하지 않는 중립적 처리 결과로 표시해야 한다. 서버가 대기 중 수동 설정/시나리오 복원에 의해 늦은 기상을 폐기할 수 있으므로 weatherSource=kma만으로 이번 조회의 새 관측 적용을 단정할 수 없다.

독립 소스 검토에서 UI 수정본은 전역 성공 문구를 null로 억제하고 해당 RTU 이름/ID를 가진 로컬 receipt를 사용한다. keyed Dashboard와 unmount guard가 다른 RTU로 바꾼 후 늦은 응답 표시를 차단하며 inFlight가 중복 클릭을 막는다. 최종 브라우저 회귀 증거 확인 전 종결하지 않는다. 원격 안정 버전/관측기는 변경하지 않았다.

### IDEA007 시나리오 선택 범위 독립 소스 검토

Scenarios는 plantId가 선택 RTU와 같은 행만 표시하고 저장 요청은 선택 ID를 명시한다. 복원/내보내기는 표시된 행의 ID를 사용한다. RTU별 key에 따른 재마운트, mounted/generation 검사로 이전 목록 응답이 새 선택 화면에 반영되지 않으며 inFlight/pending 및 공통 busy로 연속 요청을 제한한다. 늦게 완료한 전역 저장/복원 알림도 대상 이름/RTU ID를 명시하므로 현재 선택 대상의 완료로 오인할 가능성을 줄인다. 이 필터는 UX 범위이며 서버 API 접근권한 경계로 주장하지 않는다. 실제 A/B/빈 목록 및 지연 응답 시험은 메인의 별도 브라우저 증거를 확인해 기록한다.


### REVIEW018 — 운영 fixture의 wall-clock 여유와 직렬 실행

후보1.3 전체시험 두 회는 각각134/136이었다. 첫 로그 `artifacts/checkpoints/candidate-1.3-tests.log`의 backup elapsed13.6초/restore child14.2초 실패와 둘째 `candidate-1.3-tests-round2.log`의900ms deadline 내 fakekubectl 최초 호출 전 만료·supervisor250ms 응답 제한 실패를 보존한다. 별도9fixture 재실행은 모두 통과했지만 이전 실패를 삭제하거나 통과로 재분류하지 않는다. 많은 실제 child/HTTP/SQLite fixture의 병렬 실행에서 스케줄링 여유가 부족한 증거이며 임의 환경에서 wall-clock 상한이 항상 보장된다는 의미가 아니다.

테스트만 수정: supervisor fixture timeout250→2000ms, restore 정상 child guard5→15초, hung apply 원래deadline900→3000ms/관찰 상한3→8초. apply에 실제 진입한 후 timeout 종료·원문민감출력 비노출·후속rollout 없음 검증을 유지했다. 생산 timeout/deadline은 변경하지 않았다. 메인이 전체 test 명령의 file concurrency를1로 제한한다. 독립 직렬 재실행14/14PASS(`evidence/review-018-operational-timing.log`, 약9.6초). 이는 해당14fixture 결과이며 전체136시험 통과를 대신하지 않는다.


### ISSUE020 / IDEA007 후속 — 최종 브라우저 증거 독립 검토

최종 `scripts/browser-scenario-scope.cjs`의 실제 assertion, round5/result.json, 기상 오류 desktop/빈 RTU narrow 화면을 독립적으로 읽었다. 메인 실행 결과는 PASS이며 pageErrors=[]이고 로드 번들 index-Bq6rJvbB.js SHA256 8d61e59d833af0cea234ed17c6d61300e4b564708cfeb78f51f8a0ab2e6a5a3c에 연결된다. 검토자가 이 브라우저 harness를 별도로 재실행한 것은 아니다.

실제 missing-key HTTP200은 weatherError와 오류 receipt로 표시되고 이전 고정 성공문구가 없다. 화면에서 대상 RTU 이름/ID와 실제 반환 출처를 확인했다. manual/no-error의 중립 receipt와 늦은 A 응답의 B 화면 미표시는 명시적 controlled 응답 fixture이며 실제 외부 KMA 성공 검증이 아니다. 이 범위에서 ISSUE020 수정 검증을 종결하고 원격 배포 상태는 별도 게이트로 남긴다.

IDEA007은 같은 이름의 A/B 목록 구분, JSON 다운로드와 서버 snapshot deep equality, 빈 RTU 안내, A만 새 run/명령취소 및 B run/모델/명령 불변, 지연 list 차단, 저장 A→B→A 시 비활성/단일 POST, reload/keyboard typeahead/narrow overflow 검사를 실제 assertion으로 확인했다. 글로벌 목록 API 계약은 그대로다. 초기 네 번은 headless native key 동작/선택자 fixture 실패로 원본 로그를 보존했으며 최종 통과로 삭제하지 않는다.

전체시험 후속은 메인 candidate-1.3-tests-round3.log의136/136PASS이며 REVIEW018의 독립14개 결과와 구분한다. 코드/최종 harness/원본 result 및 이미지 해시는 review-019-scenario-weather-source.json에 기록했다. 본 검토에서 클러스터/서버/공유 fixture를 변경하지 않았다.


### ISSUE019 운영 후속 / REVIEW020 — outbox restart 검증 대기 경계

remote-outbox-restart.mjs의 무제한 host exec/HTTP 대기를 제한했다. 일반 kubectl20초/온라인 backup90초/rollout status190초를 원래 run.deadlineAt와 전체300초 중 빠른 상한으로 제한하고 SIGKILL을 사용한다. HTTP는15초 및 redirect:error, MQTT subscribe/터널·DB poll도 남은 예산을 확인한다. 동일 outbox body/sequence 및 실제 수신/PUBACK 검사는 유지한다. timeout 진단에는 child stdout/stderr/토큰을 포함하지 않으며 원격 취소를 보장하지 않으므로 실제 pod/배포/RTU 상태 확인 전 재시도하지 않도록 안내한다. uncertain offline 요청도 cleanup 대상이며 예산 소진 후 cleanup을 수행하지 못하면 명시적으로 실패를 남긴다.

격리 실제 CLI 두 fixture PASS: 만료 시 kubectl 미실행,3초 원래deadline의 hung discovery 유한 종료·민감출력 비노출. fakekubectl/임시 run/임시토큰/random loopback만 사용했다. 초기 fixture의 고정3104포트 충돌 실패는 review-020-outbox-boundary.log에 보존하고 OUTBOX_API_BASE 선택옵션으로 격리 포트를 사용한 최종2/2결과를 별도 final.log에 기록했다. live cluster 명령/재시작/RTU 변경은 없었다. 이 시험은 outbox 전체 복구 성공을 대신하지 않는다. 동기 파일I/O/스케줄링 중단까지 hard real-time300초 종료를 보장하지 않는다.


REVIEW020 round2: 메인 독립 검토에서 MQTT connectAsync의 늦은 resolve가 Promise.race 종료 후 소유권 없이 남을 수 있음을 발견했다. mqtt.connect 즉시 client 소유권을 확보하고 connect/error 이벤트를 제한시간 동안 기다려 finally end(true)가 실행되도록 수정했다. 실제 소스 연결 블록을 VM에서 fake MQTT delayed connect로 실행해 timeout 후 즉시 close/늦은 connect 이후도 close1회를 확인했다. 이는 실제 브로커 통합시험은 아니다. OUTBOX_API_BASE는 credentials 없는 HTTP localhost/127.0.0.1만 허용하며 외부 host는 API 토큰 파일을 읽기 전에 거절한다. 신규 CLI 부정시험 포함4/4PASS와 node --check 완료. 최초 final source/log는 보존하고 round2 source/log를 별도로 기록했다.


REVIEW020 round3: 보안 독립 검토에서 observer message callback의 JSON.parse 예외가 비동기 이벤트에서 main finally를 우회할 수 있음을 발견했다. listener만 try/catch 및 non-null plain object/array 제외/string messageId 일치 검사로 방어했다. 실제 소스 callback VM fixture에서 malformed/null/array/scalar/ID 누락·타입오류·다른 ID는 throw/수신변수 변경 없이 무시하고 정상 동일 ID는 공백까지 원문 그대로 보존함을 확인했다. 전체 focused5/5PASS와 node --check. 기존 실제 outbox 성공 실행 소스 `deploy/verification/candidate-3fa3ba0/actual-outbox-source.mjs`와 보고서는 변경하지 않았고 해당 성공을 이번 수정본의 실제 실행으로 소급하지 않는다. 이번은 운영도구 재사용 방어이며 앱/배포/원격 재시작 변경은 없다.


### REVIEW021 — 최종창/재연결 운영 경계 (수정 검증 완료)

기준: 안정1.3 runtime3fa3ba0, 원래 freeze21:37:33Z/deadline22:07:33Z 불변. FINAL-RESTORE-PLAN/NETWORK-RECOVERY/resume/NEXT-ACTIONS 및 미디어 도구를 읽었으며 기존 통과시험 재실행/원격조작은 하지 않았다. 재시도 전 실제 상태 확인, 고유 복원PVC·정확SHA, 동일매니페스트·영상 해시 결합, video-first 및 인도검사의 completedAt 창 검증은 유지된다.

확인된 운영 공백 두 가지를 메인에 보고했다. (1) verify-release.mjs --remote의 두 execFileSync kubectl은 host timeout이 없다. recorder 내부 호출에는 부모20초 제한이 있지만 최종계획의 직접 manifest 검증에는 없다. 계획의 직접 get/logs/scale/wait도 host 대기 상한이 없어 네트워크 중단 시 메인감독에 의존한다. (2) recorder say/ffmpeg/audio-probe의 sync child 호출은 timeout이 없고 recorder/deck은 시작창 검사 후 종료시 deadline을 재검사하지 않는다. verify-delivery는 늦은 receipt를 거절하므로 허위 완료는 막지만 작업 자체의 초과실행을 중단하지 않는다. 실제 hang/미디어 손상 재현 주장이 아니며 source 제어흐름상 제한 누락이다.

최소 권고: remote 검증 child에 남은deadline/유한 timeout과 정제오류를 적용하고 계획의 directcommands도 유한 host wrapper로 실행한다. 미디어는 남은 원래deadline 기반 child 제한/종료receipt 검사 또는 소유 process tree를 정리하는 외부 감독을 적용한다. 새 feature/목표quota 요구가 아니다. 본 검토에서 source 변경은 하지 않았고 메인 판단을 기다린다.


REVIEW021 remote manifest 경계 수정 완료: verify-release --remote는 원래run.deadlineAt와 시작+60초 중 빠른 총예산을 설정하고 kubectl두호출을 각각20초 이하/남은예산 이하 SIGKILL timeout으로 실행한다. backup 스트리밍 hash 중 및 최종PASS 전에도 예산을 확인한다. 파싱/실패 raw child 출력·Assertion 값은 출력하지 않는다. 로컬 동기파일/git I/O의 중간취소 보장은 아니며 remote네트워크 대기를 제한한다.

격리 실제CLI6/6PASS: fakekubectl hang은2.5초 원래deadline에서 종료/두번째호출 없음, 이미만료는호출0, secretstderr 실패비노출, 정상Ready app/mqtt실제digest검사2호출PASS, --remote없는검사는만료run과무관, --at-commit은workingfile변경에도git원본해시유지. 원격cluster접근은없다. source/log는 review-021-release-boundary-final 기록. 계획directcommand wrapper와 미디어deadline은 메인/다른담당 범위이며 이시험으로 종결하지 않는다.

REVIEW021 최종 결합 검증: 메인의 deadline-command wrapper를 FINAL-RESTORE-PLAN의 직접 get/logs/scale/wait 및 release 명령에 적용했다. streaming32MiB/원래마감/소유그룹 종료/SIGTERM/실패출력 차단을 추가했다. 미디어 담당은 별도 watchdog·각 child 시간제한·receipt 직전 창 검사를 적용하고, 보안 검토 후 회수된PID 신호 금지·시작식별/부모계보 재확인으로 보완했다. 인도 검사도 두 산출물의 새 helper 소스 보존을 요구한다. 관련38시험PASS, 실제 기존1.3 checkpoint688해시·현재Ready image를 새 bounded 경로로 확인했다. 실제 서비스/이미지 변경·새 최종미디어 생성은 없었다. 중간실패와 한계, 독립보안검토는 artifacts/checkpoints/final-window-boundaries/summary.json 및 docs/security/OPERATING-DEADLINE-REVIEW.md에 연결한다. 전체목표/최종미디어 완료를 뜻하지 않는다.


### REVIEW022 / FR-FAULT-02 — 시연 소유 RTU 설정 복구 준비

시연 등록/제어 이후 중단 시 소유권 journal과 설정 정리가 없는 공백을 메인이 발견했다. scripts/media/demo-lifecycle.cjs는 createLifecycle({baseUrl,tokenFile,journalPath,deadlineAt,runId,productVersion})를 제공한다. tokenFile/journalPath는 절대경로, endpoint는 userinfo 없는 HTTP loopback origin이다. begin()은 기존RTU runId/모델·제어·재생·장애 projection을 private0600 atomic journal에 기록한다. prepareRegistration(spec)은 고유 name/type/count/rated/ramp intent를 실제 클릭 전에 기록한다. captureRegistration(plant,201)은 기존ID 제외/fingerprint/생성시각을 검증하고 생성직후 baseline을 durable하게 기록한다. recorder는 이 함수 성공 전 제어/재생 변경으로 진행하지 않아야 한다. 현재 recorder 통합은 메인 소유이며 아직 이 helper 시험으로 전체 시연복구가 입증된 것은 아니다.

recover()는 매 요청 전 실제 state를 읽고 소유 새RTU의 ID/runId/생성시각을 확인하며 설정차이만 API로 복구한다. 기존RTU에는 쓰지 않고 변경비교만 보고한다. fault/generator 허용설정/replay를 복원하며 commandId/scenario restore/DBrollback/삭제/날씨PATCH는 사용하지 않는다. power/simulationSeconds/seconds/저장된 과거RNG 상태를 복원하지 않는다. seed 설정 복구는 기존 API 의미상 rngState를 seed로 재초기화하며 공개결과 rngReinitializedBySeedPatch 및 exactPriorRandomTrajectoryRestored=false로 명시한다. 정확한 과거 난수궤적을 복원한다는 주장이 아니다.

등록 응답 유실 시 기존ID 제외+고유이름/fingerprint/생성시각 후보가 정확히 하나여도 초기baseline을 추정하지 않는다. 식별만 private기록하고 NO_BASELINE_NEEDS_MAIN_RECONCILIATION으로 자동쓰기 보류한다. 여러 후보/잘못된ID/변경된run은 fail closed다. CLI recover-demo.cjs는 원래 run.json deadline/runId/product/endpoint와 journal을 대조하며 원래deadline/총60초/HTTP5초 redirect거절을 적용한다. 공개 결과는 ID/설정hash/비교판정/시각 및 제한된 작업요약만, raw journal/토큰은 출력하지 않는다.

격리 loopback HTTP + 실제 model create/update/publicPlant를 사용한5/5PASS: 소유설정복원/기존RTU불변/동적출력·시간불변/seed42재초기화/반복쓰기0, 응답유실 PATCH 후 실제값재조회로중복쓰기0, 등록응답유실 baseline미추정/모호후보거절, 기존ID·changedrun거절, 만료/다른journal스코프거절 및 기존RTU 변경 report-only. 기존운영3104/클러스터는 접근하지 않았다. source/log는 review-022-demo-lifecycle-final 기록이며 전체goal/mediaPASS와 구분한다.


REVIEW022 round2: 계획된 시나리오 복원만 prepareScenarioRestore(scenarioId)에서 현재ownedrun 및 GET/scenarios의plantId를 확인해 durable intent를 남긴다. captureScenarioRestore(actualPlant,200)는 같은소유ID/생성identity/새runId를 받아 transition만기록하고 초기baseline은변경하지않는다. 응답유실 unresolved intent와 의도없는 changedrun은 자동쓰기거절한다. 기존journal begin은 아직등록intent/owned가없고 기존전체설정projection이동일할때만 파일수정없이재사용한다. cleanup후runId는시나리오의새run을유지하며settingsMatched는이명시적전이만제외하고초기설정과비교한다. currentRunId/baselineRunId도공개요약에구분한다.

최종8/8fixture PASS: 기존5개+정상200전이/초기baseline불변+다른시나리오owner 및응답유실거절+begin읽기재사용/기존변경시거절. original deadline은불변이며긴녹화각phase/cleanup은같은options의새lifecycle인스턴스로60초예산을다시확보해야한다. recorder통합담당에계약전달완료. round2소스/로그는별도보존한다.


## ISSUE-021 — 큰 명령 유효시간 입력에서 브라우저 날짜 예외

- 중요도 P2. 상태 RESOLVED_FUNCTIONAL(1.4.0 실제 배포·동일 백업 복원 검증 완료), 담당 메인/UI, IDEA-008 채택 개정3 / PRD1.11에 연결.
- 실제 로컬1.3 브라우저의 유효시간에100000000000000000000을 넣으면 native validity=true이나 명령 클릭 시 Invalid time value 예외가 발생한다. POST는0회이며 원격 k3s나 실제 제어에는 영향을 주지 않았다.
- 원인: 입력 숫자를 Date로 변환하고 toISOString을 호출하기 전에 유효 날짜 여부를 확인하지 않는다. 서버범위 정합성 문제와 구분되는 UI 오류 처리 누락이다.
- 수정 전 증거: artifacts/checkpoints/command-expiry-before/result.json, 실행 소스/로그/화면. 일반 입력 범위의 별도 재현은 artifacts/checkpoints/command-form-before/.
- 기대: 유효하지 않은 날짜는 전송 전 사용자에게 안내하고 예외를 발생시키지 않는다. 정상 만료일/소수 허용/target0/의도한 가용초과 시험 및 서버 검증은 유지한다. 임의 업무상 상한은 추가하지 않는다.
- fdd0491에서 수정했다. 로컬 실제 브라우저1e20/확장연도 오류 안내·POST0·예외0, 동일 폼 수정 후 Enter 재전송과 실제25.25kW 완료를 확인했다. command-form-1.4-browser-round2 및 correction-delta, REVIEW020에 연결한다. 원격1.4 및 동일 백업의 격리 복원본에서도 입력·날짜 검증이 통과해 기능 해결로 닫는다. 최종 미디어·시간·인도 게이트는 별도다.


REVIEW022 최종 통합 후속: 실제로 시간대가 다른 서버의 createdAt을 로컬 intent 시각과 순서 비교하면1ms 시계 지연만으로도 정상201 소유권 기록을 거절했다(보안 독립 fixture). 생성시각은 불변 identity로 보존하되 서로 다른 시계의 순서 비교를 제거했다. 관측된201·원래 POST 다섯 설정값·기존에 없는 ID/run·fingerprint를 확인한다. 응답 유실은 후보가 하나여도 초기 기준을 추정하지 않고 자동쓰기하지 않는다. 독립수명주기11개와 실제POST본문 거절검사3개 통과. 로컬 UI 실패/catch복구 및 성공 리허설은 artifacts/checkpoints/media-lifecycle-local-round1/result.json, 최종 준비65+11시험/덱패키징은 artifacts/checkpoints/final-media-lifecycle/summary.json에 연결한다. 실제영상 성공 후 추가한 두 방어는 fixture 결과이며 원격 시연 성공으로 확대하지 않는다.


### REVIEW023 — 로컬 연결 실패의 진단 구분

반복 local_verification_failed 기록은 HTTP 응답/JSON/인증파일/버전/API브로커보고/MQTT TCP의 어느 단계가 실패했는지 알 수 없었다. 실제 과거원인 추정 없이, 새 supervisor에 고정 단계·종류·상태 숫자·시간만 보존하는 진단을 추가했다. 토큰/본문/오류message/URL/헤더는 노출하지 않는다. bool API·기존재시도/forward교체정책은 유지하며 정상계약의 connected=true를 엄격히 확인하고 health실패때불필요한config요청을생략한다.

초기25개중24개 통과/1개 fixture실패를 보존했다. 닫힌 keepalive소켓이 connection_reset을 반환하는 정상가능성을 test가 무조건 refused로 기대했던 문제이며 새 미사용포트에서refused를 별도시험했다. 수정후25/25, 독립보안27/27PASS. null/array/악성오류메타데이터/본문스트림리셋/HTTP401/503/시간초과/인증파일/중복이벤트/원격실패시과거검사시각을 포함한다. exactsource/log는 artifacts/checkpoints/supervisor-diagnostics, 독립검토는 docs/security/SUPERVISOR-DIAGNOSTICS-REVIEW.md. 현재코드준비단계이며 실제감시교체는첫1시간관찰뒤별도증거로검증한다.


### 1.4 관측 사건 — 14:01Z 자동 재연결

독립 읽기 확인: supervisor84952/81174는14:01:54.445Z health timeout5002ms 후14:01:55.750Z verified로 복귀했다. 두 관측기 primary85649/36193, audit85652/92936은 유지됐고 제한된ps시작identity를 기록했다. 실제read-only pod조회는 동일UID f45d1e93-03e8-4f0a-a7af-7f4925b44190/Ready app·mqtt/재시작0과1.4 c19digest를 확인했다.

고정14:00:30~14:04:30prefix에서 primaryAPI오류0→1/connectionErrors0→0, auditconnectionErrors0→1이다. 다섯RTU 모두invalid0/sampleDiscontinuities0/sequenceForwardJumps0이며 비교구간수신샘플증가가각simulationSeconds증가와같다(첫RTU142,나머지180). 마지막prefixAPI/MQTT정상·5RTU HEALTHY/pending0이고14:03:49경전RTU재수신을확인했다. 추가latest파일은14:04이후신선도스냅샷으로별도보존한다. 이번은관측된샘플공백이없어원격outbox조회/누락배치추정을하지않았다. 모든구독자무손실/무중단을주장하지않는다. host전원조사는하지않았으며sleep원인추정도없다. 증거는 artifacts/checkpoints/reconnect-20260921T1401/summary.json 및 sha256.json. 소스보존은provenance이며process메모리attestation이아니다. 앱/DB/MQTT변경·재시작·관측중복기동은없다.


### Command receipt before-proof — 실제1.4 로컬 UI 세 경계

독립 실제브라우저/REST 재현은 artifacts/checkpoints/command-receipt-before/round2/result.json과3개PNG/소유RTU baseline·cleanup에 보존했다. local3107 version1.4 확인 후 고유1기/정격1000RTU만 사용했다. A: 유효폼1001kW 요청은 서버rejected인데 초록 “목표값을 접수했습니다. 아래 수명주기를 확인하세요.”가 표시됨. B: 실제accepted POST 뒤 브라우저의 후속GET/state만503으로 합성하면 명령은 서버에영속되었는데 일반요청오류가 표시됨. B는실제서버실패재현이 아니라 명시적response fault fixture다. C: 실제POST응답만 hold하면서 두번submit하면 서로다른commandId 두요청이저장되고 앞명령superseded/뒤accepted를확인했다.

로드1.4bundle index-BndL-kls SHA37a5224b…와 source d44ecb94…를기록했다. 최초harness는 hint포함label에exact접근하여재현전timeout했고 원본로그/초기소유RTU정리결과를보존했다. round2는source확인한name selector로수정했다. 두소유RTU 모두faults기본값·on/limit/targetLimit을생성baseline으로정리했고 기존RTU/main3104/앱소스/PRD/run은변경하지않았다. IDEA009 채택·수정은메인별도결정이며이beforeproof로개선완료를주장하지않는다.


## ISSUE-022 — REST 명령 응답과 전송 확인의 혼동

상태: RESOLVED (IDEA009, PRD1.12/제품1.5.0, REVIEW027). 위 command-receipt-before A/B/C는 각각 HTTP200 명령 거절의 성공알림, 명령 접수와 후속 상태조회 실패의 혼동, 응답 대기 중 다른UUID 반복제출을 보여준다. 수정 전 실제1.4 증거를 보존하며 서버 검증이나 같은ID 멱등성의 실패라고 확대하지 않는다. 실제 수정·독립 인수·원격 배포/복원 후에만 해결로 바꾼다.


### IDEA009 후보1.5 독립 실제브라우저 round1

local3109/version1.5와 승인webSHA e4fa5c0a… 확인 후 served /assets/index-CyjJuK5n.js 바이트SHA b6c12889…=dist 및 실제브라우저 로드경로를 검증했다. artifacts/checkpoints/command-receipts-1.5-browser-round1/result.json에14개기록/38실제UI POST와commandId를보존했다.

실제accepted/expired/rejected, accepted후state503의기존접수보존, 저장후POST응답유실의원래ID읽기확인, 서버미도달POST·notfound·GET실패의미확정유지, pending Enter/tab/A→B→A 단일요청과B허용, 모든Dashboard/개별발전기action, 늦은GET이최신receipt를덮어쓰지않음, 실제15초대기(15045ms), 응답ID/상태오염의미확정, 최근20개/이전미확정/좁은레이아웃/새로고침후메모리만초기화를확인했다. 네트워크응답차단·503·오염은브라우저합성fixture이며실제서버장애라고주장하지않는다. 실제15초elapsed검증은POST경계이고모든GETtimeout의별도실시간측정은아니다.

pageErrors=[]; 고유A/B만생성했고끝에fault/on/limit/targetLimit을생성baseline으로정리했다. 기존RTU설정불변=true. pendinghold는해제하고브라우저종료후정리했으며main3104/배포/PRD/source변경없음. 원본beforeproof는불변. 당시실행script/web/helper/form소스복사와sha256,두스크린샷,cleanup을같은폴더에보존했다. 후보browser검증이며MQTT/k3s/백업/최종media전체수락은별도게이트다.


### IDEA009 로컬 전체 검증 및 outbox 시험 fixture 수정

전체 단위검사 round1은262개 중261통과/1실패였다. 이전 운영도구의 포트설정이 VM에서 process.env를 참조하지만 해당 fake환경에 process가 없었던 시험 fixture 문제다. 실제 앱 실패로 확대하지 않으며 원본 실패 로그를 보존했다. fakeenv/assert와 실제연결URL 확인을 추가하고 기본/명시/충돌/잘못된 포트 검사를 보강했다. 선택6개 및 전체 round2 263/263 PASS, build/실제로컬broker 통합·고급 PASS, 기존브라우저4종과 신규receipt14기록/기존form44검사 PASS다. 중복선택시험을 더해 세지 않는다. artifacts/checkpoints/candidate-1.5-local-summary.json 및 REVIEW025에 연결하며 ISSUE022는 정확이미지·원격·복원 게이트가 남아 FIX_PENDING을 유지한다.


IDEA009 browser harness 재사용 준비: isolated-restore 명시모드는 정확한 http://127.0.0.1:3105만 허용하고 제품1.5/64자리소문자expected bundleSHA/명시적artifacts/private하위token파일을 요구한다. main3104/외부/URLuserinfo/모드불일치는파일읽기·Playwright로드·API요청전에거절한다. 복원served bundle은expectedSHA와직접비교하며현재localdist로대체하지않는다. local3109/defaulttoken/freshoutdir/기존설정불변·고유RTU정리는유지한다. import만하는preflight3tests PASS/node--check; 실제복원브라우저는아직실행하지않았다. 기존round1성공소스/증거불변.


### ISSUE022 원격 인수 완료

6d165d1/2fd3f21의 main UI·실제MQTT·outbox 재시작과 동일719527936바이트/ad34 백업의 현재1.5·하위1.4 복원19근거를 REVIEW027에서 독립 대조했다. 현재1.5 복원본에서 receipt14case와 원래 RTU 설정불변 복구를 확인하여 ISSUE022를 해결로 전환한다. 앞의 FIX_PENDING 문장은 각 시점의 이력이다. 복원 receipt 첫 실행은 EXPECTED_WEB_SHA 누락으로 파일·API 변경 전 실패했고, 원본로그를 보존한 별도round2가 통과했다. 이는 앱 결함이나 명령 중복 수신이 아니다. 최종미디어/전체시간/인도는 별도 미완료다.


## ISSUE-023 — 저장된 운영 이벤트 시각이 실제 화면에서 누락

P2 진단 표시. 현재 상태: RESOLVED_FUNCTIONAL — 1.6 수정 및1.7 회귀·동일 snapshot 복원·독립 REVIEW033/037/038 완료. 최초 REVIEW032 대기 표현은 당시 이력이다. 최초 등록 상태는 OPEN/수정미착수였다. REVIEW029의 소스가설을 실제 인증된 main1.5 UI와GET/state로 독립 재현했다. artifacts/checkpoints/event-time-before/result.json은 서로다른created UTC값55개를 가진55행 모두 화면시각 “—”임을 대조한다. 해당 이벤트에는 timestamp/createdAt/time 필드가없다. 서버 Store.events()가 created를반환하는데 UI가다른세필드만time()에전달하는계약불일치가확정원인이다. 실제served index-CyjJuK5n SHA b6c12889… 확인, rendered HTML/PNG/소스복사/sha256보존. 현재로그화면은글로벌이며RTU선택/필터없음도기록했다.

읽기만수행하여새이벤트/RTU/제어/시나리오/배포/관측기변경은없다. 토큰은브라우저session에만주입하고출력/HTML/이미지본문비노출을확인했다. 기존소스검토는가설이었고이번은실제표시누락재현이며1.5불변checkpoint를수정하지않았다.

안전한최소수락: 기존created를우선사용하고명시적시간대+원본ISO접근정보를표시한다. 임의현재시각대입금지,누락/잘못된값은대시유지. 실제서로다른2개이상과날짜경계격리fixture를비교하고메시지/level/id내림차순/80개계약을유지한다. 새서버API/DB마이그레이션/필터기능은필요없다. 좁은화면/접근성/비밀비노출및정확한수정이미지의원격읽기대조가필요하며아직수정/채택/최종수락으로주장하지않는다.


ISSUE023 후보1.6 독립 읽기회귀: artifacts/checkpoints/candidate-1.6-event-time-round1/result.json PASS. 승인web5e638f9e… 및 실제servedbundle2bcc3c1b…를확인했다. root가준비한4기존event의created를독립UTC+9h 계산한 YYYY-MM-DD HH:mm:ss.SSS와화면에서정확대조하고id순서/message/level/KST헤더/원본UTC datetime·title·aria를검사했다. 실제값도UTC날짜에서다음KST날짜로넘어가며정확히표시됐다.

합성GET/state·SSE fixture5행은윤일→다음날자정/23:59:59/잘못된문자열/누락/무효달력일을검사했고alternate timestamp/createdAt로대체하지않음을확인했다. UTC와America/Los_Angeles context의표시가동일하고pageErrors0/nonGET요청0이다. 데스크톱과390px이미지를직접검토했다. 좁은표는기존table영역가로스크롤구조로첫viewport에서메시지열일부만보이며documentoverflow없음검사를통과했다.합성SSE스트림은유한응답이라스크린샷연결표시가다시연결중일수있으며운영연결실패의증거가아니다.

이실행은rootlocalserver95785/3110에기존데이터읽기만수행했고새이벤트/서버/RTU/명령을생성하지않았다. 실제main수정이미지·복원게이트는아직별도이므로ISSUE023전체종결은보류한다. source복사/hash/HTML/3PNG와원본로그를보존했다.


운영 harness 정리 후속: candidate1.6 form round1은44검증PASS였으나 기존finally가latency만해제하여owned목표200kW를남겼다. 당시소유ID한정기본controls복구를별도owned-settings-cleanup.json에기록했고그원본은유지한다. 이번 browser-command-form.cjs는실제201응답projection을등록즉시wx0600 baseline-UUID.json으로보존하고setup/case예외에도outerfinally에서소유faults/발전기on·limitPct·targetLimitKw를그기준으로복구한다. 기존RTU와전체ownedprojection을재조회비교한다. PATCHguard는capturedplant/generator ID만허용하고command/weather/replay/타RTU쓰기거절focused1test PASS. 실패진단은정제고정문구,cleanup실패는nonzero+cleanup-failure.json이며성공result는정리후에만발행한다.

실제local3110 fresh candidate-1.6-command-form-round2-cleanup은원래deadline/300초wrapper하에서44checks/5UI POST 및actual201BaselinesRestored=true/preExistingUnchanged=true로종료0. 기존root3RTU와다른시험RTU도변경하지않았다. 소스/기준/cleanup/hash/이미지/로그를별도보존했다. 제품기능변경이아니며이변경때문에필요한한번의회귀만실행했다. 기존round1/1.5근거는수정하지않았다.


### 후보1.6 exact-image 운영 harness 기동 실패 및 HTTP-only 재검증

메인/배포담당 보고: 첫 exact-image 검증 세션35956이exit125로끝났다. HOST=0.0.0.0인HTTP-only fixture에필수API_TOKEN을설정하지않아기동이거절됐으며의도한인증guard작동이다. 이를앱회귀로분류하지않는다. 보존된 verification.log는deadline wrapper의정제실패문구만포함하므로구체적설정원인은담당실행설명과구분한다.

독립파일대조로 app-unit.log77/77PASS, 실제broker integration.log와advanced-integration.log의PASS를확인했다. 이완료시험을HTTP설정실패때문에반복하지않았다. local-cleanup.json은소유grid-331-qa/broker/http제거와mainOrRegistryChanged=false를기록한다.

HTTP-only round2는새이름/private token을사용하는수정이다. 실제 served-assets.json은이미지4af99e7b…/version1.6.0/servedJS2bcc3c1b…및CSS가image파일과일치하는PASS를기록한다. http-round2-cleanup.json은grid-331-http-round2정리/mainOrRegistryChanged=false를기록한다. 이범위는HTTP정적파일·버전·이미지연결검증이며전체remote배포/복원PASS를뜻하지않는다. 초기실패로그는유지하고추가담당receipt로설정원인·수정상태를확정한다. 본검토는읽기와issues문서만수정했으며run/resume/NEXT/source/remote는변경하지않았다.


HTTP-only 후속 receipt 확인: deploy/verification/candidate-331ab9a/http-fixture-attempts.json은 첫 실행의 API_TOKEN 누락과 server/config.js의 외부 bind 인증 조건을 대조한다. 원래 child stderr는 wrapper가 보존하지 않았으므로 원오류 문구를 직접 관측했다고 주장하지 않는다. round2는 메모리에서 생성한 임시 토큰을 제공했고 동일 이미지/서버 소스에서 handle7893 exit0 및 served-assets/cleanup receipt로 성공을 확인했다. 양 실행 script SHA를 receipt에 보존했다.

## ISSUE-024 — 승격 전 원격 백업 host 시간 초과와 동시 원격 health 장애

심각도 P1 운영 가용성. 현재 상태: 관찰 사건 복구·백업 제한 보완·실제 재시험 통과, 최초 stall 원인은 미확정(후속 기록 참조). 최초 등록은 OPEN/원인 조사 중이었다. 담당은 메인·배포, 독립 검토는 issues이다. 1.6 변경 전 main1.5 runtime6d165d1/image2fd3f21에서 발생했으며 후보1.6 앱 회귀로 분류하지 않는다. 기존 성공 백업의 무결성 실패를 뜻하지 않는다.

2026-09-21 UTC 시간 순서와 증거:
- 15:34:17.227: snapshot 생성 시작. private journal artifacts/operations/backups/20260921T153417228Z.json의 원본은 유지한다. 전체 stopAt15:37:17.227/원래 deadline22:07:33.079009+00:00이며 명령별 snapshot90초 제한이다.
- 15:35:47.386: host 세션47567 terminal1, stage snapshot creation/incomplete로 종료했다. journal의 remoteCancellationGuaranteed=false와 같이 host 종료는 원격 SQLite 작업 취소 보장이 아니다.
- 배포담당 15:36:02 읽기 관측: 최종 /data/stable-6d165d1-20260921T153417228Z.sqlite는 없고 .snapshot.part는439500800바이트로 갱신 중이며 원격 node PID406이 존재했다. 이 수치·프로세스는 담당 관측으로 구분하며 완료된 snapshot이나 복원 가능성의 증거로 쓰지 않는다.
- 메인 15:36:06 관측: supervisor remote_not_ready/health timeout5003ms, primary 누적 APIerrors3/connectionErrors7, audit connectionErrors4. 누적값을 이번 사건만의 증가량으로 해석하지 않는다. 관측 원문 보존은 메인이 진행 중이다.
- 독립 확인한 deploy/verification/candidate-331ab9a/pre-upgrade-backup-incident-cluster.json(checkedAt15:36:33.401005Z): Pod grid-79fdb78bf8-6rbjz/UID62d0d7fd-915d-41e4-990b-5714fc7a6901, app image2fd3f21. readiness timeout 첫15:35:40, liveness timeout15:35:46~15:36:16, 15:36:16 Killing 이벤트 “Container app failed liveness probe, will be restarted”, 15:36:30 readiness connection refused가 있다. 같은 캡처 status는 app ready=false/restartCount0으로 아직 재시작 완료를 입증하지 않는다. MQTT container는 ready=true/restartCount0이다.

기대: 제한된 host 대기 후 불완전 백업을 성공으로 채택하지 않고, 원격 잔여 작업과 실제 서비스 상태를 읽기로 확인해야 한다. 실제: host 시간 제한과 .part/최종파일 분리는 작동했으나 원격 잔여 작업 및 클러스터 health 실패가 동시 관측되었다. 따라서 단순 local forward 중단으로 축소하지 않는다. 백업 부하, 잠금, 자원 경합 등의 원인은 아직 가설이며 현재 자료만으로 인과관계를 확정하지 않는다. 단일 top 값으로 전체 구간 자원 고갈 부재도 주장하지 않는다.

해결/종결 조건: 원격 프로세스·Pod 전후 상태 및 API/MQTT 재수신을 실제 receipt로 확인하고, 불완전 snapshot을 final manifest/복원 근거로 채택하지 않았음을 대조한다. 필요 수정 및 회귀 범위는 원인 확인 뒤 별도 기록한다. 이번 독립 검토는 파일 읽기와 이슈 기록만 수행했으며 원격 변경, 추가 백업, 파일 삭제, 재시작은 하지 않았다. 원래 최종 작업 마감은 유지한다.

ISSUE024 후속 원격 복구 확인: pre-upgrade-backup-incident-after-pods.json은 같은 UID의 app가15:36:29 exit0/Completed로 종료되고15:36:33 다시 시작하여 restartCount1임을 확인한다. broker는0이다. 이는 위 최초 캡처 이후의 상태이며 최초 restartCount0 기록을 대체하지 않는다. pre-upgrade-backup-incident-health.json은15:36:55.602Z 내부 HTTP200/66ms/version1.5.0/MQTT connected=true를 확인한다. 재시작은 kubelet liveness 조치이며 에이전트가 restart/kill/배포하지 않았다는 담당 receipt와 일치한다. 이 내부 복구로 전체 구독자 수신 무손실을 주장하지 않는다.

pre-upgrade-backup-summary.json(15:37:24.126Z)은 최종 snapshot 부재/metadata 미생성/INCOMPLETE/promotionReady=false 및 기존 stable-backup-6d165d1.json 보존을 명시한다. 메인의 artifacts/checkpoints/backup-incident-20260921T1534/initial-summary.json에는 실제 observer/supervisor prefix·latest의 SHA가 연결되어 있다. 부분 snapshot 추가 생성이나 삭제는 없었다. 서비스 복구는 확인했지만 stall의 근본 원인과 다음 백업의 안전 조건은 미확정이므로 이슈 OPEN을 유지한다.


### ISSUE024 후속 — 제한 보완 후 실제 백업 재시험 통과

운영 helper3c41808에 대한 메인 보고 검증은 로컬 전체290개, 실제 Node24 환경의115개 및 보안 검토 통과이다. 이는 운영 도구 검증이며 앱 stall의 근본 원인을 확정하는 시험은 아니다. 이번 독립 문서 검토는 deploy/verification/candidate-331ab9a/pre-upgrade-round2/summary.json과 root-backup-review.json을 직접 대조했다.

실제 round2 백업은828805120바이트/SHA256 b6e2e3dd458bca22ae4dc2522ce77daf47603214813cf9dbd9136c7f3d0e49be, snapshot9938ms, integrity ok, remainingPages0, workerExitConfirmed=true로 PASS/terminal0이다. 원격 supervisor80초/host90초 경계가 기록되어 있으며 종료 후 관련 원격 프로세스0이다. 12회 health 표본은 실패0/최대1332ms, 모든 Ready 관측 true, Pod UID 동일, app/broker restartCount1/0으로 추가 재시작이 관측되지 않았다. 한 차례 재시험의12개 표본으로 무중단·무영향 또는 모든 요청의 지연 상한을 보장하지 않는다.

메인 독립 root-backup-review.json은15:53:56.018668Z 로컬 파일 전체 streaming hash·실제 크기·0600 권한과 metadata 일치를 확인한다. 이는 전달 검증 PASS_TRANSFER_REVIEW이며 이 새 백업의 독립 복원 검증은 아직 아니다. 이전 ad34 검증 백업/복원 증거 및 최초439500800바이트 .part를 보존했고 main deployment는 변경하지 않았다. 1.6 원격 배포 완료 근거로 사용하지 않는다.

상태 정리: 관찰된 서비스 장애는 복구됐고 백업 실행 제한을 보완한 실제 재시험은 통과했다. 최초 stall과 online snapshot의 인과관계는 미확정이며 앱 결함의 완전한 원인 해결을 주장하지 않는다. 앞의 OPEN 문장은 최초 조사 시점 이력으로 보존한다. 신규 백업의 복원·승격은 별도 게이트다. 이번 갱신은 issues 문서에만 수행했고 원격 작업·재시험·파일 삭제를 추가하지 않았다.

ISSUE023 실제 원격1.6 읽기 검증 단계: deploy/verification/candidate-331ab9a/main-event-time/result.json PASS, 세션31506 exit0. main3104에서 기존59개 이벤트의 created를 독립 UTC+9h 계산값과 대조하여 표시 밀리초·KST 헤더·원본 UTC datetime/title/aria·ID 순서·메시지·level 일치를 확인했다. 실제 로드 index-v7p0JZRW.js SHA2bcc3c1bc75a178acf7dac51bd91436b6f5e30bd1c8e3f1a176980900417be06와 승인 바이트가 일치하며 pageErrors0/nonGET0이다. 화면 캡처도 직접 확인했다.

운영 harness에 EVENT_ACTUAL_ONLY=1을 추가했고 main은 이를 요구한다. 이번 synthetic phase는 executed=false로 완전히 건너뛰었으며 기존 로컬 합성 기본값은 유지한다. node--check 통과 후 실제 main 한 번만 실행했다. HTML/PNG/실제행 비교 결과/실행 소스 복사와 sha256.json을 보존했으며 제어·등록·시나리오 등 API 쓰기와 runtime 변경은 없다. 원격 수정 표시를 입증한 단계이며 복원 및 독립 제품 검토가 남아 ISSUE023 전체 종결은 아직 보류한다.

ISSUE023 현재1.6 격리 복원 읽기 검증 단계: 배포담당이 동일851673088바이트/9bd8 snapshot의 freshPVC 원본 데이터 대조를 마친 뒤3105를 인계했다. candidate-331ab9a/restored-event-time/result.json은 actual-only79개 기존 이벤트의 KST 표시/UTC 속성/ID 순서/메시지·level과 승인2bcc 번들을 대조해 PASS, synthetic.executed=false/nonGET0/pageErrors0이다. 원본 파일·HTML·PNG·실행 소스 및 SHA를 보존했다. 앞서 같은 복원본에서 순차 form44/5POST와 receipt14를 통과했고 고유 생성RTU만 정리하여 양 cleanup preExistingUnchanged=true/form actual201BaselinesRestored=true를 확인했다. 실제 main 제어 쓰기는 없다. ISSUE023의 현재 원격·복원 근거는 확보했으나 독립 제품 인수 판정은 아직 별도이며 전체종결을 선행하지 않는다.


ISSUE023 현재 기능 수정 검증 완료: 로컬 무효/누락/윤일·날짜경계/호스트 시간대 독립 검증, 실제 main1.6의59개 및 현재1.6 복원본79개 저장 이벤트 대조가 통과했다. candidate-331ab9a/restore-summary.json과 root-recovery-review/summary.json(16:13:59.267395Z)은 동일9bd8becb4211ee0edd9217db99e05b63d8fa3f5437a8e4cc7be2ace449cb3137 snapshot의 현재1.6/이전1.5 freshPVC 복원19보고서+2Pod identity 근거를 확인한다. 양 버전 form44/receipt14도 통과했고 복원 Deployment0/Pod0/4PVC 보존을 확인했다. 이전1.5의 이벤트 시각 대시는 알려진 이전 동작이며 그 버전의 수정 통과로 표현하지 않는다. 독립 제품 REVIEW032는 진행 중이고 최종 media/전체 목표 완료는 별도다.

ISSUE024와의 경계: helper 보완 후 실제 round2 및 후속 정상·pending snapshot 검증 성공은 백업 운영 경계의 후속 증거다. 최초1.5 stall의 근본 원인 미확정과 자원 경합의 잔여 위험은 그대로 남으며 ISSUE023 표시 수정 또는1.6 복원 성공으로 해소됐다고 간주하지 않는다.

IDEA011 독립 browser 인수 준비: scripts/check-command-list-freshness.cjs는 후보3111/제품1.7만 통제 응답 fixture를 허용하며 main3104·격리복원3105는 명시적 LIST_ACTUAL_ONLY=1로 실제 읽기만 허용한다. 정확 bundle SHA/private token 경로/대상·버전은 브라우저·파일·API 접근 전 검증한다. 기존 명령있는 RTU와 빈 RTU를 GET로 찾아 사용하며 setup writes0, 모든 browser API nonGET는 차단·실패판정한다. 새 RTU/명령을 만들지 않는다. 실제 목록 순서·출처·상태/브라우저 성공시각 검증과 로컬503·header/body stall·늦은RTU응답·해제·좁은 화면 fixture를 구분해 기록하도록 준비했다. 문법검사 및 사전 대상경계2tests PASS이며 실제 browser 실행은 후보 fixture 준비 후 수행한다. 준비 자체로 UI-13 인수 통과를 주장하지 않는다.

IDEA011 실제 로컬 후보1.7 browser round1: artifacts/checkpoints/candidate-1.7-command-list-round1/result.json 8검증군 PASS, handle74819 exit0. 실제154fe2 번들의 기존 expired 명령/REST 출처·ID·순서와 브라우저 성공시각을 대조했다. 로컬 GET503 주입 후 기존행·시각 보존/항상 표시되는 목록 경고/SSE정상과 분리/원오류 비노출, 실제GET복귀 후 경고 해제와 시각 갱신, 최초loading·최초실패·실제empty 구분, 지연A 한요청·전환abort·늦은A의B불혼입을 확인했다. header 대기15482ms/body 대기15502ms 후 유한 timeout, 각1요청, 실제 loopback HTTP body 연결close1/동시최대1, unmount시 abort·후속poll없음도 확인했다. 장애응답은 browser route 및 소유loopback서버 fixture이며 실제원격장애가 아니다. test API쓰기0/setup쓰기0/pageErrors0이며 root의 사전3등록+1expiredPOST는 별도creation.json에 있다.

최초 screenshot이 viewport상단만 보여 목록panel을 포함하지 않은 harness 증거 품질 문제를 발견했다. 원본은 보존하고 shothelper에 panel.scrollIntoView를 추가했다. 전체timeout시험을 반복하지 않고 별도 GET-only capture-panel.cjs/handle73455 exit0로 desktop/narrow 보완이미지를 생성·직접 검토했다. 목록경고·마지막확인·보존행이 보이며390px에서 설명은 줄바꿈되고 표는 기존 가로스크롤이다. 원본 실행 소스 SHA와 보완 캡처/terminal/hash를 같은 폴더에 보존했다. 현재 앱/서버 소스 변경은 없고 원격 배포·복원 인수는 별도 게이트다.

## ISSUE-025 — 고정 이미지 template에서 배포 인자 치환 무효

P1 운영 배포 정확성, 상태 RESOLVED/운영 renderer 수정 검증 완료. 최초 수정 직후 상태는 FIX_IMPLEMENTED/후속 검증 중이었다. 발견자는 메인, 수정은 security, 독립 이슈 기록은 issues이다. 기존 scripts/deploy-image.sh는 GRID_IMAGE 문자열만 sed로 치환했으나 deploy/app.yaml의 app image는 이미 digest로 고정되어 해당 문자열이 없었다. 따라서 새 이미지 인자를 제공해도 template의 이전 이미지가 그대로 적용될 수 있었다. 이는 실제 운영 도구 결함이며 단순 표시 문제나 가상의 입력 위험이 아니다. 실제1.7 main은 메인의 별도 전략 patch로 정확한 이미지에 배포되었으므로 이번 치환 결함이 현재1.7 오배포를 일으켰다고 주장하지 않는다.

수정 소스 확인: scripts/render-deployment.mjs는 정확한 app/broker 저장소와 소문자64자리 sha256 인자를 검증하고 app·mqtt·migrate-mqtt-storage의 정확한3개 image slot을 치환한다. 누락·중복·추가 image 및 지원하지 않는 형식은 적용 전 거절한다. 고정 pin과 placeholder 모두 지원하며 임의 YAML parser가 아닌 현재 canonical template만 지원한다. deploy-image.sh는 고정 template에서 렌더링한 뒤 적용하고 고유 private 임시파일/소유파일 exit cleanup을 사용한다. template은 실제1.7 pin으로 갱신되었다. 앱 코드/API/데이터 변경은 아니다.

docs/security/DEPLOYMENT-RENDERER-REVIEW.md와 연결 evidence/deployment-renderer-review.json 및 deployment-renderer-tests.log에 순수 renderer3시험과 sh -n 통과가 기록되어 있다. 이 이슈 작성자는 소스·검토 문서를 독립 확인했으며 실제 배포를 실행하지 않았다. 메인의 wrapper client-dry-run 및 fullsuite는 진행 중으로, 아직 완료·실제 rollback 검증이라고 기재하지 않는다. 후속 결과를 별도 기록한 뒤 상태를 갱신한다. canonical YAML 형식 변경 시 renderer 재검토가 필요한 잔여 제약을 유지한다.


ISSUE025 후속 검증 완료: 메인의 focused6시험은 기존 순수 renderer3개와 wrapper3개로 구성된다. 인자 digest 반영·0600·성공 cleanup, 잘못된 인자의 kubectl 미호출, apply exit9 시 rollout 미실행 및 cleanup을 확인했다. artifacts/checkpoints/deployment-renderer/client-dry-run.json은 실제 kubectl apply --dry-run=client --validate=false가5개 객체를 파싱하고 app A×64/양 broker B×64 digest를 정확히 반영함을 기록한다. 실제 apply/원격 쓰기는0이며 실제 배포나 rollback 완료 시험으로 확대하지 않는다.

같은 디렉터리 full-suite.log는 전체312/312 PASS를 확인하며 메인 handle86685 terminal0이다. focused6은 전체312와 중복될 수 있어 합산하지 않는다. 이전 원인·수정·실제1.7 영향 없음의 범위를 유지하고 ISSUE025를 운영 도구 수정 검증 완료로 종결한다. canonical template 형식 제약과 실제 배포 전 대상 확인 필요성은 남는다. 이 후속 작성은 해당 receipt와 로그의 읽기 대조 및 issues 문서 수정만 수행했다.


## ISSUE-026 — NFR08 연동 client 및 quickstart 계약 불일치

현재 상태 FIX_VERIFIED_LOCAL/원격·복원 인수 대기. 최초 상태는 OPEN/미수정이었다. P2 연동 관찰·재현성, legacy 문구는 P3 계약 정확성. 발견·before 근거는 `docs/operations/NFR08-CONTRACT-REVIEW-20260922.md` 및 `NFR08-CONTRACT-FIXTURES-20260922.json`(reviewedHead f9147d1). 본 이슈 검토자는 두 파일을 읽어 대조했으며 연결·MQTT 발행·RTU 생성·추가시험을 수행하지 않았다. 담당 메인/transport, 제품 REVIEW040 최소수정 검토 중이다.

- **026-A / status 관측 유실(P2)**: 서버 retained/LWT status의 online true와 false를 순수 parser에 입력했지만 monitorPrintedObject가 동일하며 online 필드가 없다. client-message.js의 축약 반환값을 vpp-client가 그대로 출력하여 공급 client로 online/offline을 구분할 수 없는 실제 before fixture다. 제안은 엄격 boolean online만 보존하고 그 외는 null로 표시하는 최소수정이며 command-status 의미 변경이나 PUBACK를 완료로 간주하는 변경이 아니다.
- **026-B / standalone quickstart 환경 누락(P2)**: protocol의 npm install→broker→build→start 블록이 .env 준비 없이 실행된다. Compose는 loopback18883을 노출하지만 bare config의 broker 기본값은1883(UI3001)이다. .env.example은 UI3101/broker18883이다. 따라서 해당 블록만 따라 실행하면 기대 broker로 연결되지 않거나 다른1883 broker에 연결될 수 있다. 이 경계는 소스/config 순수 대조로 확인했으며 실제 잘못된 broker 연결을 일으켜 재현하지 않았다. 수정안은 기존 .env를 덮어쓰지 않는 준비 단계와 포트 구분이다.
- **026-C / 미지원 legacy 문구(P3)**: protocol이 v1 command-ID 보존 및 legacy_accepted 가능성을 설명하지만 현재 greenfield store/control에 대응 migration/read 경로가 없고 client도 해당 상태를 허용하지 않는다. 지원하지 않는 옛 DB 입력을 지원 계약으로 오인하게 하는 문서 결함이다. 삭제 또는 명시적인 범위 제외가 필요하며 legacy 기능 추가를 요구하지 않는다.

내부 운영 CONTRACTS.md의 문서 정리는 위 before 근거와 별도이며 A/B/C 실제 runtime/protocol 수정 완료를 뜻하지 않는다. 예상 IDEA012 v1/제품1.7.1 후보/PRD1.15는 이 최초 기록 시점 미채택이며 stable1.7 운영 및 검증된1cab 복구기준을 그대로 유지한다.

종결에는 각 수정의 focused 회귀/안전한 quickstart 대조, status true/false/비boolean 구분, legacy 미지원 계약의 일관성 및 채택된 범위에 필요한 제품 인수 근거가 필요하다. 현재는 계획만 존재하므로 해결로 표시하지 않는다. 오디오 실제 청취·외부 KMA/AWS/VPP·노드HA 및 최종 미디어/원래 시간 게이트의 미완료 상태도 유지한다.


### ISSUE026 후속 — 채택 및 로컬 수정 검증

IDEA012 v1/제품1.7.1/PRD1.15 채택 후 `docs/product/REVIEW-041.md` 및 `artifacts/checkpoints/candidate-1.7.1-local/summary.json`을 읽어 대조했다. AT-VPP-STATUS-01-01~03은 verified_local, 04는 partial이다. 현재 실제main은 stable1.7이며 정확 후보 이미지·원격 UI/MQTT/outbox·같은 백업의 현재1.7.1/하위1.7 복원·정리·불변 체크포인트가 남아 전체종결하지 않는다.

026-A: strict boolean true/false와 비boolean·누락 null, retained 양값/RTU경계/크기·비밀제거 및 command-status 불변의 로컬 회귀가 통과했다. 실제 격리 broker에서 먼저 발행된 retained online 이후 shipped monitor를 시작하고 연결 stream.destroy/reconnectPeriod0으로 실제 LWT offline을 받아 true/false를 구분했다. 수동 false 발행 fixture가 아니며 다른RTU connected/명령발행0/monitor SIGTERM exit0 범위다.

026-B: fresh private 소스·의존성·환경·DB·build/실제 guide serving·3demoRTU 연결이 통과했다. 기존 소유 broker18883 재사용이며 새 broker 설치 시험은 아니다. 점유된3101을 보존하고 명시적 PORT3112로 실행했으며 예제3101/18883 값은 별도 대조했다. npm start와 같은 node 명령을 직접 실행해 종료 소유권을 확보한 범위다. quickstart-attempts.json의 첫3101점유 preflight 거절(exit125), 둘째 macOS cp-n 기존파일 skip exit1로 인한 harness실패를 원본 그대로 유지한다. 수정은 absent/existing/symlink를 구분하는 conditional guard이며 fresh 재시험에서 양경로exit0/기존환경불변/소유포트종료를 확인했다. 앞선 실패를 성공으로 바꾸지 않는다.

026-C: protocol과 PRD가 예제/기본 포트 및 환경 준비 guard를 일치시켰고 v1 legacy_accepted 지원 약속을 제거했다. greenfield 범위 밖 legacy migration 기능을 새로 구현했다고 표현하지 않는다.

전체317/317·실제broker integration/advanced·report/client-security·root build는 각각 기록된 범위에서 PASS다. focused client4/media53은 전체317의 부분집합이므로 더하지 않는다. UI 번들154fe2는 기존1.7과 같지만 metadata/guide/client 변경의 정확 이미지 게이트를 대신하지 않는다. 이번 독립 작업은 읽기와 이슈 문서 갱신만이며 실제 KMA/AWS/VPP·오디오 청취·HA·최종 미디어와 시간 게이트의 잔여 상태는 유지한다.
