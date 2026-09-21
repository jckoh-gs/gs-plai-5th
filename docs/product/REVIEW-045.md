# REVIEW-045 — 제품1.7.1 기능·동일 스냅샷 복원 독립 인수

REVIEW041/044의 로컬·exactimage·main 근거에 더해 candidate-40b9ed8의 outbox-restart/post-normal, 정상백업 metadata/summary, 양 복원 보고서 및18:12:44.964Z root-recovery-review를 읽었다. restore-summary의26개 보고서 각각을 직접 열어 PASS를 확인했고2개 실제Pod identity와 구분했다. 새 시험/원격 쓰기는 없다.

## 기능 인수 판정

40b9ed8/234ec56/제품1.7.1의 기능·배포·복원 게이트는 충족한다. 공급 monitor의 strict online 및 가이드 계약 정정은 local/exactimage와 실제main 근거를 합쳐 입증하며, main을 의도적으로 끊어 LWT를 시험했다고 주장하지 않는다. ISSUE026의 이 제품 수정 범위는 기능적으로 해결됐다고 판단할 수 있다. 이슈 원장 변경은 담당에게 맡긴다.

실제 outbox Pod가2a16a910에서75f4bc7a로 교체되었고 messageId/sequence599/본문 SHA5ac56b…의 영속 본문과 외부MQTT 관측이 일치하고 PUBACK 시각이 기록됐다. 이후5단지 HEALTHY/pending0/장애false 및 기존 설정/시나리오가 보존됐다. 첫 정상화 harness 시도 이력과 성공 증거를 혼동하지 않는다.

정상 snapshot은1075081216B/SHA5ff34f3e5dbc52f07b899f0c8013db130e5fd13c3d315e92aa512d474ea1f782다. 백업 요약은wholeSHA/0600/worker종료·16health표본을 기록한다. current1.7.1 및 backward1.7의 init source/destination/expectedSHA가 모두 이 값이고 기존destination=false다. 각 원래5단지runId·발전기 on/limitPct 포함 설정·dataset와1시나리오 canonical 비교를 fixture 변경 전에 수행했다. 현재234ec56/하위d1e4 실제Pod 및 실제 제공JS/CSS 근거를 사용하며 localdist만으로 판단하지 않았다.

각 버전 form44/receipt14, auth/SSE, preview API/UI, export, 실제event/list, 인증MQTT125/오차0·중복·60samples를 확인했다. form은 actual201 baseline 복구이며 receipt는 성공등록응답 projection과 cleanup후GET의 독립비교로, receipt harness에201상태 assert가 있다는 주장은 하지 않는다. 제어시험은 복원본의 소유 새RTU 범위이고 원래5설정은 보존됐다. 이번 복원은 기존 시나리오 identity를 보존했으며 추가 시나리오 기능/KMA 실관측 재검증을 뜻하지 않는다.

양rig scaled-zero/final-pods와 root실제대조에서 replicas0/Pods0,4BoundPVC 보존,3105/18885 비점유를 확인했다. 모든 담당 종료 후 root재검토가 완료됐다. main75f4와 원래5canonical/시나리오 및 현재 관측기/감독기 identity는 유지된다.

## 남은 게이트

FR-VPP-STATUS01은 verified_functional로 승격 가능하다. AT01~03의 검증 범위는 기존 로컬 판정을 유지한다. AT04의 기능·배포·복원 부분은 완료했지만 문장에 명시된 새 불변checkpoint가 아직 없으므로 **partial 유지, manifest검증만 대기**로 기록한다. 이 구분은 기능 stable 태그/manifest 준비를 막는 제품 결함이 아니라 출처 인수 순서다. 기존1.7/1cab을 보존하며 전체목표·최종미디어·14시간 운영 완료를 선언하지 않는다.
