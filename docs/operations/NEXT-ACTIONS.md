# 자율 실행 인계

이 문서는 현재 실행의 재개 지점이다. 전체 목표는 아직 완료되지 않았다. 원래 실행과 검증 기록을 이어가며, 새 실행이나 중복 배포를 만들지 않는다.

## 현재 선택한 정상 버전

- 제품 **1.4.0**, PRD **1.11**, 앱 runtime `fdd0491a5c08901962f46ac845f8582921150d45`.
- k3s `charles-k3s` / namespace `gs-plai-5h` / deployment `grid`. 앱 이미지 digest `sha256:c19d550f0cfabbeb1e5f637f3c38a1daee1c2c44222b68dd088ae1875cd4b4f4`.
- 불변 [checkpoint-1.4.0.json](../../artifacts/releases/checkpoint-1.4.0.json): manifest source `bcc010c677196c1010b5e5a6c9b9bb1a8362bcdb`, SHA256 `df7865319ac1e97ecbf6b70f206f29b7b7747312d2e8a355f5dea2d765c377be`. 앱 runtime과 운영 문서 source commit은 구분한다.
- [REVIEW-022](../product/REVIEW-022.md)에서 962개 파일 해시·실제 Ready app/broker·백업 SHA를 독립 확인했다. 과거 시점 증거의 무결성은 `--at-commit`으로 검증한다. 이 매니페스트를 덮어쓰지 않는다.
- `stable-v1.4.0` 및 `stable-runtime-v1.4.0-fdd0491`은 앱 runtime을 가리키며 원격 push를 완료했다. 14:02:13Z 읽기 검사에서 main 로컬/원격 `36b7824`가 일치했다. 이후 재개에서는 Git 상태를 새로 확인한다.
- 선택 백업: [stable-backup-fdd0491.json](../../deploy/verification/stable-backup-fdd0491.json), 594944000바이트, SHA256 `be09a5f5e1721970ec7f25197fcf4f3db504f6f6ad4765080ba301a0c7fd760a`. [정확한 1.4 및 하위 1.3 복원](../../deploy/verification/candidate-fdd0491/restore-summary.json) 17개 근거와 main 7개 근거를 REVIEW-021에서 확인했다.
- 배포·명령·outbox 재시작·현재/하위 버전 복원·매니페스트 검증은 완료했다. 재접속 자체를 이유로 반복하지 않는다. 이전 1.0~1.3 체크포인트와 백업도 보존한다.

## 진행 중인 1.5 후보

PRD1.12/IDEA009의 명령 접수 확인 UI는 로컬 전체263검사·build·실제broker 통합/고급·신규receipt14기록·기존form44검사·브라우저4종 PASS다. [로컬 집계](../../artifacts/checkpoints/candidate-1.5-local-summary.json)와 [독립 인수](../product/REVIEW-025.md)를 확인한다. 정확이미지77개 앱 검사·실제broker 통합/고급·제공asset 및 보안 검토도 통과했고, 레지스트리digest를 대조했다. 원격 배포·동일 백업·현재/하위 복원 전에는 stable1.4를 유지한다. 로컬fixture3109/handle84859는 기존 증거 확인 후 재사용하며 무조건 새로 기동하지 않는다. 이전3106/3107 fixture는 원래handle종료0을 확인했고 private DB를 보존했다.

## 고정 일정

[run.json](run.json)의 원래 시각이 기준이다. 시간 연장은 없다.

- 시작: 2026-09-21 17:07:33 KST (`08:07:33.079009Z`).
- 기능 동결·복원 판단·최종 미디어 시작: 2026-09-22 06:37:33 KST (`21:37:33.079009Z`).
- 종료: 2026-09-22 07:07:33 KST (`22:07:33.079009Z`).

## 재접속 직후 순서

1. 현재 시각, 최신 사용자 지시, run.json, [resume.json](resume.json)을 읽는다. 원래 runId·마감·첫 미완료 단계를 유지한다.
2. `node scripts/resume-status.mjs`로 실제 Git·클러스터·Ready 이미지·인증 API 버전을 읽기 대조한다. 네트워크 실패나 응답 유실을 성공으로 표시하지 않는다.
3. `artifacts/operations/status.json`과 실제 PID의 시작 identity를 대조한다. 기존 정상 supervisor/관측기를 중복 시작하지 않는다. 이전 핸들에 현재 프로세스 소유권이 있다고 추정하지 않는다.
4. 중단된 변경 작업은 resume의 operation 기록과 원격 실제 상태를 먼저 확인한다. 같은 명령의 commandId, 배포 이미지, 백업 remotePath, 시연 private journal을 대조하기 전에 새 ID·새 복원 rig·새 등록을 만들지 않는다.
5. 기존 작업을 확인한 뒤 첫 미완료 단계만 진행한다. [NETWORK-RECOVERY.md](NETWORK-RECOVERY.md)에 제한·백오프·백업 및 시연 복구 절차가 있다.

native heartbeat `grid`가 10분마다 이 재개 절차를 호출한다. Mac과 Codex가 실행 중이어야 하며 오프라인 AI 실행을 보장하지 않는다. 상태가 같으면 알림과 재시험을 반복하지 않는다.

## 현재 프로세스와 관찰 기준

실시간 소유권은 `resume.currentObservationProcesses`가 기준이며 조치 전 실제 identity를 확인한다.

- supervisor: handle **81174**, PID **84952**, `Mon Sep 21 22:46:07 2026`. 자체 소유 main 포트포워딩은 **3104/18884**다.
- primary: handle **36193**, PID **85649**, `Mon Sep 21 22:49:41 2026`, `artifacts/soak/v1.4.0/latest.json`.
- 추가 SCADA audit: handle **92936**, PID **85652**, `Mon Sep 21 22:49:42 2026`, `artifacts/soak/telemetry-audit/2026-09-21T13-49-42-893Z-9fe9c0ec/latest.json`.
- 임시 전원 보호: handle **11821**, PID **80946**, `Mon Sep 21 22:33:11 2026`, `caffeinate -i -s -t 30861`. 원래 마감까지 AC 전원에서 idle/system sleep을 억제하며 지속 설정은 바꾸지 않았다. 수동·강제 절전/종료는 방지 보장하지 않는다.

현재 1.4 세션은 13:49:41/42Z부터다. 첫 1시간 관측 보존은 **14:49:42Z 이후**에 한다. 새 세션과 이전 세션을 합쳐 무중단으로 표현하지 않는다. 정상 관측기를 재시작하거나 누적 카운터를 초기화하지 않는다.

[14:01 사건](../../artifacts/checkpoints/reconnect-20260921T1401/summary.json): health 검사 timeout 5002ms, 단절 기록 14:01:54.445Z → 검증 복귀 14:01:55.750Z. 같은 Pod UID·Ready 2개·재시작 0회다. 사건 이후 비교 기준은 primary APIerrors **1**, connectionErrors **0**, audit connectionErrors **1**, RTU별 sampleDiscontinuities **0**이다. 보존 구간에서 5개 RTU의 수신 샘플 증가와 simulation advance가 일치했고 invalid/sequence jump도 0이었다. 원인은 미확정이며 보편적인 무손실 보장이 아니다. 이후 새 사건은 이 기준과 비교해 기록한다.

## 채택된 다음 후보

IDEA009 / PRD1.12 / 제품1.5.0 후보 runtime은 `6d165d1e8f3214a50ee66d2b13947f64d86658f5`다. 로컬 및 정확이미지·독립보안검토·레지스트리업로드가 완료됐다. 이미지 `sha256:2fd3f21cd4f49702079a7a0ba7c2d40420a38db1bfd7b9e2744ad8e4cb8d5a0f`와 `deploy/verification/candidate-6d165d1/pre-deployment-review.json`을 확인해 중복빌드/업로드를 피한다. 담당들의 빌드/전용15050forward는 모두 종료됐다. 다음은14:49:42Z 이후1.4 첫시간관찰 보존→업그레이드전 백업→main후보검증→동일백업 현재1.5/하위1.4복원이다. 격리 복원3105용 receipt검사 모드와3개경계시험도 준비됐다. 원격1.4 배포·백업·체크포인트 및 관측은 유지한다. 완료한1.4 배포를 반복하지 않는다.

## 남은 작업 순서

1. 현재 관측을 계속하며 신선도·오류 증가분·Ready·저장 공간·전원 상태를 확인한다. 14:49:42Z 이후 첫 1시간의 원문과 소스를 불변 보존한다.
2. 유용한 추가 아이디어가 있으면 효용·안정성·남은 시간을 평가하고 채택 시 PRD와 제품 버전을 먼저 기록한다. IDEA-008은 이미 1.4로 구현·검증했으므로 다시 채택하거나 재배포하지 않는다. 현재 1.4 복원 기준을 보존한다.
3. 최종 동결에서 정상 버전을 선택한다. **선택 백업 → 그 정확한 스냅샷 복원 증명 → 근거 커밋 → 새 최종 매니페스트 생성·검증** 순서다. 새 백업 파일 존재만으로 기존 복원 증거를 재사용하지 않는다.
4. 원래 마지막 30분 안에서 **신규 실제 UI 영상 → 설정 복원·영상 검수 → 같은 영상의 facts 바인딩 → 편집 가능한 PPT → 모든 슬라이드 검수 → 인도 검사**를 진행한다. 리허설을 최종 결과로 재사용하지 않는다.
5. 최종 정상 상태·원격 전달·산출물 해시와 링크를 확인하고 이 실행의 heartbeat 및 소유 터널을 종료한다. 원격 앱과 PVC는 보존한다. 최종 미디어·시간·인도 조건을 충족하기 전 전체 목표 완료를 선언하지 않는다.

정확한 명령, 단계별 컷오프 및 새 백업 검증이 늦어질 때의 검증된 stable 선택은 [FINAL-RESTORE-PLAN.md](FINAL-RESTORE-PLAN.md)를 따른다. 미디어는 [MEDIA-PLAN.md](MEDIA-PLAN.md), 인도는 [DELIVERY-PLAN.md](DELIVERY-PLAN.md)를 따른다. 1.4 문구의 별도 시험과 실제 촬영 구분은 [미디어 준비 검토](MEDIA-1.4-FINAL-CONTENT-RECOMMENDATIONS.md)를 따른다. 실제 KMA/AWS/운영 VPP 자격정보가 없으므로 해당 연결 성공을 주장하지 않는다.

최근 /data 전체 파일 5031428043바이트와 단일 백업 594944000바이트는 다른 값이다. 공유 hostFS available 78692749312바이트는 PVC 예약량이 아니다. 최종 백업 전에 원본·압축본·로컬 전송본·복원 PVC 및 성장량의 공간을 다시 확인한다. 검증된 백업을 자동 삭제하지 않는다.

## 보존한 과거 이력

과거 상태는 현재 프로세스 지시로 사용하지 않는다. 상세 사건·검증 원문은 아래와 Git 이력에 보존한다.

- 이전 관측: `artifacts/checkpoints/soak-1.0.0`, `soak-1.1.0`, `soak-1.2.0`, `soak-1.3.0`; 1.2/1.3 첫 1시간은 별도 `*-first-hour`.
- 자연 연결 사건: `reconnect-20260921T1116`, `backup-recovery`의 11:34 기록, `reconnect-20260921T1159`, `reconnect-20260921T1303`, `reconnect-20260921T1308`, `reconnect-20260921T1325`.
- 계획 supervisor 교체: `artifacts/checkpoints/supervisor-diagnostics-activation/handoff.json`. 1.3 핸들 7353/40339/30644는 1.4 업그레이드를 위해 모두 정상 종료했다.
- host 관측 및 임시 보호: `artifacts/checkpoints/host-pause-20260921T1325/SUMMARY.md`, `host-power-guard-20260921T1333/activation.json`. 원인 단정이나 무중단 보장으로 확대하지 않는다.
- 미디어 준비: `artifacts/checkpoints/final-media-lifecycle/summary.json`. 중단된 녹화는 핸들 종료를 확인하고 private journal에 따라 `recover-demo.cjs`를 사용한다. 실제 등록/시나리오 응답이 불확실하면 메인이 상태를 대조하며 기존 RTU를 일괄 초기화하지 않는다.
