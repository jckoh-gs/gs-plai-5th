# 자율 실행 인계

이 기록은 전체 목표 완료 선언이 아니다. 현재 기능 기준은 제품1.2.0 / PRD1.9 / runtime83d10ce, stable-v1.2.0이다. source·실행 이미지·백업·검증의 연결은 checkpoint-1.2.0.json과 run.json에 있다. 이전1.0.0과1.1.0도 보존했다.

- 실제 시작: 2026-09-21 17:07:33 KST.
- 기능 동결/복원 판단/최종 미디어 시작: 2026-09-22 06:37:33 KST.
- 종료: 2026-09-22 07:07:33 KST. 시간 연장 없음.
- 진행 중 목표를 완료 처리하지 않는다. 추가 개발자 입력을 전제로 하지 않는다.

## 진행 중 후보1.3

PRD1.10 / IDEA-007 선택RTU 시나리오 범위를 로컬 검증 중이다. 기상 조회 실패의 성공 알림 ISSUE020도 같은 후보에서 바로잡는다. 현재 k3s1.2는 유지하고 독립 검토·실제 브라우저·전체 시험·정확한 소스 이미지·원격 복원 및 이전1.2 호환성이 검증된 뒤에만 새 stable을 채택한다. 재접속 시 resume.json의 첫 미완료 단계부터 진행한다.

## 관찰

현재 main 포트포워딩은3104/18884이며 kubectl은 항상 charles-k3s/gs-plai-5h를 명시한다. 터널 종료는 배포 종료와 다르다. 실제 배포는 단일 writer, Ready2/2 컨테이너다. read-only soak은 artifacts/soak/v1.2.0에10초마다 상태와 실제MQTT 샘플을 기록한다. 변경 전후 관찰을 이어 붙여 무중단으로 주장하지 않는다. 이전관찰은 artifacts/checkpoints/soak-1.0.0 및 soak-1.1.0에 별도로 보존했다.

재개 시 clock과 run.json을 확인하고 latest.json 시각·API/연결 오류·invalid·대기열·메모리를 확인한다. 관찰 프로세스가 끝났으면 종료 구간을 기록하고 새 SOAK_DIRECTORY 하위 세션으로 시작한다. 정상이고 의미 있는 변화가 없으면 같은 시험을 반복하거나 알림을 반복하지 않는다. 주기적으로 df와 Pod 재시작/Ready를 확인한다. 외부 KMA/AWS/실운영 VPP 자격정보는 없으며 성공으로 꾸미지 않는다.

RTU별 추가 전체 SCADA 관찰도 실행 중이다. `TELEMETRY-AUDIT.md`의 강화 세션54bdac4e와 실제 handle을 확인한다. primary soak를 대체하지 않으며 freeze에서 각 관측과 소스를 별도로 보존한다. 동일ID/동일본문 중복과 sequence/샘플 간격은 문서의 맥락 규칙으로 해석한다.

11:16Z에 로컬관측이 일시실패한 뒤 supervisor가 자동복구했다.11:19Z에는 그때발견한시각기록오류를수정한감시프로세스로 계획교체했다. 현재supervisor root handle25872/PID54951(`Mon Sep 21 20:19:20 2026`)이며 이전98912는정상종료됐다. `artifacts/checkpoints/reconnect-20260921T1116`에 두사건과원문증거를분리보존했다. 당시복구후 main누적APIerror1/connectionErrors3, 추가RTUobserverconnectionErrors5는 과거누적값이다. 이후증가분/현재apiReady·MQTT연결·관측신선도·샘플이상을확인하고 기존누적값을새장애로반복보고하지않는다. 카운터를초기화하거나무중단으로표시하지않는다.

11:34Z에 추가 로컬 검증 실패가 관측되어 같은 supervisor가11:34:05.722Z 단절/11:34:07.371Z 정상 복귀를 기록했다. 수동 재시작이나 강제 네트워크 차단은 없었다. 원인은 미확정이며 백업과의 인과관계도 입증하지 않았다. `artifacts/checkpoints/backup-recovery/summary.json`에 원문 구간을 보존했다. 최신 기준 누적값은 main APIerrors2/connectionErrors3, 추가 observer connectionErrors6이다. `resume.json`의 knownCumulativeCounters를 기준으로 이후 증가분을 판단한다.

11:57/11:59Z에도 로컬 연결 재수립이 기록됐다. 최신 누적 기준은 main APIerrors3/connectionErrors3, 추가observer connectionErrors8, RTU별 sampleDiscontinuities1이다. 11:59 연결 공백 중 clean-session 관측기가8개배치/300샘플을 수신하지 못했으며 해당 원격 outbox의 연속 샘플과 PUBACK는 확인했다. 모든 수신자의 무손실을 뜻하지 않는다. `artifacts/checkpoints/reconnect-20260921T1159/summary.json`을 보고 기존 공백을 새 장애로 중복 보고하지 않는다.

## 동결 준비와 최종30분

1. 현재 runtime 소스가 stable 이미지와 일치하는지 확인한다. 미완성 작업이 있으면 검증된 stable 이미지·필요시 호환 백업을 사용한다. 기존 백업을 덮어쓰지 않는다.
2. 원격 최신 정상 DB는 scripts/remote-backup.mjs로 streaming 일관 백업·전송·해시·무결성을 검증한다. BACKUP_METADATA_PATH는 새로운 경로를 사용한다. 전체네트워크예산180초/원래마감과1MiB검증chunk를사용하며중단시 artifacts/operations/backups의privatejournal과정확한remotePath를먼저확인한다. .snapshot.part는미완성이다. 완료된동일snapshot의응답유실·전송실패만 REMOTE_BACKUP_PATH로재검증/전송하고새snapshot을중복생성하지않는다. NETWORK-RECOVERY.md의동기I/O·원격취소한계를유지한다. backup/image/source를 run.json에 반영하고 변경 기록을 commit한 뒤 새 릴리스 매니페스트를 생성·검증한다. 기존 checkpoint 매니페스트는 불변이다.
3. 최종 영상의 입력은 scripts/media/final-input-template.json에서 복사한다. 승인된 manifest.source.commit과 배포 이미지 digest, 실제3104/18884, 비밀 파일 경로를 넣는다. 비밀 본문을 저장하지 않는다. prepare-final-scenes.cjs는 동결 창을 검사한다.
4. record-demo.cjs로 실제 UI·한국어 음성/자막·포인터/클릭/확대 영상을 만든다. 영상은 약4분, 사전 전체 제작은약4분26초였다. 최종버전에서 새로 촬영하며 리허설을 최종으로 재사용하지 않는다.
5. 실제VPP125kW/상태전이, 전체 디코딩, 대표프레임·음성·자막·포인터·확대/잘림을 확인한 뒤에만 영상 검수 상태를 passed로 바꾼다. 최종 캡처와 실제 근거로14장 편집 가능한 PPT를 만들어 모든 슬라이드를 각각 검수한다. 두 산출물은 동일 매니페스트를 참조한다.
6. 시연용 가상장애를 모두 해제하고 정상 재생·현재 배포Ready를 확인한다. 영상·SRT·원고·장면JSON·소스·대표프레임·PPT·노트·검수기록 및 안전한 접속/백업 경로를 인도한다. 미디어 제작 이후 추가 백업이 있다면 촬영 전 기준 백업과 구분한다.

새 최종 매니페스트가 새 백업을 선택하면 그 정확한 스냅샷의 별도 복원 근거도 먼저 확보한다. `FINAL-RESTORE-PLAN.md`의원본/목적SHA·init무결성·원본데이터비교·UI/MQTT 순서를따른다. 기존169MB백업의복원증거를새파일검증으로대체해표시하지않는다. 동결후0~7분정상버전/백업/복원/매니페스트,7~15분신규영상과검수,15~23분PPT와전장검수,23~30분인도검사를준비예산으로삼고마감은연장하지않는다.

정확한 명령과 도구 입력은 MEDIA-PLAN.md 및 scripts/media 아래에 있다. 리허설 검증은 artifacts/media-preparation/REVIEW.md에 있다. 최종 전체 목표가 충족되거나 종료 시점에 이르면 native heartbeat grid를 정리하고, 완료 여부를 사실대로 보고한다. 정상 동작하지 않은 항목을 완료로 표시하지 않는다.

## Reconnection entry

After interruption, read `resume.json`, run `node scripts/resume-status.mjs`, and reconcile actual state before advancing its first incomplete checkpoint. The singleton `node scripts/connection-supervisor.mjs` owns local forwarding; check `artifacts/operations/status.json` before starting another. Native heartbeat `grid` checks every ten minutes while the Mac and Codex app are running. Preserve run.json deadlines. See NETWORK-RECOVERY.md.

최종 인도 점검은 DELIVERY-PLAN.md를 따른다. 최종 미디어 생성 도구에는 서로 다른 이미지/접속 경로/영상의 혼합을 막는 검사가 추가되어 있다. MP4 검수 후 visualReview/claimsReview를 실제 확인 결과로 갱신하고 PPT를 생성한다. PPT 검수 후 `scripts/verify-delivery.mjs --manifest <최종 고정 매니페스트> --report <새 인도 목록 파일>`로 파일·해시·영상 연결·재생성 자료를 확인한다. 이 검사 통과만으로 목표 완료를 선언하지 않는다.
