# 자율 실행 인계

실제 배포와 독립 기능 인수 기준은 **제품1.6.0 / PRD1.13 / IDEA010**이다. 원격 UI·API·MQTT·실제 Pod 교체 outbox 및 동일9bd 백업의 현재1.6/이전1.5 복원21근거와 메인 실제 정리를 확인했다. REVIEW032에서 기능 인수를 완료했고, 새 불변manifest1466해시·실제Ready·백업의 메인 및 REVIEW033 독립 검증을 완료했고, 두 태그의 생성·원격push까지 확인했다. 과거1.5/ad34 체크포인트는 보존한다. 전체 목표는 미완료다. 같은 runId와 원래 마감으로 첫 미완료 단계부터 이어간다.

## 현재 배포와 보존된 복구 기준

- runtime `331ab9a00ee71a0924042e7952013d47495449d3`, app digest `sha256:4af99e7b6daff553baf60d91b6ba126bba27d686f7a6d2596f8c0d4eb7941f70`.
- k3s `charles-k3s` / namespace `gs-plai-5h` / deployment `grid`. 16:13:59Z 실제 Ready Pod `grid-5c4f47d7fd-pskhb`, UID `581d826a-8a9f-4adb-8c3c-8229a2ba151a`, app/broker restarts0/0. 재개 때 실제 상태를 다시 읽는다.
- [계획 배포](../../deploy/verification/candidate-331ab9a/rollout/proof.json): generation17→18, 전체 spec 중 app image 한 필드만 변경. [배포 후 읽기 검증](../../deploy/verification/candidate-331ab9a/post-rollout/summary.json): 원래5 RTU의 runID·설정·발전기·데이터·시나리오 유지, 인증 및 실제 JS `2bcc3c1b…` 일치.
- 기존 정상 복구: `stable-v1.5.0` / `stable-runtime-v1.5.0-6d165d1`, runtime `6d165d1e8f3214a50ee66d2b13947f64d86658f5`, image `2fd3f21c…`. [REVIEW027](../product/REVIEW-027.md)의 동일 ad34 백업 current1.5/backward1.4 복원19근거를 보존한다.
- [checkpoint-1.5.0.json](../../artifacts/releases/checkpoint-1.5.0.json): source `19e0c3a21e49e081be3cc1625fea403890932723`, SHA `6b3940ed7190530c046594186febff54d2e0ee93b0a0856e314c5c3ca3762ff7`. [REVIEW028](../product/REVIEW-028.md)의1177해시 독립 검증. 현재 파일이 바뀌면 역사 source를 `--at-commit`으로 검사한다. 불변 manifest를 덮어쓰지 않는다.
- 선택된1.5 백업 [stable-backup-6d165d1.json](../../deploy/verification/stable-backup-6d165d1.json):719527936B, SHA `ad34a074276243fb1b83d7fe081aa7631c9d2d51d0697e9d0dca5d7e5f349b24`, private0600 전체 해시 검증. 해당 복원 rig2개 replicas0/Pods0·터널 닫힘·4PVC 보존 완료.
- 별도 전환 전 [round2 백업](../../deploy/verification/pre-1.6.0-backup-round2.json):828805120B, SHA `b6e2e3dd458bca22ae4dc2522ce77daf47603214813cf9dbd9136c7f3d0e49be`, 생성·전송·무결성·전체 해시 완료. **이 파일의 복원 증명은 아직 없다.** 과거ad34 복원 증명을 재사용하지 않는다.

현재 선택 백업은 [stable-backup-331ab9a.json](../../deploy/verification/stable-backup-331ab9a.json)의851673088B/`9bd8becb4211ee0edd9217db99e05b63d8fa3f5437a8e4cc7be2ace449cb3137`다. [복원 요약](../../deploy/verification/candidate-331ab9a/restore-summary.json)은19개 실제PASS보고서+2Pod identity를 구분한다. [메인 실제 확인](../../deploy/verification/candidate-331ab9a/root-recovery-review/summary.json): 양쪽0replicas/0Pods,4BoundPVC보존,3105/18885닫힘, 운영5RTU설정동일·HEALTHY·pending0. 완료한 복원과 제어를 재실행하지 않는다.

새 [checkpoint-1.6.0.json](../../artifacts/releases/checkpoint-1.6.0.json)은 source `b729f4287cf6a5a5527fa37f105e61bd41e135b7`, SHA `fd3fedc9dffb6bdc8d6e69982554dabde24bf3054113f02dc8370385bc238ae5`,1466해시/실제Ready/백업 검증을 완료했다. [REVIEW033](../product/REVIEW-033.md)을 참조하고 이후 소스 변경 시 `--at-commit`으로 역사 출처를 확인한다.

새 `stable-runtime-v1.6.0-331ab9a`는 정확한 앱 build331을, `stable-v1.6.0`은 백업 개선을 포함한 전체 운영·근거 체크포인트를 가리킨다. `stable-v1.6.0`의 fullcheckpoint는 `180fa6871d56fa723a5388ee3ea0b128ef623b4b`, runtimealias는331ab9a이며 두 원격 태그를 확인했다. [태그 검증](../../artifacts/checkpoints/release-1.6/tags.json). 기존 태그는 옮기지 않았다.

## 원래 고정 일정

[run.json](run.json)이 권위 원장이다. 시간 연장은 없다.

- 시작:2026-09-21 17:07:33 KST (`08:07:33.079009Z`).
- 기능 동결·복원 판단·최종 미디어 시작:2026-09-22 06:37:33 KST (`21:37:33.079009Z`).
- 종료:2026-09-22 07:07:33 KST (`22:07:33.079009Z`).

## 재접속 직후 순서

1. 현재 시각·최신 사용자 지시·run.json·[resume.json](resume.json)을 읽는다. 원래 runId·마감을 유지한다.
2. `node scripts/resume-status.mjs`로 실제 Git·클러스터·Ready 이미지·인증 API 버전을 읽기 대조한다. 실패나 응답 유실은 성공이 아니다.
3. `artifacts/operations/status.json`과 실제 PID·시작 identity를 대조한다. 정상 supervisor·관찰기를 중복 기동하지 않는다. 역할 핸들이 메인에서 Unknown이면 담당 또는 실제 PID·시작시각을 확인한다.
4. 불확실한 변경은 실제 commandId·이미지·백업 remotePath·복원 rig·시연 private journal을 먼저 대조한다. 응답 유실만으로 새 ID·등록·apply·복원을 반복하지 않는다.
5. 첫 미완료 단계만 진행한다. [NETWORK-RECOVERY.md](NETWORK-RECOVERY.md)의 재시도·백업·시연 복구 절차를 따른다.

native heartbeat `grid`는10분마다 재개 절차를 호출한다. Mac과 Codex가 실행 중이어야 하며 오프라인 AI 작업을 보장하지 않는다. 변화 없는 상태의 알림과 재시험을 반복하지 않는다.

## 현재 프로세스 소유권

- 단일1.6 supervisor: root handle72380 / PID19942 / `Tue Sep 22 00:58:48 2026`, 소유3104/18884. [활성화 증거](../../deploy/verification/candidate-331ab9a/connection-activation/proof.json). 새 primary8363·audit4110은 계획 outbox 재시작과 원래설정 복구 뒤16:03:59Z 시작했다. 실제PID·시작identity와 경로는 resume.currentObservationProcesses 및 [활성화 기록](../../artifacts/checkpoints/observer-1.6-activation/activation.json)을 읽는다.
- 임시 전원 보호: handle11821 / PID80946 / `Mon Sep 21 22:33:11 2026`, `caffeinate -i -s -t 30861`. 원래 마감까지 AC 전원에서 idle/system sleep을 억제한다. 지속 설정은 변경하지 않았다. 수동 절전·종료를 방지한다고 보장하지 않는다.
- 이전1.5 supervisor24851/PID2061, primary71300/PID2883, audit98957/PID2888은 모두 정상종료0. [전체 구간 보존](../../artifacts/checkpoints/soak-1.5.0/summary.json):3452/3451초,533개 수신, 알려진 사건의 누적 오류 보존. **1시간 또는 무중단 관찰이 아니다.** 준비된1.5 첫1시간 도구를 닫힌 구간에 실행하지 않는다.
- 로컬1.6 fixture3110/95785 및 이전3109/3107/3106은 종료·포트 닫힘 확인, private DB 보존. 시험 필요 없이 재기동하지 않는다.

## 현재1.6 검증

IDEA010/ISSUE023은 저장된 이벤트created UTC가 화면에서 대시로 보이던 결함이다. 엄격한 canonical UTC 검사, 명시적Asia/Seoul·KST, 접근 가능한 원본UTC, 잘못된값/누락의 대시 표시를 구현했다. 서버·DB·API·순서·최근80개·메시지·제어는 동일하다.

[로컬 집계](../../artifacts/checkpoints/candidate-1.6-local-summary.json)·[REVIEW030](../product/REVIEW-030.md)의 로컬281검사·실제broker 통합/고급·form44/receipt14·인증/브라우저·독립보안을 완료했다. 이후 운영백업 전체290검사는 별도이며 두 수치를 합치지 않는다. 정확331 이미지4af의77 app검사·MQTT·실제HTTP 파일·SBOM/보안도 완료했다. 이미지에 미해결OS 취약점4matches/2CVEs가 남아 있으며0개라고 주장하지 않는다.

실제main [이벤트 시각](../../deploy/verification/candidate-331ab9a/main-event-time/result.json)은59행 KST/UTC·접근성·순서·메시지·번들 일치, API쓰기0·합성시험 미실행을 증명했다. 원격 회귀 시험 핸들은 resume에 기록한다. 실제MQTT125/error0과 Pod 교체 outbox 증명은 완료했다. [종료 후 정상 확인](../../deploy/verification/candidate-331ab9a/outbox-post-normal.json): root46862 exit0, 원래5설정 동일, 감독기16:03:24Z 재접속, 새UID581d826a. 새1.6 선택백업과 정확히 같은 스냅샷 current1.6/backward1.5 독립PVC 복원을 완료했다. form44/receipt14 양쪽 및1.6 실제 이벤트79개, 독립 제품 인수까지 완료했다. 이전1.5의 이벤트 시각 표시 한계는 그대로 구분한다.

## 실제 백업 사건과 개선

이전 백업은90초에서 미완료되어 최종파일 없이439500800B partial을 남겼다. 같은 기간 app liveness 실패로 Kubernetes가 컨테이너를 재시작했다. root/담당이 재시작한 것이 아니며 내부 인과관계는 미확정이다.15:36:55 내부health,15:37:26 감독기 재연결로1.5가 회복됐다. [사건](../../artifacts/checkpoints/backup-incident-20260921T1534/recovery-summary.json)에 오류·실제복구·부분파일을 보존했다.

operational commit `3c418081bf4b9f07d5bd4ff2de9e4c41873f7a19`의 새 helper는 WAL 읽기 스냅샷·자식worker시간 제한·소유worker 취소·확인된 성공 후 최종파일 발행을 적용한다. [검증](../../artifacts/checkpoints/backup-hardening-1.6/summary.json): 전체290검사, 실제Node24.21 선택15검사 및 독립보안. [실제 round2](../../deploy/verification/candidate-331ab9a/pre-upgrade-round2/summary.json): snapshot9938ms/worker종료 확인,12개 health표본 실패0·추가재시작0. 이한번의 관측으로 원인 확정이나 무영향을 보장하지 않는다. pending-outbox 보조백업도 operational3659d6e에서 같은 helper로 통일했고 실제5148ms 완료·worker종료·동일 메시지 재전송/PUBACK를 확인했다. 백업 partial·기존 정상백업을 삭제하지 않는다.

## 이후와 최종 인도

1. 1.6 기능·복원·불변manifest·태그 검증을 완료했고 기존 관찰기를 유지한다. 제품 담당의 [REVIEW034](../product/REVIEW-034.md)·IDEA011 제안이 준비됐다. 기존 명령 목록의 후속GET503이 표에서 숨겨지는 브라우저 fixture(API쓰기0)를 근거로 개별 목록 갱신 상태를 제안했다. 실제 원격장애 시험은 아니다. 메인이 검토 후 채택하면 먼저PRD/제품버전을 기록하며 아직 새 버전은 채택하지 않았다. 추가 아이디어는 효용·안정성·남은 시간과 검증된 복구 기준을 검토하고 채택 시 PRD·제품 버전을 기록한다.
2. 원래 동결 시 정상 버전을 선택한다. **선택 백업 → 그 정확한 스냅샷 복원 증명 → 근거 커밋 → 새 최종 매니페스트 생성·검증** 순서다. 새 파일 존재만으로 과거 복원 근거를 재사용하지 않는다.
3. 원래 마지막30분 안에서 **신규 실제 UI 영상 → 설정 복원·영상 검수 → 같은 영상의 facts → 편집 가능한 PPT → 모든 슬라이드 검수 → 인도 검사**를 수행한다. 준비 리허설은 최종 결과가 아니다. 기술적 오디오 검사를 청취·발음 검수와 구분한다.
4. 최종 정상 상태·원격 전달·산출물 해시/링크를 확인하고 이 실행의 heartbeat와 소유 터널을 종료한다. 원격 앱/PVC를 보존한다. 미디어·시간·인도 게이트 전 전체 완료를 선언하지 않는다.

명령·컷오프는 [FINAL-RESTORE-PLAN.md](FINAL-RESTORE-PLAN.md), 영상은 [MEDIA-PLAN.md](MEDIA-PLAN.md), 인도는 [DELIVERY-PLAN.md](DELIVERY-PLAN.md)를 따른다. 최종facts는 검수전1.6 템플릿이며 [미디어 범위](MEDIA-1.6-COMPATIBILITY.md)에 별도59/79이벤트 증거와 영상8장면을 구분한다. 실제KMA/AWS/운영VPP 연동 성공은 미검증이다. untracked `artifacts/releases/current.json`은 과거 리허설용이므로 최종 선택에 쓰지 않는다.

최종 백업 전 원본·압축본·전송본·복원PVC·성장량의 실제 공간을 확인한다. 공유hostFS 여유를 PVC 예약량으로 표현하지 않는다. 검증된 백업을 자동 삭제하지 않는다. 녹화가 중단되면 담당 핸들 종료를 확인한 뒤 private journal에 따라 recover-demo.cjs로 복구한다. 등록/시나리오 응답이 불확실하면 실제 상태를 대조하고 기존RTU를 일괄 초기화하지 않는다.
