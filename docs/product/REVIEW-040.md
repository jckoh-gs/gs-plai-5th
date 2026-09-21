# REVIEW-040 — NFR-08 연동 계약 정정 제안 검토

검토 범위: `docs/operations/NFR08-CONTRACT-REVIEW-20260922.md`, `NFR08-CONTRACT-FIXTURES-20260922.json`, 현재 `scripts/client-message.js`, `scripts/vpp-client.js`, `docs/protocol.md`와 PRD 부록 A. 선행 증거의 reviewedHead는 f9147d1이다. 이번 검토는 읽기 및 문서 제안만이며 새 브로커 연결·발행·RTU 생성·시험 재실행은 하지 않았다.

## 판정

세 항목 모두 NFR-08의 코드·문서·샘플·시험 일치와 기존 RTU 상태 관측을 복구하는 정정이 필요하다. 제품1.7.1/PRD1.15/IDEA012 개정1의 작은 후속 패치로 채택할 것을 권고한다. 아직 미채택이며 버전·요구사항·코드는 변경하지 않았다. 기존 요구를 줄이거나 구현하지 않은 레거시 기능을 추가할 이유는 없다.

1. 독립 protocol quickstart는 `.env` 준비 없이 Compose 브로커18883과 bare 앱 기본1883을 조합한다. 순수 fixture는 이 설정 불일치를 입증하지만 새 환경의 실제 실행 성공/실패까지 시험한 증거는 아니다. `npm ci`, 기존 `.env`가 없을 때만 예제 복사, broker/build/start를 안내하고 예제 적용 결과 UI3101/MQTT18883과 bare 기본3001/1883을 구분한다. 기존 파일을 덮어쓰지 않는다. **PRD 부록 A-1/A-2에도 같은 빠진 준비와 포트 안내가 있으므로 동시에 정정해야 한다.**
2. monitor는 RTU status의 `online`을 버린다. true/false 두 입력의 최종 좁혀진 객체가 동일하다는 순수 fixture 및 그 객체를 출력하는 CLI 소스가 직접 근거다. status 메시지의 strictly boolean 값을 보존하고 없거나 비boolean이면 null로 표현한다. false를 falsy 처리로 잃지 않아야 한다. `status`는 명령 생명주기용으로 유지한다. 다른 메시지 종류의 online은 null/미노출로 명확히 제한하고 wire payload·서버·보고서 스키마는 바꾸지 않는다. retained online/LWT offline은 마지막 관측 상태이며 실시간 건강 보증으로 설명하지 않는다.
3. protocol의 v1 명령ID 보존/`legacy_accepted` 약속은 greenfield 저장소·제어기·client allowlist와 맞지 않는다. **PRD 부록1140행에도 동일 문장이 있다.** 이 문장만 정정하고 현재 greenfield 명령 중복방지·재시작 복원·실제시간 만료 및 현재 telemetry 요약필드 호환 계약은 그대로 보존한다. 사용자의 기존 구현 무시 지시와 일치하도록 과거 v1 DB 마이그레이션을 지원한다고 쓰지 않는다. 이미 검증한 이번 프로젝트 버전 간 동일 스냅샷 복원과는 별개다.

## 최소 수락 근거

- 가이드 및 PRD 부록의 명령·포트·환경 준비가 일치하고, 기존 `.env` 보존이 확인되어야 한다. 격리된 깨끗한 환경에서 안내대로 실행해 예제 브로커와 앱이 실제 연결되는 근거가 필요하다. 운영의 현재 포트를 점유하거나 현재 `.env`를 바꾸지 않는다.
- parser에 retained true/false, missing/null/string/number online 경계를 검증하고 false 보존을 명시한다. 실제 격리 브로커에서 monitor stdout의 online/offline 구분을 확인하되 수동 false 발행은 실제 LWT라고 부르지 않는다. LWT를 주장하려면 실제 비정상 연결 종료 근거가 필요하다.
- 기존 RTU/topic 일치, 메시지 크기 제한, 비밀 제거, retained 명령결과 거부, command-status/dispatch의 실제 종결 판정·보고서 의미가 보존되어야 한다. monitor 연결상태가 명령 completed로 해석되어서는 안 된다.
- protocol·PRD 부록·클라이언트의 허용 상태와 실제 서버 계약을 대조한다. `legacy_accepted` 약속 제거를 기존 명령 복원 요건 제거로 넓히지 않는다.
- 변경된 배포 파일의 exact source/image 바인딩 및 기존 main/현재·하위 복원/백업·정리/불변 manifest 승격 게이트는 그대로 적용한다. 순수 fixture나 소스 검토만으로 배포 인수를 통과시키지 않는다.

## 위험과 경계

CLI 출력에 online이 추가되는 작은 호환 변화는 명시해야 한다. 객체 전체 payload 출력으로 대체하면 비밀/잡음 노출 경계가 무너질 수 있으므로 현재 allowlist를 유지한다. `.env` 예제 복사는 사용자의 기존 설정을 덮어쓰면 안 된다. 새 OSS·DB·서버 제어·UI·MQTT wire schema 변경은 필요하지 않다.

stable1.7/runtime d98d3c4/백업1cab 및 기존 불변 checkpoint를 보존한다. 메인의 첫1시간 관찰17:45:54Z 기록 전 교체하지 않는 조건을 유지한다. 원래 동결21:37:33Z/종료22:07:33Z와 최종 영상·PPT·인도 게이트는 불변이며 이 검토는 전체 목표 완료가 아니다.
