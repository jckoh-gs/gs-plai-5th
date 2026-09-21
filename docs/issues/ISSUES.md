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
