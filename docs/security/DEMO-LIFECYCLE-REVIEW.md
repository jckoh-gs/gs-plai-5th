# 시연 RTU 수명주기 독립 보안 검토

범위: scripts/media/demo-lifecycle.cjs, recover-demo.cjs 및 record-demo.cjs의 수명주기 연결. 로컬3106·실제 k3s·실행 중 녹화는 건드리지 않고, 별도의 임시 HTTP fixture와 소스를 검토했다. 코드 수정·최종 미디어 제작·CVE 재검사는 수행하지 않았다.

## 최초 확인된 시계 경계 결함

candidate()가 서버 plant.createdAt을 로컬 intent.preparedAt 이상 및 로컬 original deadline 이하로 비교한다. actual201 응답을 직접 관측했더라도 서버 시계가 1ms/2초/30초 느리면 captureRegistration이 거절됐다. 이후 초기 baseline이 없어 복구도 거절되며 새 쓰기는 0건이다. `evidence/demo-lifecycle-clock-lag-initial-review.json`에 별도 재현했다. 이는 다른 RTU를 잘못 수정하는 결함이 아니라 정당하게 생성한 RTU의 소유권 기록·자동 정리를 막는 운영 결함이다.

권고: 직접 관측한 등록 POST/201 응답의 요청 fingerprint·새 ID·기존 baseline ID 제외·유효 서버 createdAt으로 소유권을 연결하고 서로 다른 시계의 대소관계를 소유권 조건으로 사용하지 않는다. 등록 응답을 잃은 경우의 상태조회는 초기 baseline을 발명하지 않고 unique candidate를 힌트로만 제시해야 한다. 다수 후보/미관측 응답은 기존처럼 자동 쓰기를 거절해야 한다. 메인 및 담당에 먼저 보고했고, 메인이 candidate의 cross-clock 대소 비교를 제거했다. 실제201의 새 ID/runId·정확한 fingerprint·기존 ID 제외·유효 서버 createdAt을 사용하고, 서버 createdAt은 이후 변경 여부를 확인할 불변 식별정보로 보존한다. 응답 손실 시 unique candidate는 여전히 힌트일 뿐 initial baseline을 발명하거나 자동 쓰기 권한을 만들지 않는다. 수정 후 독립 11/11 시험에서 서버 ±30초 및 skew를 가진 응답 손실을 확인하여 이 결함을 해결 처리했다.

## 나머지 경계

기존 수명주기 fixture 8/8을 독립 재실행했다(`evidence/demo-lifecycle-initial-review-tests.txt`). 복구는 journal.owned ID만 대상으로 하며 매 단계 앞에서 runId·createdAt·name/type·기존 RTU 제외를 확인한다. faults/generator/replay는 필요한 차이만 PATCH/POST한다. 적용 후 응답 손실은 다음 조회로 이미 적용된 값을 확인하므로 같은 patch를 무조건 다시 보내지 않는다. 미해결 scenario restore intent는 추정해 진행하지 않고 중단한다. 실제201 초기 baseline과 관측한 same-owned200 run 전이는 기록상 구분된다.

사전 RTU 비교는 projection에 포함한 설정 필드의 hash/값 비교이며 동적 출력·시각·전체 DB의 완전 불변 증명이 아니다. 시연의 소유 RTU 정리도 난수 궤적 복원을 주장하지 않고 seed 재초기화 여부를 따로 표시한다. 현재 생성 scene-plan에서 실제 쓰기를 발생시키는 제어/장애/재생/시나리오 동작과 MQTT dispatch는 requiresOwned를 붙인다. 임의 운영자 config의 모든 일반 click을 분석하는 권한 시스템은 아니므로 검수된 생성 config를 전제로 한다. concurrent 외부 편집을 원자적으로 잠그는 기능도 없으며, CLI 복구는 녹화가 중단됐음을 확인한 후 실행해야 한다.

API는 자격증명·query·hash 없는 HTTP loopback origin, Authorization header, redirect error 및 최대5초 AbortSignal을 사용한다. 수명주기 객체마다 최대60초이되 항상 원래 deadline으로 제한하며, fresh 객체가 원래 마감을 연장하지 않는다. 동기 파일 I/O의 절대 hardtimeout과 이미 전송한 서버 변경의 취소는 보장하지 않는다. 원장 파일은 wx/0600 임시파일 fsync+rename으로 기록되고 토큰 본문을 저장하지 않는다. journal에는 설정/원본 dataset 관련 정보가 들어갈 수 있으므로 비공개 운영자료로 유지한다. API/복구 오류는 일반화하고 raw response·토큰을 출력하지 않는다. 복구 CLI는 원래 run/deadline/product/tunnel과 journal 연결을 확인한다.

## 최신 수정 및 delivery 연결 재검토

`evidence/demo-lifecycle-fixed-review-tests.txt`: 최신 lifecycle 11/11 독립 통과. `evidence/demo-lifecycle-delivery-review-tests.txt`: delivery fixture 13/13 독립 통과. 소스 해시는 `evidence/demo-lifecycle-final-review.json`에 새로 추가했으며 초기 시계 결함 재현·초기 hash를 보존했다. 실제 focused rehearsal은 UI 담당의 별도 결과이고 보안 담당이 실행했다고 주장하지 않는다.

verify-delivery는 video와 별도 cleanup receipt의 canonical JSON 일치, 실제201 등록 ID/초기run→명령 RTU/run→최종 scenario transition/currentRun, settingsMatched 및 기존 RTU projection 불변을 요구한다. scenario 전이 후 runId가 달라져 baselineHash와 actualHash는 정상적으로 다를 수 있으므로 두 해시의 무조건 동일성을 요구하지 않는다. 각각 64자리 digest 형식, 설정 일치 verdict 및 실제 전이 연결을 함께 검사한다. facts/report/recovery/scenes/movie/manifest의 각 binding hash와 보존한 binder·lifecycle source 경로도 확인했다. 이는 증거 연결 검증이며 별도 실제 영상·슬라이드 검수와 동일하지 않다.

현재 검토 범위의 차단 결함은 없다. 문서화한 신뢰된 단일 운영자·검수된 scene config·동시 변경 비원자성·동기 I/O 및 원격 취소 한계는 유지한다.
