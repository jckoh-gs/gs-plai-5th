# 자율 실행 인계

현재 기능상 안정 버전은 **1.7.1 / PRD1.15 / IDEA012 v1**이다. 앱 소스 `40b9ed898f32037e7a87259d12d145457575a4a8`, 이미지 `234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876`, 실제 main PodUID `75f4bc7a-0c4d-4cff-8ce2-cea68fd43cbc`를 확인했다. 전체 목표는 최종 시간·영상·PPT·인도가 남아 있다. 재개할 때 최신 사용자 지시, 현재 시각, [run.json](run.json), [resume.json](resume.json), 실제 Git·프로세스·배포부터 대조한다.

기상 시연 revision2 준비를 완료했다. [80개 파일·35개 소스 메인 대조](../../artifacts/checkpoints/media-weather-r2-root-review/checks.json), [REVIEW053](../product/REVIEW-053.md), [ISSUE031 수정 후 대조](../issues/evidence/issue031-after-review.json)를 확인한다. 새CSV/소유RTU의500→651.8→500, 후속MQTT125/error0, 양복구 및 기존3RTU 불변을 검증했다. 실패 첫 시도는 보존했다. recorder83763/observer98107/postMQTT77844/ASR16567/fixture85525는 모두 종료0,3113닫힘이므로 재실행하지 않는다. 최종8장면은 원래 동결 이후 새로 만든다. scene6의 별도 재전송·브로커 확인 설명을 명시한 원고 revision3도 준비를 마쳤다. [22파일·34문장 음성 대조](../../artifacts/checkpoints/audio-narration-r3-root-review/checks.json)와 [REVIEW054](../product/REVIEW-054.md)를 따른다. 합성88272/전체ASR40659/장면ASR58340 모두 종료0이다. 실제 음성161.637초, 최소계획290초이며 최종 영상 길이가 아니다. 직접청취false와 인식 차이를 유지한다.

## 재연결 뒤 우선 확인

미검수 facts 준비 템플릿 revision2는7번 슬라이드를 새 기상 조작 캡처에 연결했으며 REVIEW055를 따른다. [남은20개 게이트](../product/final-pending-gates.json)는 계획이고 acceptance는 승격하지 않았다. 새 [읽기전용 관측 준비](../../artifacts/checkpoints/demo-state-observer-integration/summary.json)는 격리11시험17616/실제CLI92454의 종료0, 독립 보안 검토와 소스 보존22시험을 완료했다. 이 핸들을 재실행하지 않는다. 최종에는 실제 final-scenes와 새 `artifacts/video/source/weather-observations.jsonl`을 사용해 권장360초만 새로 관측한다. 도구 종료와 recorder 종료는 별도로 확인하고 실제 소유ID/입력/출력·시각·영상/관측 해시를 연결한다.

revision3 보존 커밋9c90808 전달 뒤 [19:24Z 읽기 점검](../../artifacts/checkpoints/resume-after-media-r3/summary.json)은 원격 main 일치, 동일1.7.1 Pod·이미지·인증API, 원장 정합성 및 현재3프로세스를 확인했다. 명령39652와 앞선push86269는 종료0이다. 양관측814메시지/invalid0와 이전API1·보조연결1오류를 그대로 보존했고 재시작하지 않았다. 이 과거 snapshot을 미래 연결 상태로 간주하지 않고 재개 시 새로 조회한다.

`node scripts/resume-status.mjs`는 원격 Git·실제 이미지/Ready·인증 API·현재 관측 원장의 정합성을 읽기 전용으로 검사한다. 응답을 잃은 작업은 기존 journal·고유 리소스·담당의 원래 핸들·종료 영수증을 확인한다. 완료된 제어·배포·복원을 반복하거나 새 commandId를 발행하지 않는다. 보조 담당의 핸들이 메인 도구에서 보이지 않는 것만으로 종료를 추론하지 않는다. [네트워크 복구 절차](NETWORK-RECOVERY.md)를 따른다.

[18:27Z 이후 추가 점검](../../artifacts/checkpoints/network-resume-1.7.1/summary.json)은 현재 실제 세 프로세스·Ready/API·원격 Git·기존 heartbeat 설정을 확인했다. 독립 격리32시험을 포함하며 실제 전체 네트워크 차단 시험은 아니다. 재연결 당시의 상태를 새로 확인해야 한다.

그 뒤 ISSUE030에서18:42Z API 오류1회와18:43Z 소유 터널 자동 재연결을 관찰했다. 동일 supervisor/observer 프로세스를 유지하고 오류·수신 공백 카운터를 보존했다.4 RTU에서 관측하지 못한144표본 위치는 별도 읽기 조회로 원격 생성·outbox 보존·broker ACK를 대조했다. 모든 구독자의 수신이나 연결 장애 근본원인은 확인되지 않았다. [원문](../../artifacts/checkpoints/connection-1.7.1-20260921T1842/summary.json)과 [보존 대조](../../artifacts/checkpoints/connection-1.7.1-20260921T1842-persisted-proof/summary.json)를 첫1시간 및 최종 관찰 해석에 함께 사용한다.

현재 root 소유 상주 프로세스는 다음과 같다. PID와 시작 identity를 함께 확인한 뒤 유지한다.

- supervisor48590 / PID56137 / `Tue Sep 22 02:52:15 2026`: 단일3104/18884 연결 감독기.
- primary72957 / PID57533 / `Tue Sep 22 02:59:54 2026`: `artifacts/soak/v1.7.1`, session `0ea34e34-e199-4b14-84ab-40ff75fa5d96`.
- audit8133 / PID57534 / 같은 시작 identity: `artifacts/soak/telemetry-audit/v1.7.1-20260921T1800`, session `1e38bd3c-002a-49f4-9aa8-9039887b7889`.
- 임시 전원 보호11821 / PID80946 / `Mon Sep 21 22:33:11 2026`는 원래 종료 시각까지다. 수동 강제 절전·전원 종료 방지를 보장하지 않는다.

이전1.7 primary85394/audit60682/supervisor77410은 종료0·별도 보존했으므로 재시작하지 않는다. 새 프로세스의 활성화·소스·초기 원장 검사는 [활성화 기록](../../artifacts/checkpoints/observer-1.7.1-activation/activation.json)에 있다. heartbeat `grid`는 기존 작업을10분 간격으로 재개 점검하며 중복 생성하지 않는다. Mac/Codex가 종료된 동안 AI 작업 지속을 보장하지 않는다.

## 완료된 1.7.1 체크포인트

- 로컬317시험·실제 broker통합/고급·CLI online/LWT·정확 OCI79시험·보안 검사·registry 전달을 완료했다. 서버/web/DB/OSS 변경 없이 공급 monitor의 strict boolean online과 안내 계약을 정정했다. [로컬](../../artifacts/checkpoints/candidate-1.7.1-local/summary.json), [정확 이미지](../../deploy/verification/candidate-40b9ed8/pre-deployment-review.json), REVIEW040/041을 참조한다.
- 실제 main UI/API/원래5설정·실행·데이터·시나리오·MQTT125kW/error0·online 관측과 outbox 실제 Pod 교체를 완료했다. outbox87050과 독립관찰71381 종료0, 계획 전환 health 실패4회 및 복구를 보존했다. [root 정상 확인](../../deploy/verification/candidate-40b9ed8/outbox-post-normal.json). main online 관측은 retain flag를 노출하지 않으므로 retained 수신 증명으로 확대하지 않는다.
- 정상 백업9205 종료0: **1075081216B**, SHA `5ff34f3e5dbc52f07b899f0c8013db130e5fd13c3d315e92aa512d474ea1f782`, `deploy/verification/stable-backup-40b9ed8.json`. 전체SHA·SQLite·0600·worker종료를 root도 확인했다. 동일 스냅샷의 현재1.7.1/이전1.7 복원 **26보고서+2Pod 식별**을 통과했다. form44/receipt14·event/list·auth/preview/export·실제MQTT를 양쪽에서 검증했다. form은 실제201, receipt는 독립 성공응답 baseline 비교 범위다.
- [복원 집계](../../deploy/verification/candidate-40b9ed8/restore-summary.json), [root 실제 정리](../../deploy/verification/candidate-40b9ed8/root-recovery-review/summary.json), REVIEW045. 양쪽 복원배포0/Pod0/4BoundPVC보존·3105/18885종료·main원래5설정을 확인했다. 모든 복원 담당 핸들은 종료됐으며 반복하지 않는다.
- 새 불변 [checkpoint-1.7.1.json](../../artifacts/releases/checkpoint-1.7.1.json)은 source `b6c3cbc5742b095bedb32b5f4dea598e685412f5`, SHA `0c9e5bec0a0ef506884b70374aae791e2cb2e38321dcdcd841c10a02c6962ebf`다. root와 REVIEW046에서 **2033개 해시·실제Ready·백업**을 대조했다. 후속 문서/템플릿 변경이 있으므로 역사 무결성 검증에는 `--at-commit`을 사용한다. 새 태그의 실제 상태는 run.stableCheckpoint/tagVerification을 읽는다. 기존1.7/1cab·1.6/9bd 등 불변 매니페스트·태그·백업은 보존한다.

## 다음 작업과 원래 마감

최종 백업 선택은 기존 불변1.7.1/5ff 체크포인트 기록을 보존한 채 별도 `finalReleaseSelection`에 기록한다. 실제 복원이 증명된 선택만 `run.backup`과 새 최종 매니페스트에 연결하며 기존 stable 태그의 백업·복원 근거를 덮어쓰지 않는다. [독립 제품 검토057](../product/REVIEW-057.md)은 이 절차와 생성·검증 코드의 일치를 확인했다. 실제 최종 선택과 매니페스트는 아직 없다.

동결 시 기존 관측기의 원래 핸들 종료0과 각 종료 파일·마지막 poll·전체 로그·실제 소스를 함께 보존한다. [종료 절차의 독립 준비 검토](../issues/evidence/final-observer-closeout-preparation-review.json)는 실제 finally/close 처리와 계획의 일치를 확인했으며 실제 종료나 최종 역할 판정은 아니다. 정상 종료에 따른 연결 해제 증가를 새 장애로 오인하지 않고 감독기와 운영 터널은 최종 촬영까지 유지한다. 정확한 파일과 순서는 [최종 복원 계획](FINAL-RESTORE-PLAN.md)을 따른다.

[추가 제품 검토056](../product/REVIEW-056.md)은 새 실증 결함이나 남은 시간에 전체 검증 가능한 개선안이 없어 이번 회차 새 기능을 채택하지 않았다. 제품1.7.1/PRD1.15와 원래 일정을 유지한다. [19:53Z 공간 관측](../../artifacts/checkpoints/capacity-1.7.1-pre-final/README.md)은 동일 main Pod·레지스트리 Ready,35개 Bound PVC, DB약1.30GB/노드 여유약58.7GB를 확인했다. 실제 동결 직전 공간 재확인은 여전히 필요하며 최종 역할 판정·백업·복원을 대신하지 않는다.

1. stable-v1.7.1(운영·근거c9b43bd)와 stable-runtime-v1.7.1-40b9ed8(정확 앱40b)의 원격 refs 확인을 완료했다. [태그 증거](../../artifacts/checkpoints/release-1.7.1/tags.json)를 재사용하며 다시 만들거나 이동하지 않는다.
2. 현재 관측을 유지한다. [실제1.7.1 첫1시간](../../artifacts/checkpoints/soak-1.7.1-first-hour/summary.json)을19:00:10Z에 확보하고 root 및 REVIEW051이13개 해시·최초경계까지 원문prefix를 대조했다. primary3607.263초/audit3601.054초·각564메시지이며 invalid/duplicate0, API오류1/audit연결오류1·4RTU수신불연속은 ISSUE030과 함께 보존했다. 무오류·무중단으로 표현하지 않는다. 캡처를 반복하거나 관찰기를 재시작하지 않는다. 이전1.7 기록도 그대로 보존한다. 이후 아이디어는 구체적 문제 근거·PRD/아이디어/제품 버전과 검증된 fallback을 갖춰 채택한다.
3. **21:27:33.079009Z**에 product/security/issues가 선택 버전의 최종 변경·문제·보안 검토를 수행한다. 계획과 링크만으로 역할 종료를 인정하지 않는다. 취약점 잔여와 ISSUE024의 미확정 원인은 유지한다.
4. **21:37:33.079009Z (한국시간06:37:33)**부터 새 기능을 중단하고 [FINAL-RESTORE-PLAN](FINAL-RESTORE-PLAN.md)에 따라 실제 정상 버전·정확 스냅샷·최종 불변 매니페스트를 확보한다. 새 백업 복원 컷오프21:44:33Z를 넘기면 이미 같은 스냅샷 복원이 검증된 안정 체크포인트 선택 여부를 판단한다. 원래 T0와 종료 시각을 다시 시작하지 않는다.
5. 그 최종창에 **새 실제 한국어 UI 시연 영상**을 녹화한다. 포인터·클릭·확대/축소·음성·자막,8장면과 실제MQTT125/error0/3상태를 검수한다. 자체201 RTU·private journal을 사용하고 recorder 실제종료 뒤 복구를 검증한다. 이전 리허설은 최종 영상이 아니다. 이어 검수된 동일 영상으로 **새 편집가능14장PPT**를 생성·재수입·전장렌더·검수한다. facts.template은1.7.1의 미검수 준비용이며 reviewed=false/preparationTemplate=true를 임의 승인하지 않는다.
6. **22:07:33.079009Z (한국시간07:07:33)**까지 인도 파일·소스/샘플/시험·원격Git·정상배포와 완료/미완료를 확인한다. [DELIVERY-PLAN](DELIVERY-PLAN.md)에 따라 독립 검수와 해시를 기록한 뒤 이 실행의 heartbeat를 비활성화한다. 마감이나 목표 완료를 거짓으로 연장하지 않는다.

소프트웨어 인도 도구와 현재1.7.1의 실제 Git 준비 관측을 [software-delivery-1.7.1](../../artifacts/checkpoints/software-delivery-1.7.1/summary.json)에 보존했다. source188/runtime28/추가README·환경·Compose·broker4파일, 당시main194파일과 원격 태그 관계를 확인했다. ISSUE029의 빈시험 목록/마감후PASS파일 오인 문제를 수정했고 독립18fixture가 통과했다. 최종창에서는 새 선택 manifest를 포함한 실제 원격 commit/tag로 재검사하고, 파일 단독이 아니라 원래 성공 종료·stdout 영수증·정확SHA를 함께 확인한다. 현재 runtime40b/image234·불변1.7.1 manifest·기존 태그는 변경하지 않았다.

음성 준비는 [AUDIO-REVIEW-PREPARATION](AUDIO-REVIEW-PREPARATION.md)을 따른다. 한국어 원고 revision1의 쉬운 표현7개를 REVIEW050 이후 채택했고 별도 실제 음성·ASR로 대조했다. 제이슨은 JSON으로 인식되며 난수/배속/서버 일부 인식 차이는 남아 있다. 직접 청취·자연스러운 발음 적합 판정은 하지 않았다. 고정 도구·모델의 재사용 전사기는 기존 영상에서 실제 종료0/PCM246.78초/33구간, 독립 경계시험14개를 확인했다. 최종 새 MP4는 새 private 출력에서 다시 전사하고 원고와 대조해야 한다. 기존 초기 전사기의 고정 영상 길이는 재사용하지 않는다. 모델·CLI·PCM은 private에 유지하며 보안 잔여는 제품 이미지 취약점과 별도로 관리한다.

기존 `.idea`, 미디어 리허설, `artifacts/releases/current.json`, 과거 partial과 검증 백업/PVC를 임의 삭제하지 않는다. private SQLite/토큰/Secret 값은 Git·화면·공개 로그에 넣지 않는다. 무관한3101/PID20846,1883브로커를 보존한다. 실제 대기 동작과 미완료 원격 작업을 먼저 확인하고, 필요한 소유 작업만 조정한다.
