# 제품1.6 미디어 호환성 준비

IDEA010/PRD1.13의 미디어 준비 기록이다. 초기 허용목록 검토 당시 템플릿은1.5.0/PRD1.12였고, 아래 실제 배포·복원 검증 후 제품1.6.0/PRD1.13으로 갱신했다. 현재 템플릿은 reviewed:false/preparationTemplate:true이며 최종 미디어 완성을 뜻하지 않는다. 최종 선택은 원래 동결 시간 이후 실제 선택 매니페스트와 새 영상 근거를 따른다.

`final-deck-binding.cjs`는 기존 명시 지원에 정확한1.6.0만 추가했다.1.5.0 복원 경로를 유지하고1.6.1/1.6.0-rc.1/1.7.0 등 미검토 버전은 거절한다. `release-features.cjs`의 접수 확인 기능은 정확한1.5.0과1.6.0에서만 활성화한다. CSV 미리보기·명령 내보내기와 기존8장면 구성은 같다. 접수 확인 후 저장 상태 조회, 별도MQTT125kW, 정지 superseded 구분, 잘리지 않는RTU 지표 구도도 유지한다.

기존8장면은 이벤트 로그 페이지를 방문하지 않는다. 따라서 이벤트의 실제 발생 시각 표시 기능을 수정했다고 소개할 수 있는 범위는 추후 확정된 소스와 별도 UI 검증 근거이며, 현재 영상이 해당 페이지의 수정 결과를 시연했다는 주장은 하지 않는다. 최종1.6이 선택되면 버전 이력에 정확한 수정 범위를 추가하고 선택 매니페스트에 포함된 실제 검증 근거를 연결한다. 이벤트 시각으로 영상 타임코드를 추정하지 않으며 바인더는 계속 실제 scenes.json의 start/end+lead를 사용한다.

관련 바인더42개와 장면 분기·소유권4개, 총46개 집중 검사가 통과했다. 정확한1.6.0/PRD1.13의 run/manifest/facts/내보내기 일치,1.5/1.4 복원 지원, 미검토 버전 거절 및 접수 기능 분기를 확인했다. 테스트 입력은 합성 fixture이며 실제1.6 UI 시각 수정 검증은 담당 UI/메인 근거에서 확인해야 한다. 녹화기나 장면 조작은 변경하지 않았고 추가 전체 영상·PPT 렌더·원격 조작은 수행하지 않았다. 음성 청취 또는 발음 검수를 새로 수행했다는 주장도 없다.

## 실제1.6 배포·복원 검증 후 준비 선택 갱신

메인의 요청으로 최종 승격 독립 검토 및 매니페스트 작성에 앞서 준비 선택을 제품1.6.0/PRD1.13, runtime331ab9a, image4af99e7b 계열로 갱신했다. `facts.template.json`은 reviewed:false/preparationTemplate:true를 유지한다. 예정된 `artifacts/releases/checkpoint-1.6.0.json`은 이 갱신 시점에 검증된 최종 매니페스트라고 선언하지 않는다. 실제 존재·해시·근거 포함 여부는 작성 후 및 동결 시 다시 확인한다.

현재 실제 근거 경로는 `deploy/verification/candidate-331ab9a/`와 `deploy/verification/stable-backup-331ab9a.json`이다. 메인 이벤트59개와 복원1.6 이벤트79개는 각각 main-event-time/result.json 및 restored-event-time/result.json의 읽기 전용 API/UI 대조다. 영상8장면은 그대로이며 이벤트 로그를 촬영하지 않는다. 원래 최종 동결21:37:33UTC와 마감 창은 바꾸지 않는다.

동일한851673088바이트/sha256 9bd8becb4211ee0edd9217db99e05b63d8fa3f5437a8e4cc7be2ace449cb3137 백업으로 현재1.6 및 하위호환1.5를 독립 복원했다. restore-summary의21개 근거는 보고서19개와 실제Pod 신원2개이며 하나의 기능 시험 수로 혼동하지 않는다. 두 복원 버전 각각 일반 목표 폼44개와 접수 확인14개 검증을 통과했다.1.5에는 알려진 이벤트 시각 표시 제한이 남으며1.6 수정이 하위호환 이미지에 소급 적용되었다고 주장하지 않는다. 응답 가로채기 fixture는 실제 네트워크 장애가 아니고, REST 접수는 완료가 아니며, 정지 superseded와 별도MQTT125kW를 구분하는 기존 설명을 유지한다.

슬라이드6/9/11/14의 현재 폼·접수·outbox·복원·백업 경로를 실제331ab9a 근거로 바꿨고 슬라이드12/14에는 별도 이벤트 시각 근거를 연결했다. 모든 최종 영상·명령·캡처 해시는 자리표시 상태다.14장 구조·장면 인덱스·공개 출처 경로 존재·정확한1.6 기능 분기·미검수 보호값만 확인했으며, 이미 통과한 허용목록 시험이나 전체 녹화·PPT 렌더를 반복하지 않았다. 음성 청취 주장을 추가하지 않았다.

## 생성된 체크포인트와 준비 facts 대조

`artifacts/releases/checkpoint-1.6.0.json`을 읽어 대조했다. 매니페스트 SHA-256은 `fd3fedc9dffb6bdc8d6e69982554dabde24bf3054113f02dc8370385bc238ae5`, 운영 소스는 `b729f4287cf6a5a5527fa37f105e61bd41e135b7`, runtime은 `331ab9a00ee71a0924042e7952013d47495449d3`다. 준비 템플릿 SHA-256 `a8272adb2d2170e704fb3ba0d3f514c148becc9e4ab0cf5cec4f50479d50b9a2`는 매니페스트 source.hashes 항목과 일치한다.14장, 제품1.6.0/PRD1.13, reviewed:false/preparationTemplate:true는 변경되지 않았다.

유일한 공개 참조 경로는13개다. 그중 facts.manifestEvidence의7개는 모두 실제 매니페스트 evidence 항목에 있고 현재 파일 SHA-256까지 일치한다: restored-command-form/result.json, restored-command-receipts/result.json, outbox-restart.json, restore-summary.json, stable-backup-331ab9a.json, main-event-time/result.json, restored-event-time/result.json이다. 앞서 적은 candidate-331ab9a 하위 경로를 그대로 대조했다.

일반 sources6개는 evidence 배열 항목이 아니다. PRD는 manifest.prd.sha256과, protocol은 source/runtimeIdentity 해시와 각각 일치한다. 나머지 `docs/security/VULNERABILITY-MANAGEMENT.md`, `docs/issues/ISSUES.md`, `docs/product/PRD-CHANGELOG.md`, `docs/product/IDEAS.md`는 존재하는 공개 설명 문서이지만 이 매니페스트에 해당 파일 해시가 없다. 따라서13개 전체를 불변 evidence로 결속했다고 주장하지 않는다. 현재 바인더도 일반 sources의 공개 파일 존재와 manifestEvidence의 정확한 매니페스트 해시를 구분한다. 최종 facts 검수 시 이 네 문서를 최신 문맥으로 검토해야 하며 과거 실행 증거로 대신 사용하지 않는다.

이번 작업은 읽기 전용 대조와 이 결과 추가뿐이다. 템플릿·실행 코드·기존 매니페스트는 수정하지 않았고, 최종 영상·PPT 생성이나 새 원격 검증을 수행하지 않았다. 최종 동결 이후의 새 영상 바인딩은 별도 필수 절차다.
