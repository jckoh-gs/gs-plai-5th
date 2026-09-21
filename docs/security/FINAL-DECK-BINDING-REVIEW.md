# 최종 발표자료 binding 독립 보안 검토

검토 범위: prepare-final-deck.cjs, final-deck-binding.cjs, facts.template.json, final-deck-binding.test.js. 최초 소스 검사와 기존 fixture를 기반으로 한 별도 격리 공격 사례를 실행했다. 실제 영상 검수·최종 config·렌더·클러스터 작업·CVE 재검사는 수행하지 않았다.

최초 재현 결과는 `evidence/final-deck-binding-initial-probes.json`에 기록했다. 아래 다섯 사례 모두 초기 binder가 허용했으므로 메인에 먼저 보고했다.

1. 내용이 빈 기존 파일을 scenario evidence로 사용하고 임의 afterRunId를 넣으면 생성된 notes가 검수된 새 run을 주장한다. 파일 존재만 검사하므로 사실의 연결을 검증하지 못한다.
2. video.duration 누락 시 scene bounds 비교가 NaN으로 무력화된다.
3. createdAt이 엄격한 ISO가 아닌 Date.parse 허용 문자열이어도 통과한다. 정확한 날짜/달력 계약이 필요하다.
4. 일반 sources 이름의 symlink가 artifacts/private 파일을 가리켜도 통과한다. scenario evidence는 lexical private 검사조차 없고, 일반 sources는 root 밖 경로와 canonical path를 제한하지 않는다.
5. facts.body의 합성 Bearer 비밀문자열을 포함한 config가 생성된다. 후속 build의 public-input 검사가 이를 거절하더라도 준비 config 파일에 먼저 기록되는 경계는 별도다.

추가 소스 발견: command report는 같은 video/source 아래 위치만 검사한 뒤 현재 hash를 출력 binding에 추가한다. 사전에 검수한 report hash나 실제 녹화 시간과의 관계가 없어서 과거125kW 완료 report를 복사해 facts.beforeRunId를 맞추는 것을 자동 검증으로 막지 않는다. 캡처·timeline과 같은 reviewed hash 연결 또는 recorder의 immutable source receipt가 필요하다.

권고: canonical root 내부/public 파일 경계와 symlink/private 차단, finite positive duration 및 엄격한 ISO/달력 검증, 사실 report hash·실제 녹화 시간·RTU/run 식별 연결, scenario receipt 내용을 검증한다. 비밀 필드/패턴 검사는 config를 쓰기 전에 실행하고 최종 build·delivery에서도 재검증한다. 본문/발표노트의 의미까지 일반 JSON 검증으로 증명할 수는 없으므로 reviewed facts는 여전히 신뢰된 사람/에이전트의 주장 검수 입력이며 claimsReview를 대체하지 않는다.

상태: 최초 결함 보고 완료. 담당 수정 및 독립 재검증 전 해결 또는 최종준비 완료로 간주하지 않는다. 후속 build/dependency 보존 연결은 이 검토 시점에 별도 작업 중이다.

## 수정 후 독립 재검증

미디어 담당 수정 후 기존 fixture 27/27을 독립 재실행했고, 최초 다섯 사례와 후속 발견 한 사례를 별도 격리 재현해 모두 거절됨을 확인했다. `evidence/final-deck-binding-final-review.json`에 최신 소스/템플릿/시험 SHA-256과 6개 독립 probe를, `final-deck-binding-rereview-tests.txt`에 시험 출력을 보존했다. 최초 실패 증거는 덮지 않았다.

해결 확인: 입력·출력·근거·캡처의 repository-relative public realpath 검사, source symlink 차단, 엄격한 UTC ISO/실제 달력·유한 길이·장면 경계, 현재 run/배포/source/product/PRD 일치, 검수한 command report hash 및 scene4 시간 범위, 실제201 등록 RTU/초기run/보고서run 연결, 영상과 같은 demoRecovery JSON의 최종 observed transition/currentRunId 일치를 검증한다. 임의 파일 존재만으로 새 run을 주장하던 경계가 제거됐다.

추가로 command report의 commandId가 facts 검사 후 notes에 삽입될 때 credential-like 문자열이 통과하는 사례를 발견했다(`evidence/final-deck-binding-derived-text-probe.json`). 담당이 반환할 전체 config에 publicText 검사를 적용했고, CLI가 파일을 쓰지 않으며 stderr에도 해당 문자열을 내보내지 않는 회귀시험 및 독립 probe가 통과했다. 이 후속 결함도 해결 처리한다.

현재 검토 범위에서 차단할 결함은 남지 않았다. 이는 입력 내용의 무결성과 정해진 증거 연결의 검증이며, 임의 자연어 body/notes의 사실성을 자동 증명하거나 알려지지 않은 개인정보·모든 형태의 비밀을 탐지하는 기능이 아니다. reviewed facts와 visual/claims review는 여전히 신뢰된 검수 입력이다. 로컬 파일을 검사 후 교체할 수 있는 악성 동시 writer에 대한 원자적 snapshot 보장은 없으므로 신뢰된 작업 디렉터리가 전제다. build-deck/verify-delivery의 source/facts 보존 연결은 별도 통합 검증 대상이며 이 기록은 실제 최종 영상·슬라이드 생성이나 검수 완료를 주장하지 않는다.

## 원장 UTC 형식 호환 delta 독립 검토

실제 원장의 freezeAt/deadlineAt은 `+00:00`와 마이크로초 소수를 포함한다. 새 ledgerIso는 원장 두 필드에만 UTC Z/+00:00 및 1–6자리 소수를 허용하고, 정수 초 부분은 기존 엄격한 iso 검사로 실제 달력을 검증한다. 증거 파일의 createdAt/recordingStartedAt/명령·복원 시각은 기존 strict ISO 정책을 그대로 유지한다. 소수 밀리초는 JS 숫자 정밀도 범위 내에서 유지하며 원장 원문을 변경하지 않는다.

최신 fixture 31/31 독립 통과. 실제 원장 두 값·UTC 소수·윤년 유효일 허용, rollover·24시·비UTC offset·7자리 소수·RFC 문자열 거절 등 별도 순수 파서 10개 사례 및 sub-millisecond 검사를 수행했다. 새 소스 hash와 결과는 `evidence/final-deck-binding-ledger-review.json`, 로그는 `final-deck-binding-ledger-review-tests.txt`에 별도 추가했으며 과거 hash를 덮지 않았다. 이 delta에서 차단할 결함은 발견하지 않았다. 실제 최종 config·미디어 생성·원장 수정은 수행하지 않았다.
