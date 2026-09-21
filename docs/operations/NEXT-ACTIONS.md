# 자율 실행 인계

현재 실제 배포는 **제품 1.7.0 / PRD 1.14 / IDEA011 v1**이다. 소스 `d98d3c48d22c54e7fd092ee9e46ca9ab49e4bbf9`, 이미지 `sha256:d1e4b1d8c39e924effb3f6ad183b33b220aa980a2d08f5d82cbf92470664c692`를 사용한다. 전체 목표는 미완료이며, 복구 인수와 불변 체크포인트가 완료되기 전 정상 복구 기준은 검증된 1.6/9bd를 유지한다. 재개 시 현재 시각·최신 사용자 지시·[run.json](run.json)·[resume.json](resume.json)부터 읽는다.

## 지금 이어갈 단계

1. 1.7 main UI·API·원래 5 RTU 전체 설정/실행/데이터/시나리오·실제 MQTT 125kW/error0·인증/SSE/preview/export 회귀를 완료했다. [배포 증거](../../deploy/verification/candidate-d98d3c4/rollout/proof.json), [배포 후 확인](../../deploy/verification/candidate-d98d3c4/post-rollout/summary.json), [실제 MQTT](../../deploy/verification/candidate-d98d3c4/main-mqtt.json), [회귀](../../deploy/verification/candidate-d98d3c4/main-regression/summary.json)를 재사용하며 완료한 제어를 반복하지 않는다.
2. pending-outbox 실제 Pod 교체 검증을 완료했다. root17841과 독립관찰79945는 종료0. [동일 메시지 복구](../../deploy/verification/candidate-d98d3c4/outbox-restart.json)와 [원래5설정·fault·임시포트 종료·supervisor 재연결](../../deploy/verification/candidate-d98d3c4/outbox-post-normal.json)을 확인했다. 전환 중 health 오류5회는 독립 관찰에 보존했다. 재시작을 반복하지 않는다.
3. 새 정상1.7 백업931876864B/SHA1cab74e110d172307ffd3605543da2db4261c27f009b97871a21bd1bf665827c의 생성·전송·전체SHA·worker종료를 root24866 종료0으로 확인했다. **그 정확한 스냅샷**의 현재1.7 복원 기능 검증·정리를 완료했고 하위1.6 복원 검증이 진행 중이다. 관련 form/receipt 및 1.7 목록 상태·이벤트 시간, 실제 MQTT와 원본 데이터 비교를 포함한다. 기존 다른 백업의 복원 근거를 재사용하지 않는다. 완료 후 rig0/Pod0/터널 종료·PVC 보존을 실제 확인한다.
4. 독립 인수 → 근거 커밋 → 새 불변 1.7 매니페스트 → 독립 해시/실제Ready/백업 검증 → 새 stable/runtime 태그·원격 전달 순서다. 이후에도 원래 일정과 최종 미디어 인수는 남아 있다.

## 재접속과 현재 소유 프로세스

- `node scripts/resume-status.mjs`로 실제 Git·클러스터·Ready 이미지·인증 API 버전을 대조한다. `artifacts/operations/status.json`의 PID·시작 시각도 확인하고 정상 프로세스를 중복 기동하지 않는다.
- 단일 1.7 supervisor: root handle77410 / PID33567 / `Tue Sep 22 01:40:37 2026`, 소유3104/18884. 실제1.7 Ready를 확인한 뒤 시작했다. 새 primary85394/PID34756, audit60682/PID34755는16:45:54Z 시작했다(둘 다 `Tue Sep 22 01:45:54 2026`). 실제 경로·카운터는 resume와 observer-1.7-activation을 읽는다.
- 이전 1.6 supervisor72380/PID19942, primary8363/PID21356, audit4110/PID21357은 모두 종료0. [닫힌 관찰 구간](../../artifacts/checkpoints/soak-1.6.0/summary.json)은 약2125/2120초·각326메시지·API/연결/invalid/duplicate0이다. **1시간 관찰이 아니다.** 전환 구간까지 연속 수신했다고 주장하지 않는다.
- 로컬1.7 fixture28735/PID28948은 미디어 정상 복구와 기존7·소유RTU 설정을 root가 읽기 대조한 뒤 종료0,3111포트 닫힘을 확인했다. private DB는 보존한다. [정리](../../artifacts/checkpoints/local-fixture-1.7-retirement/summary.json). 리허설58112도 종료0이며 [compact근거](../../artifacts/checkpoints/media-candidate17/README.md)와 [독립REVIEW036](../product/REVIEW-036.md)을 보존했다. 최종 영상으로 재사용하지 않는다.
- 전원 보호: handle11821 / PID80946 / `Mon Sep 21 22:33:11 2026`, `caffeinate -i -s -t 30861`. 원래 마감까지 한시적으로 동작한다. 지속 설정 변경은 없다.
- native heartbeat `grid`는10분마다 이 작업의 재개 절차를 호출한다. Mac과 Codex가 실행 중이어야 한다. 변화 없는 알림·재시험을 반복하지 않는다. 담당 핸들이 root에서 Unknown이면 담당 또는 실제PID/시작identity를 확인한다.
- 불확실한 쓰기는 commandId·이미지·백업 remotePath·복원 rig·시연 journal로 대조한다. 새 ID/등록/apply/복원을 무조건 반복하지 않는다. [NETWORK-RECOVERY.md](NETWORK-RECOVERY.md)를 따른다.

## 검증된 복구 기준과 현재 추가 백업

1.6 runtime331ab9a / image4af99e7b와 [checkpoint-1.6.0.json](../../artifacts/releases/checkpoint-1.6.0.json)을 보존한다. manifest source는 `b729f4287cf6a5a5527fa37f105e61bd41e135b7`, SHA는 `fd3fedc9dffb6bdc8d6e69982554dabde24bf3054113f02dc8370385bc238ae5`이며1466해시와 실제Ready/백업을 [REVIEW033](../product/REVIEW-033.md)에서 검증했다. 역사 소스는 `--at-commit`으로 대조하고 불변 파일·기존 태그를 덮어쓰지 않는다.

`stable-v1.6.0`은 운영·근거180fa6871d56fa723a5388ee3ea0b128ef623b4b, `stable-runtime-v1.6.0-331ab9a`는 정확 앱 소스331ab9a다. [태그 원격 확인](../../artifacts/checkpoints/release-1.6/tags.json). [선택 백업](../../deploy/verification/stable-backup-331ab9a.json)은851673088B/SHA `9bd8becb4211ee0edd9217db99e05b63d8fa3f5437a8e4cc7be2ace449cb3137`이며 동일 스냅샷의 current1.6/backward1.5 복원19보고서+2Pod identity를 검증했다. [복원 요약](../../deploy/verification/candidate-331ab9a/restore-summary.json), [실제 정리](../../deploy/verification/candidate-331ab9a/root-recovery-review/summary.json). 과거1.5/ad34 및 이전 체크포인트도 유지한다.

별도 [1.7 전환 전 백업](../../deploy/verification/pre-1.7.0-backup.json)은1.6 상태912310272B/SHA `7353d0d00dbbbd304d5361716b9913e02e0ead1b095b5bd133b4fb9db387338b`다. 생성·전송·무결성·전체SHA·0600 및 worker 종료를 확인했고16 health표본 실패0/재시작0이다. **이 추가 백업의 복원 증명은 아직 없다.** 기존9bd의 복원 증명을 붙이지 않는다.

과거 백업 실패의439500800B partial과 사건 기록은 보존한다. 원인 인과관계는 미확정이다. 현재 remote-backup과 pending-outbox는 고정WAL snapshot·소유worker시간 제한·종료확인 helper를 사용한다. [백업 사건](../../artifacts/checkpoints/backup-incident-20260921T1534/recovery-summary.json), [수정 검증](../../artifacts/checkpoints/backup-hardening-1.6/summary.json)을 참조한다. 동기I/O·호스트중단·원격취소의 한계를 성공 보장으로 표현하지 않는다.

## 버전·보안·최종 일정

[1.7 로컬 집계](../../artifacts/checkpoints/candidate-1.7-local-summary.json)는 전체302검사·실제broker 통합/고급·새목록8군·form44/receipt14·기존회귀를 포함한다. [REVIEW035](../product/REVIEW-035.md)의 인수는 로컬 범위다. exactimage의77 app검사는 별도이며 수치를 합치지 않는다. [이미지 근거](../../deploy/verification/candidate-d98d3c4/provenance.json)와 [보안 관리](../security/VULNERABILITY-MANAGEMENT.md)를 확인한다. 이미지에는 수정 버전이 확인되지 않은 기존4matches/2CVEs가 남아 있고, 이번 새 OSS/추가 취약점은 없다.

원래 시작은2026-09-21 17:07:33KST(08:07:33Z), 동결은2026-09-22 06:37:33KST(21:37:33Z), 종료는07:07:33KST(22:07:33Z)이다. 재접속·후속 아이디어로 연장하지 않는다.

동결 때 정상 버전을 선택하고 **선택 백업 → 정확 스냅샷 복원 → 근거 커밋 → 새 최종 매니페스트 → 신규 실제 UI 영상·복구·검수 → 같은 영상의 facts → 편집 가능한 PPT·전장 검수 → 인도**를 실행한다. 상세 컷오프는 [FINAL-RESTORE-PLAN.md](FINAL-RESTORE-PLAN.md), [MEDIA-PLAN.md](MEDIA-PLAN.md), [DELIVERY-PLAN.md](DELIVERY-PLAN.md)를 따른다. 새복원 cutoff를 넘기면 이미 검증된 stable 선택을 검토하고 미검증 백업을 승격하지 않는다.

미디어 facts는 아직 검수전1.6 템플릿이며 1.7 호환/리허설은 준비 자료다. 원래 최종창에 새 영상이 필요하다. pointer/click/zoom/한국어자막·음성·1080p H264/AAC를 검수하며 기술적 오디오검사를 청취로 표현하지 않는다. 실제KMA/AWS/운영VPP 성공은 미검증이다. untracked `artifacts/releases/current.json`은 과거 리허설용이므로 최종 입력에 쓰지 않는다.

최종 백업 전 snapshot/압축/전송/복원PVC/성장량의 실제 공간을 확인한다. 공유hostFS 여유는 PVC 예약량이 아니다. 검증된 백업은 자동삭제하지 않는다. 녹화 중단 시 담당 종료 후 private journal로 복구하며 기존 RTU를 일괄 초기화하지 않는다. 최종 인도와 정상상태를 확인한 뒤 이 실행의 heartbeat·소유터널을 종료하고 원격 앱/PVC를 보존한다.
