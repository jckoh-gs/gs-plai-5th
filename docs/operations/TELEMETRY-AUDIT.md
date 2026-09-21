# RTU별 추가 관찰 v1

제품1.2.0/PRD1.9의 MQTT 계약 검증을 보강하는 로컬 읽기 전용 도구다. 제품 기능이나 MQTT 계약을 바꾸지 않고 신규 의존성도 추가하지 않는다. 기존 primary soak와 connection supervisor는 그대로 실행한다.

`node scripts/telemetry-audit-monitor.mjs`는 run.json의 인증 API에서 최초 RTU/발전기 ID 목록을 읽고 실제 MQTT telemetry만 구독한다. 배포·제어·DB 변경 요청은 하지 않는다. 기본 종료는 기존 freezeAt이며 `TELEMETRY_AUDIT_SECONDS`를 지정해도 동결 이후로 연장하지 않는다. 새 출력 디렉터리가 이미 있으면 중단한다.

검사 범위는120,000바이트 제한, 계약2 envelope/RTU/run,1~60샘플 개수, 마지막scada/요약 일치, 모든 sample의 발전기·기상·전기·장애·단지·출처 필수필드와 타입, UTC시각, 출력합계다. 정상적인 null 전기값과 ramp-down 출력은 허용한다. 잘못된중첩JSON/타입을 거절하며 중복기록은최대10,000개만 보존한다. 각 실행은 사용한 관찰기 소스2개와 SHA256을 자체 보존한다.

동일 ID/동일 raw body의 QoS1 중복은 별도 수치이고, 같은ID의 다른본문은 불변성 이상이다. sequence는 명령 결과와 공용이므로 건너뜀을 유실로 판정하지 않는다. RTU별 수신 간격/무수신시간, run전환, simulationSeconds 불연속, 최초발전기목록과 차이는 별도로 기록한다. 센서중단·seek·시나리오복원·연결중단 등 맥락을 대조해야 한다. 최초 API의 runId/현재정격과 지연 도착한 과거 샘플을 강제로 일치시키지 않는다.

`observedTwoMessagesAnd60Samples`는 수신량 범위이며 invalid수신도 포함한다. 검사통과나 완전성·유실없음·14시간 무중단을 보증하지 않는다. 구독 전 데이터, 중복기록 범위 밖의 과거전송, 실제VPP 저장 여부도 증명하지 않는다. 실행 이미지의 실제동일성은 별도 Ready-image 검증으로 연결하며 run.json의 기대image를 관측image로 주장하지 않는다.

## 실행과 재개

- 초기 pilot: `76fe80f5-6bac-4f0d-aeb1-92562b179b5f`,10:44:19Z~10:45:49Z. 강화 전 소스와 결과를 `artifacts/checkpoints/telemetry-audit`에 보존한다. 이후 강화 검증으로 소급하지 않는다.
- 강화 관찰: `54bdac4e-08dd-4b43-b623-9762b0632aa0`,10:45:56Z 시작. `artifacts/soak/telemetry-audit/2026-09-21T10-45-56-870Z-54bdac4e`에 상태·관측과 소스가 있다. 종료는 기존21:37:33Z이다.
- root의 live session5651이 최초 handle이다. 재개 시 handle 또는실제프로세스 command/start identity와 최신관측시각을 확인한다. PID만 믿거나 timeout만으로 중복 실행하지 않는다. 프로세스가 실제 종료됐다면 종료기록을 보존하고 새 디렉터리에서 시작한다. 기본MQTT 재연결은 도구내에서 수행한다.
- 연결은 supervisor가 소유하는3104/18884를 사용한다. 비밀정보 파일의 내용과 raw telemetry는 출력하지 않는다. 상태 파일은0600이다.
- 최종 동결에서 종료결과/원관측/소스를 새 immutable checkpoint로 보존한다. primary soak와 이 관찰의 시작·종료·누락범위를 각각 표시한다.

집중 및 독립 회귀11/11PASS는 `docs/issues/evidence/review-014-audit-after.log`에 있다. ISSUE-016의 수정 전 실패 증거도 보존한다. 실제 관측의 최종 판단은 그 시점의 결과로 별도 작성한다.
