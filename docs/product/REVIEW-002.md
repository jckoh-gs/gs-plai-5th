# 제품 검토 002 — 증거 범위 대조

검토 기준: HEAD a59646b032baf362802b7c7307fc762357b22367 위 개발 중 작업본. 파일별 검토 시 SHA-256은 acceptance.json에 기록했다. 기존 시험 로그는 실행 당시 전체 소스 revision이 고정되어 있지 않으므로 마지막 릴리스 시험을 면제하지 않는다. 원격 배포 증거로 확대하지 않는다.

## 판정

142개 항목 중 verified_local 29, partial 24, observed_prior_pass 4, pending 85. 상위 FR/AT 그룹은 하위 일부 통과만으로 자동 완료하지 않는다. verified_local은 명시한 작은 인수 사례의 로컬 관측 성공이며 최종 릴리스 완료가 아니다. 모든 실제 인도 게이트는 유지한다.

실제 소스 assertion과 기록 로그를 대조한 범위:
- 모델/parser 시간·단위·보간·곡선·램프·재현성.
- 실제 broker 125kW 전이/결과/중복, 독립 RTU, drop 재전송, 100기 패킷 상한.
- 실제 60초 완전 구간 60샘플 및 SIGKILL/PUBACK 이전 outbox 동일본문 재전송. crash receiver dedup은 fixture Set이며 제품 CLI 검증으로 표현하지 않는다.
- 보고서 round2는 독립 subscriber 대조, credential non-leak, 저장 실패 후 정확히1회 publication, 옵션 없는 monitor/dispatch를 추가 증명한다. 이슈 review002가 round1을 기준으로 남긴 부족 부분을 이 범위에서 보완한다.
- web/QA.md의 실제 native Chrome 등록·25kW command·snapshot·단지 유형 장면 관측은 해당 좁은 범위만 반영. 전체 UI 인수는 완료 아님.

## 우선 보완 사항

1. browser-auth.log는 stale 표시를 12초 대기한 뒤 실패했다. AT-FRESH-01은 pending. 인증 브라우저 스크립트의 후속 다운로드·좁은 화면 assertions는 실행 성공이 확인되지 않았다. 메인 진단: Chromium offline 에뮬레이션이 이미 열린 SSE를 끊지 않아 데이터가 계속 들어온 시험 fixture 부적합이다. UI 결함으로 단정하지 않는다. 실제 proxy socket 종료/503 방식으로 browser-auth-round2.log 재시험 진행 중이며 결과를 확인하기 전 pending을 유지한다.
2. AT-CONTROL은 같은 ID expiresAt 변경, 잘못된 schema/없는 대상/수치/8KB, equal priority와 disjoint device, timeout 후 explicit stop, process restart 중 미완료 command deadline 등을 별도 명시 assertion으로 보완한다.
3. 센서 수집 중단 후 timestamp gap/no-backfill, 보존기간 지난 acked 데이터 실제 삭제, samples[] 각각의 발전기 배열 완전성을 직접 검증해야 한다.
4. 보고서 result_wait_timeout과 실제 observed timed_out의 차이는 현재 report-round2에 전용 시험이 없다. 전체 suite/build/stable는 최종 revision으로 다시 연결한다.
5. 기상 실패 fixture는 throw/키 없음/오래된/결측을 다루지만 실제 timeout 경계 시험 및 제공된 키가 있는 경우 실제 관측 조회는 별도로 남긴다. 키가 없으면 이를 사실대로 기록한다.
6. UI 풍향/드래그/확대, 제한/stop/start 동기화, 검색·선택 유지, metric 재시작, 가이드 복사/키보드 라벨, 큰 SSE, auth 오입력/세션/비노출 등 복합 항목은 미검증 부분을 남겼다.
7. k3s rollout/readiness/UI/MQTT 왕복/영속 복구/이전 버전 복원, manifest, 최종 영상/PPT는 이 검토에서 증거 없음.

## 문서 정합성

PRD1.7의 범위 변경 없이 운영 설명 정정: 런타임 기본 3001/1883과 충돌 방지 .env.example 3101/18883 구분. protocol도 같은 설명을 적용했다. 신규 package1.0.0과 과거 v2.1.0 표기를 구분하고 보고서 옵션은 선택이지만 기능·인수는 필수임을 명시했다. 최종 stable는 신규 제품 릴리스 버전으로 연결한다. PRD 기능 추가가 아니므로 불필요한 버전 증가를 하지 않았다.
