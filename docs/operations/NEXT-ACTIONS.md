# 자율 실행 인계

실제 배포와 복구 기준은 **제품1.5.0 / PRD1.12 / IDEA009**다. 이후 실제 읽기 검증에서 이벤트 시각55행이 대시로 보이는 ISSUE023을 발견했다. 현재 **제품1.6.0 / PRD1.13 / IDEA010** 후보로 이 표시 결함을 수정 중이며, UI04 현재 인수는 partial로 정정했다. 불변1.5 체크포인트는 당시 증거 그대로 보존한다. 전체 목표는 아직 완료되지 않았다. 같은 runId와 원래 마감을 유지하고 첫 미완료 단계부터 이어간다.

## 현재 배포·복구 기준과 완료한 검증

- runtime `6d165d1e8f3214a50ee66d2b13947f64d86658f5`, app digest `sha256:2fd3f21cd4f49702079a7a0ba7c2d40420a38db1bfd7b9e2744ad8e4cb8d5a0f`.
- k3s `charles-k3s` / namespace `gs-plai-5h` / deployment `grid`. 현재 Pod UID `62d0d7fd-915d-41e4-990b-5714fc7a6901`; 재개 때 실제 Ready 이미지를 다시 읽는다.
- [REVIEW027](../product/REVIEW-027.md): main UI/API/MQTT·실제 Pod 교체 outbox 및 정확한 동일 백업의 현재1.5/이전1.4 복원19근거 PASS. 신규 receipt8요구 기능 인수 완료.
- 선택 백업: [stable-backup-6d165d1.json](../../deploy/verification/stable-backup-6d165d1.json), 719527936바이트, SHA `ad34a074276243fb1b83d7fe081aa7631c9d2d51d0697e9d0dca5d7e5f349b24`. private0600 로컬 파일도 메인이 스트리밍 해시 검증했다.
- 두 복원 rig는 replicas0/Pods0, 소유3105/18885 터널 종료, 네 PVC와 백업 보존. [복원 집계](../../deploy/verification/candidate-6d165d1/restore-summary.json)와 [메인 실제 정리 확인](../../deploy/verification/candidate-6d165d1/root-recovery-review/summary.json)을 참조한다. 배포 담당의 실행 핸들은 모두 종료됐다.
- `stable-v1.5.0` 및 `stable-runtime-v1.5.0-6d165d1`은 정확한 runtime을 가리키며 두 태그와 근거 커밋을 push했다. [checkpoint-1.5.0.json](../../artifacts/releases/checkpoint-1.5.0.json): source `19e0c3a21e49e081be3cc1625fea403890932723`, SHA `6b3940ed7190530c046594186febff54d2e0ee93b0a0856e314c5c3ca3762ff7`. [REVIEW028](../product/REVIEW-028.md)의1177해시·실제Ready·백업 독립 검증 PASS. 이 파일을 덮어쓰지 않는다. **현재 후속 작업은 아래1.6 후보의 로컬 구현·검증이며, 최종 미디어·시간·인도는 원래 일정에 남아 있다.** 실제 Git에서 후속 문서·manifest 커밋의 push 여부를 확인한다.
- 이전 [checkpoint-1.4.0.json](../../artifacts/releases/checkpoint-1.4.0.json)은 불변 유지: source `bcc010c677196c1010b5e5a6c9b9bb1a8362bcdb`, SHA `df7865319ac1e97ecbf6b70f206f29b7b7747312d2e8a355f5dea2d765c377be`, 백업594944000바이트/be09. REVIEW022의962해시는 역사적 source에 `--at-commit`으로 확인한다.

## 고정 일정

[run.json](run.json)의 원래 시각이 기준이며 시간 연장은 없다.

- 시작: 2026-09-21 17:07:33 KST (`08:07:33.079009Z`).
- 기능 동결·복원 판단·최종 미디어 시작: 2026-09-22 06:37:33 KST (`21:37:33.079009Z`).
- 종료: 2026-09-22 07:07:33 KST (`22:07:33.079009Z`).

## 재접속 직후 순서

1. 현재 시각·최신 사용자 지시·run.json·[resume.json](resume.json)을 읽는다. 원래 runId·마감·첫 미완료 단계를 유지한다.
2. `node scripts/resume-status.mjs`로 실제 Git·클러스터·Ready 이미지·인증 API 버전을 읽기 대조한다. 실패나 응답 유실은 성공이 아니다.
3. `artifacts/operations/status.json`과 실제 PID·시작 identity를 대조한다. 정상 supervisor/관찰기를 중복 기동하지 않는다. 역할 소유 핸들이 메인에서 Unknown이면 해당 담당 또는 실제 PID·시작시각을 확인한다.
4. 중단된 변경은 원격 실제 상태와 operation 기록을 먼저 대조한다. 같은 commandId·이미지·백업 remotePath·복원 rig·시연 private journal 확인 전 새 ID·새 등록·새 복원을 만들지 않는다.
5. 첫 미완료 단계만 진행한다. [NETWORK-RECOVERY.md](NETWORK-RECOVERY.md)에 백오프와 백업·시연 복구 절차가 있다.

native heartbeat `grid`가10분마다 재개 절차를 호출한다. Mac과 Codex가 실행 중이어야 하며 오프라인 AI 작업을 보장하지 않는다. 변화 없는 상태의 알림과 재시험을 반복하지 않는다.

## 현재 프로세스와 관찰 기준

실시간 소유권은 resume의 currentObservationProcesses가 기준이다. 종료 신호 전 항상 실제 시작 identity를 확인한다.

- supervisor: handle24851 / PID2061 / `Mon Sep 21 23:52:13 2026`, 자체 소유3104/18884.
- primary: handle71300 / PID2883 / `Mon Sep 21 23:56:57 2026`, `artifacts/soak/v1.5.0/latest.json`.
- SCADA audit: handle98957 / PID2888 / `Mon Sep 21 23:56:58 2026`, `artifacts/soak/telemetry-audit/2026-09-21T14-56-58-686Z-820d9a15/latest.json`.
- 임시 전원 보호: handle11821 / PID80946 / `Mon Sep 21 22:33:11 2026`, `caffeinate -i -s -t 30861`. 원래 마감까지 AC 전원 idle/system sleep을 억제한다. 지속 설정 변경은 없으며 수동·강제 절전/종료를 방지한다고 보장하지 않는다.

[새1.5 관찰 시작](../../artifacts/checkpoints/observer-1.5-activation/activation.json)은 실제 Ready/API1.5와 신규 primary/audit 오류 기준0을 보존한다. 첫1시간 보존 도구의 최소 시각은 **15:56:58.686Z**이지만, 버전마다1시간은 사용자/PRD 필수조건이 아니다.1.6 후보 게이트가 먼저 완료되어 계획 전환할 때는 실제로 관찰한1.5 전체구간을 별도 보존하며1시간으로 주장하지 않는다. 정상 관찰기를 불필요하게 재시작하거나 누적 카운터를 초기화하지 않는다.

이전1.4 primary36193/audit92936/supervisor81174는 계획 교체로 모두 종료0을 확인했다. [첫1시간](../../artifacts/checkpoints/soak-1.4.0-first-hour/summary.json), [전체 종료 구간](../../artifacts/checkpoints/soak-1.4.0/summary.json), [14:01 사건](../../artifacts/checkpoints/reconnect-20260921T1401/summary.json)을 보존했다. 과거1.4 APIerrors1/audit connectionErrors1을 새1.5 카운터에 적용하지 않으며 구간들을 합쳐 무중단·보편적 무손실로 주장하지 않는다.

로컬1.5 fixture3109/handle84859는 모든 시험·리허설 뒤 정상 종료0/포트 닫힘을 확인했다. private DB를 보존하며 시험 필요 없이 재기동하지 않는다. 이전3106/3107도 종료 상태다.

## 진행 중인1.6 후보

IDEA010/ISSUE023: 실제1.5에서55개의created UTC가 모두 화면대시로 표시됨을 읽기만 하여 재현했다. [REVIEW029](../product/REVIEW-029.md)와 [수정 전 근거](../../artifacts/checkpoints/event-time-before/result.json)를 참조한다. PRD1.13은 기존created의 엄격한 canonical UTC 검사, 명시적Asia/Seoul·KST와 접근 가능한 원본UTC, 잘못된값/누락의 대시 표시만 요구한다. 서버·DB·API·순서·최근80개·메시지·제어는 바꾸지 않는다.

web/helper 구현·build·전체281검사·실제broker 통합/고급·인증/SSE/좁은화면·form44/receipt14·이벤트 브라우저 및 소스보안 검토를 통과했다. [로컬 집계](../../artifacts/checkpoints/candidate-1.6-local-summary.json)와 [REVIEW030](../product/REVIEW-030.md)을 참조한다. 신규AT01~03은 로컬검증, UI04/AT04는 원격 대기로 partial이다. form의 실제 반환 baseline 복구를 검증했으며, 후속HTTP201/pageguard의 실행 증명은 다음 복원시험에서 확보한다. 로컬3110/handle95785 fixture의 시험·복구를 마친 뒤 소유PID 시작identity를 대조해 정상 종료0/포트 닫힘을 확인했다. [종료 기록](../../artifacts/checkpoints/local-fixture-1.6-retirement/summary.json)에9개 시험RTU 설정과 privateDB 보존을 기록했다. 시험 필요 없이 재기동하지 않는다. 실제4개 이벤트와 날짜경계/잘못된값의 브라우저 대조는 보존돼 있다. 정확 커밋 `331ab9a00ee71a0924042e7952013d47495449d3`과 후보이미지4af99e7을 전달했다. [배포 전 검토](../../deploy/verification/candidate-331ab9a/pre-deployment-review.json): 이미지77개 시험·실제MQTT 통합/고급·HTTP 파일 일치·보안 검토를 완료했다. 초기HTTP fixture의 토큰 누락 실패와 별도 성공을 모두 보존했다. 다음은 새 전환 전 백업, 실제1.5 관찰구간 보존, 계획 배포, 동일 백업 복원 게이트다. 아직1.6 원격배포는 없다. 실제main1.5 관찰기와3104/18884 supervisor를 그대로 유지한다.1.6 로컬·보안·정확이미지·원격·동일스냅샷복원을 완료하기 전 기존 복구 기준을 교체하지 않는다.

## 백업 중 실제 운영 사건 — 최우선

1.6 이미지 준비 후 새 전환 전 백업이90초 제한에서 미완료됐다. 최종파일 없이439500800B partial만 남았으며 앱 liveness 실패로 Kubernetes가 같은Pod 안의 app 컨테이너를 재시작했다. root/담당이 재시작한 것은 아니다.15:36:55 내부health 및15:37:26 감독기 재연결로 현재1.5 Ready가 회복됐다. [사건·복구 기록](../../artifacts/checkpoints/backup-incident-20260921T1534/recovery-summary.json)과 [원격 근거](../../deploy/verification/candidate-331ab9a/pre-upgrade-backup-summary.json)를 참조한다. 백업과stall의 내부 인과관계는 아직 미확정이다. 초기API/연결 오류0은 현재기준이 아니며 재개 원장과 원문 누적치를 읽는다. 감독기2061/관찰기2883·2888은 계속 실행 중이다. 준비한1.5 종료 의도만으로 신호를 보내지 않는다.

ISSUE024 백업 개선의 로컬 검증·독립 검토 전에 새 원격 스냅샷이나1.6 배포를 시작하지 않는다. 부분파일을 완료백업으로 승격하거나 기존ad34 검증백업을 삭제하지 않는다. 최종마감은 그대로다.

## 남은 작업

1. 새1.5 불변 매니페스트 검증을 완료했으며 현 버전 관찰을 원래 동결까지 계속한다. 신선도·오류 증가분·Ready·저장 공간·전원 상태를 점검한다.
2. 추가 아이디어는 효용·안정성·남은 시간과 기존 정상 복구 지점을 검토하고, 채택 시 PRD·제품 버전을 먼저 기록한다. 이미 구현한 IDEA008/009를 다시 채택하거나 중복 배포하지 않는다.
3. 최종 동결 시 정상 버전을 선택한다. **선택 백업 → 그 정확한 스냅샷 복원 증명 → 근거 커밋 → 새 최종 매니페스트 생성·검증** 순서를 따른다. 새 백업 파일 존재만으로 과거 복원 근거를 재사용하지 않는다.
4. 원래 마지막30분 안에서 **신규 실제 UI 영상 → 설정 복원·영상 검수 → 같은 영상의 facts → 편집 가능한 PPT → 모든 슬라이드 검수 → 인도 검사**를 수행한다.249.33초 준비 리허설은 최종 결과가 아니다. 기술적 오디오 검사는 청취·발음 검수와 구분한다.
5. 최종 정상 상태·원격 전달·산출물 해시/링크를 확인하고 이 실행의 heartbeat와 소유 터널을 종료한다. 원격 앱과 PVC는 보존한다. 미디어·시간·인도 게이트 전 전체 완료를 선언하지 않는다.

정확한 명령과 컷오프는 [FINAL-RESTORE-PLAN.md](FINAL-RESTORE-PLAN.md), 영상은 [MEDIA-PLAN.md](MEDIA-PLAN.md), 발표 문구는 [MEDIA-1.5-COMPATIBILITY.md](MEDIA-1.5-COMPATIBILITY.md), 인도는 [DELIVERY-PLAN.md](DELIVERY-PLAN.md)를 따른다. 실제 KMA/AWS/운영 VPP 연동 성공은 미검증이다.

최종 백업 전 원본·압축본·로컬 전송본·복원 PVC·추가 성장량의 공간을 새로 확인한다. 공유 hostFS 여유를 PVC 예약량으로 표현하지 않는다. 검증된 백업을 자동 삭제하지 않는다.

## 보존 이력

과거 상태는 현재 프로세스 지시로 사용하지 않는다. 이전1.0~1.4 관찰, 자연 재연결 사건, 계획 supervisor 교체, host 보호, 과거 정상 체크포인트는 Git과 artifacts/checkpoints에 그대로 있다. 미디어 준비는 `artifacts/checkpoints/media-candidate15-receipts/`에 보존했다. 중단된 녹화는 담당 핸들 종료를 확인하고 private journal에 따라 recover-demo.cjs로 복구한다. 등록/시나리오 응답이 불확실하면 메인이 실제 상태를 대조하며 기존 RTU를 일괄 초기화하지 않는다.
