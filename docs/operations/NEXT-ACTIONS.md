# 자율 실행 인계

이 기록은 전체 목표 완료 선언이 아니다. 현재 기능 기준은 제품1.3.0 / PRD1.10 / runtime3fa3ba0, stable-v1.3.0이다. source·실행 이미지·백업·검증의 연결은 checkpoint-1.3.0.json과 run.json에 있다. 이전1.0.0,1.1.0,1.2.0도 보존했다.

- 실제 시작: 2026-09-21 17:07:33 KST.
- 기능 동결/복원 판단/최종 미디어 시작: 2026-09-22 06:37:33 KST.
- 종료: 2026-09-22 07:07:33 KST. 시간 연장 없음.
- 진행 중 목표를 완료 처리하지 않는다. 추가 개발자 입력을 전제로 하지 않는다.

## 완료된1.3 기능 회차

PRD1.10 / IDEA-007 선택RTU 시나리오와 ISSUE020 기상 조회 피드백을 검증했다. 정확한3fa3ba0 이미지, 실제 k3s UI·MQTT·outbox 재시작, 동일420466688바이트 백업의 별도1.3 및 하위1.2 복원까지 통과했다. 최종 영상·PPT·시간·인도 조건은 미완료다. 재접속 시 resume.json의 현재 세션과 첫 미완료 단계를 따른다.

## 관찰

현재 main 포트포워딩은3104/18884이며 kubectl은 항상 charles-k3s/gs-plai-5h를 명시한다. 터널 종료는 배포 종료와 다르다. 실제 배포는 단일 writer, Ready2/2 컨테이너다. read-only soak은 artifacts/soak/v1.3.0에10초마다 상태와 실제MQTT 샘플을 기록한다. 변경 전후 관찰을 이어 붙여 무중단으로 주장하지 않는다. 이전관찰은 artifacts/checkpoints/soak-1.0.0, soak-1.1.0, soak-1.2.0에 별도로 보존했다.

재개 시 clock과 run.json을 확인하고 latest.json 시각·API/연결 오류·invalid·대기열·메모리를 확인한다. 관찰 프로세스가 끝났으면 종료 구간을 기록하고 새 SOAK_DIRECTORY 하위 세션으로 시작한다. 정상이고 의미 있는 변화가 없으면 같은 시험을 반복하거나 알림을 반복하지 않는다. 주기적으로 df와 Pod 재시작/Ready를 확인한다. 외부 KMA/AWS/실운영 VPP 자격정보는 없으며 성공으로 꾸미지 않는다.

RTU별 추가 전체 SCADA 관찰도 실행 중이다. 현재 강화 세션9a9f5e31 / root handle30644, primary706da638 / handle40339를 확인한다. 이전54bdac4e/5651과 primary67091은 계획 교체로 종료되었다. primary soak를 대체하지 않으며 freeze에서 각 관측과 소스를 별도로 보존한다. 동일ID/동일본문 중복과 sequence/샘플 간격은 문서의 맥락 규칙으로 해석한다.

11:16Z에 로컬관측이 일시실패한 뒤 supervisor가 자동복구했다.11:19Z에는 그때발견한시각기록오류를수정한감시프로세스로 계획교체했다. 당시supervisor root handle25872/PID54951(`Mon Sep 21 20:19:20 2026`)이며 이전98912는정상종료됐다. `artifacts/checkpoints/reconnect-20260921T1116`에 두사건과원문증거를분리보존했다. 당시복구후 main누적APIerror1/connectionErrors3, 추가RTUobserverconnectionErrors5는 과거누적값이다. 이후증가분/현재apiReady·MQTT연결·관측신선도·샘플이상을확인하고 기존누적값을새장애로반복보고하지않는다. 카운터를초기화하거나무중단으로표시하지않는다.

11:34Z에 추가 로컬 검증 실패가 관측되어 같은 supervisor가11:34:05.722Z 단절/11:34:07.371Z 정상 복귀를 기록했다. 수동 재시작이나 강제 네트워크 차단은 없었다. 원인은 미확정이며 백업과의 인과관계도 입증하지 않았다. `artifacts/checkpoints/backup-recovery/summary.json`에 원문 구간을 보존했다. 최신 기준 누적값은 main APIerrors2/connectionErrors3, 추가 observer connectionErrors6이다. `resume.json`의 knownCumulativeCounters를 기준으로 이후 증가분을 판단한다.

11:57/11:59Z에도 로컬 연결 재수립이 기록됐다. 최신 누적 기준은 main APIerrors3/connectionErrors3, 추가observer connectionErrors8, RTU별 sampleDiscontinuities1이다. 11:59 연결 공백 중 clean-session 관측기가8개배치/300샘플을 수신하지 못했으며 해당 원격 outbox의 연속 샘플과 PUBACK는 확인했다. 모든 수신자의 무손실을 뜻하지 않는다. `artifacts/checkpoints/reconnect-20260921T1159/summary.json`을 보고 기존 공백을 새 장애로 중복 보고하지 않는다.

1.2의 누적 오류·수신 공백은 위 이력과 보존된 아카이브에 남겼다. 현재1.3의 별도 관측은12:22:04/05Z에 시작했으며 resume.json.currentObservationBaselines와 currentObservationHandles를 먼저 사용한다. 기존 누적값을 새 세션의 장애로 비교하거나 전체 실행이 무중단이었다고 주장하지 않는다.

## 동결 준비와 최종30분

1. 현재 runtime 소스가 stable 이미지와 일치하는지 확인한다. 미완성 작업이 있으면 검증된 stable 이미지·필요시 호환 백업을 사용한다. 기존 백업을 덮어쓰지 않는다.
2. 원격 최신 정상 DB는 scripts/remote-backup.mjs로 streaming 일관 백업·전송·해시·무결성을 검증한다. BACKUP_METADATA_PATH는 새로운 경로를 사용한다. 전체네트워크예산180초/원래마감과1MiB검증chunk를사용하며중단시 artifacts/operations/backups의privatejournal과정확한remotePath를먼저확인한다. .snapshot.part는미완성이다. 완료된동일snapshot의응답유실·전송실패만 REMOTE_BACKUP_PATH로재검증/전송하고새snapshot을중복생성하지않는다. NETWORK-RECOVERY.md의동기I/O·원격취소한계를유지한다. backup/image/source를 run.json에 반영하고 변경 기록을 commit한 뒤 새 릴리스 매니페스트를 생성·검증한다. 기존 checkpoint 매니페스트는 불변이다.
3. 최종 영상의 입력은 scripts/media/final-input-template.json에서 복사한다. 승인된 manifest.source.commit과 배포 이미지 digest, 실제3104/18884, 비밀 파일 경로를 넣는다. 비밀 본문을 저장하지 않는다. prepare-final-scenes.cjs는 동결 창을 검사한다.
4. record-demo.cjs로 실제 UI·한국어 음성/자막·포인터/클릭/확대 영상을 만든다. 영상은 약4분, 사전 전체 제작은약4분26초였다. 최종버전에서 새로 촬영하며 리허설을 최종으로 재사용하지 않는다.
5. 실제VPP125kW/상태전이, 전체 디코딩, 대표프레임·음성·자막·포인터·확대/잘림을 확인한 뒤에만 영상 검수 상태를 passed로 바꾼다. 최종 캡처와 실제 근거로14장 편집 가능한 PPT를 만들어 모든 슬라이드를 각각 검수한다. 두 산출물은 동일 매니페스트를 참조한다.
6. 시연용 가상장애를 모두 해제하고 정상 재생·현재 배포Ready를 확인한다. 영상·SRT·원고·장면JSON·소스·대표프레임·PPT·노트·검수기록 및 안전한 접속/백업 경로를 인도한다. 미디어 제작 이후 추가 백업이 있다면 촬영 전 기준 백업과 구분한다.

새 최종 매니페스트가 새 백업을 선택하면 그 정확한 스냅샷의 별도 복원 근거도 먼저 확보한다. `FINAL-RESTORE-PLAN.md`의원본/목적SHA·init무결성·원본데이터비교·UI/MQTT 순서를따른다. 기존420MB백업의복원증거를새파일검증으로대체해표시하지않는다. 동결후0~7분정상버전/백업/복원/매니페스트,7~15분신규영상과검수,15~23분PPT와전장검수,23~30분인도검사를준비예산으로삼고마감은연장하지않는다.

정확한 명령과 도구 입력은 MEDIA-PLAN.md 및 scripts/media 아래에 있다. 리허설 검증은 artifacts/media-preparation/REVIEW.md에 있다. 최종 전체 목표가 충족되거나 종료 시점에 이르면 native heartbeat grid를 정리하고, 완료 여부를 사실대로 보고한다. 정상 동작하지 않은 항목을 완료로 표시하지 않는다.

## Reconnection entry

After interruption, read `resume.json`, run `node scripts/resume-status.mjs`, and reconcile actual state before advancing its first incomplete checkpoint. The singleton `node scripts/connection-supervisor.mjs` owns local forwarding; check `artifacts/operations/status.json` before starting another. Native heartbeat `grid` checks every ten minutes while the Mac and Codex app are running. Preserve run.json deadlines. See NETWORK-RECOVERY.md.

최종 인도 점검은 DELIVERY-PLAN.md를 따른다. 최종 미디어 생성 도구에는 서로 다른 이미지/접속 경로/영상의 혼합을 막는 검사가 추가되어 있다. MP4 검수 후 visualReview/claimsReview를 실제 확인 결과로 갱신하고 PPT를 생성한다. PPT 검수 후 `scripts/verify-delivery.mjs --manifest <최종 고정 매니페스트> --report <새 인도 목록 파일>`로 파일·해시·영상 연결·재생성 자료를 확인한다. 이 검사 통과만으로 목표 완료를 선언하지 않는다.


## 현재 미디어 준비 및 다음 제품 후보

최종 제작 준비 보완은 artifacts/checkpoints/final-media-lifecycle/summary.json에 보존했다. 실제 로컬 UI 시연 중단 후 소유RTU 정리, 재시험 등록/시나리오 전이/정리/영상디코딩,14장 PPT와 portable 재생성을 확인했다.76개 관련 시험과 독립보안 검토는 준비 증거이며 최종창 미디어를 대신하지 않는다. 최종녹화 실패 시 해당 핸들 종료 확인 후 private lifecycle journal을 읽고 recover-demo CLI를 사용한다. 초기baseline/실제응답이 없는 경우 메인이 실제상태를 대조하고 기존RTU 일괄초기화나 재등록을 반복하지 않는다. 최종facts는 same-video binder를 통과한 뒤 PPT 소스 묶음에 보존한다.

이전 검토 시점에 IDEA-008은 제안 v2로 미채택이었다. 이후 첫1시간 관찰을 보존했고 af8253f 커밋에서 PRD1.11/제품1.4 후보로 채택했다. 현재 UI 구현 중이며 안정·실제 배포는1.3을 유지한다. 채택·현재작업 상태는 메인이 관리하는 run/resume 및 PRD 기록을 우선한다. 실제 로컬 일반폼 범위 재현 및 극단 validSeconds의 날짜 예외(ISSUE-021)를 REVIEW-017에 기록했다.1.3 관찰 첫1시간 이후 메인이 범위/효용/안정성을 판단하고 채택 시 PRD/제품버전을 먼저 갱신한다. 새버전을 채택하면 release-features/final-deck-binding의 지원버전과 실제시연 문구도 함께 검토하며 기존1.3 안정복원 기준을 보존한다.


1.3 관찰에서12:58:27Z와13:03:17Z에 로컬 검증 실패 후 같은 supervisor가 각각12:58:29Z/13:03:18Z 재연결했다. Pod UID/이미지/재시작 횟수는 유지됐다. 현재 알려진 누적값은 main APIerrors2/connectionErrors0, 추가관측 connectionErrors2 및각RTU sampleDiscontinuities1이다.9배치/300샘플의 수신관측 공백은 동일 원격outbox의 연속샘플·PUBACK로 대조했으며 생성누락은 확인되지 않았다. 누락배치의 서버 기록시각은 단절 로그보다 이르고 과거 두 host시계 동기화도 독립 증명하지 않았으므로 단절시각과 발행시각의 인과를 단정하지 않는다. 원인은 미확정이다. artifacts/checkpoints/reconnect-20260921T1303/summary.json 및 resume.currentObservationBaselines를 사용하고 이누적값을새장애로반복보고하지 않는다.


13:08:35Z 추가 local_verification_failed도13:08:36Z 자동복귀했다.13:09:26Z에는 새단절로그 없이 API 관측1회가 추가 실패했다. artifacts/checkpoints/reconnect-20260921T1308/summary.json의 최종 캡처 시점에서 API/MQTT는 다시정상이며 누적 mainAPI4/connection0, 추가connection3/sampleDiscontinuities각1이다. 이후증가분은 최신resume기준과비교한다. 이회차는 추가 원격SQLite조회가 아닌 로컬원문보존이다. 첫1시간 관찰에서 오류분류가 부족한 supervisor진단을 검토하되 원인을 추정하거나 정상관측프로세스를 임의중복시작하지 않는다.


## 13:32Z 운영 인계 갱신

안정 배포는 계속1.3.0/runtime3fa3ba0이다. artifacts/checkpoints/soak-1.3.0-first-hour는 첫1시간 이후 최초 poll을 고정한 관찰이며 무중단/전체수락 증거가 아니다. 당시 primary505메시지/invalid0/API오류4, 추가관측505메시지/invalid0/연결오류3/각RTU샘플간격1을 보존했고 두 관측기는 계속 실행했다.

13:23Z에는 진단 필드가 추가된 supervisor로 **계획 교체**했다. 현재 handle7353/PID80224/processIdentity `Mon Sep 21 22:23:12 2026`, 이전25872는 exit0 종료다. 소유 로컬 forward의 계획 공백13:23:07.816–13:23:13.882Z는 자연 장애와 구분한다. primary40339/PID66462 및 audit30644/PID66465는 그대로이며 remote Pod UID e3d7f272-dcfb-4ea4-8472-bf42147a5b73도 유지했다. 원본은 artifacts/checkpoints/supervisor-diagnostics-activation/handoff.json에 있다. PID에 조치하기 전 실제 시작 identity를 다시 대조한다.

별도 자연 사건13:25:53.396Z는 health 단계 timeout5004ms였고13:25:54.682Z verified로 복귀했다. 최신 이 사건 기준 누적값은 primary API6/connection3, audit connection8/각RTU sampleDiscontinuities2다. root cause는 미확정이다.8배치/300샘플 관측 공백의 원격연속저장/PUBACK를 확인했지만 모든 구독자 수신 증거는 아니다. 해당 배치의 원격시각은 로컬단절로그보다 이르며 과거 host시계 동기화도 미입증이다. artifacts/checkpoints/reconnect-20260921T1325/summary.json 및 최신 resume 기준으로 이후 증가분만 판단한다.

Mac 전원기록의13:24:40 Sleep/13:24:42 Wake/13:25:48 DarkWake·WakeTime은 로컬 snapshot75.418초 공백과 겹친다. host 관여 가설을 지지하지만 정확한 suspend기간이나 모든증상의 단일원인을 확정하지 않는다. 제한된 허용필드만 보존한 artifacts/checkpoints/host-pause-20260921T1325/SUMMARY.md를 따른다. artifacts/checkpoints/host-power-guard-20260921T1333/activation.json에서 AC전원, handle11821/PID80946/processIdentity `Mon Sep 21 22:33:11 2026`, `caffeinate -i -s -t30861` 및 해당PID의 PreventSystemSleep·PreventUserIdleSystemSleep 두 assertion을 확인했다. 원래 종료까지의 임시 보호이며 지속 설정을 변경하지 않았다. 수동·강제 절전/종료/프로세스 종료를 방지한다고 보장하지 않는다. 이는 deadline 연장이나 향후 관측 무중단 보장이 아니다.
