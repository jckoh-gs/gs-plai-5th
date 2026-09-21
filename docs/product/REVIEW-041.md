# REVIEW-041 — 제품1.7.1 로컬 인수 독립 검토

PRD1.15/IDEA012 및 candidate-1.7.1-local의 실제 로그·JSON·실행 스크립트·parser 시험을 읽었다. 추가 실행/원격 변경은 없으며 실제main은 여전히1.7이다.

## 판정과 범위

- AT-VPP-STATUS-01-01: verified_local. 317/317 전체 시험 로그와 client-security 시험 소스에서 strict boolean true/false, retained 양값, 비boolean/누락 null, RTU 경계, 크기 제한, 비밀 제거, 다른 메시지의 online null 및 retained 명령결과 거부를 대조했다.
- AT-VPP-STATUS-01-02: verified_local. 실제 격리 브로커의 이미 발행된 online 이후 monitor를 시작하고 RTU 연결 stream.destroy/reconnectPeriod0으로 실제 LWT를 발생시킨 소스를 확인했다. stdout은 online true/false를 구분하고 LWT timestamp는 null이다. 다른 RTU connected, 명령발행0, monitor SIGTERM exit0 근거가 있다. 수동 false 발행 fixture가 아니다.
- AT-VPP-STATUS-01-03: verified_local, 범위 제한 명시. fresh private source/dependencies/env/DB/build와 실제 guide serving·3demoRTU 브로커 연결을 검증했다. 기존 소유 브로커18883을 no-recreate로 재사용했으므로 새 브로커 설치 증거는 아니다. 점유된3101을 보존하여 명시적PORT3112로 실행했고 예제3101/18883 값은 별도 확인했다. npm start와 같은 node 명령을 직접 실행해 종료 소유권을 확보했다. 이 제한은 깨끗한 실행 구성에서 예제 브로커 연결이라는 요구를 충족하며, 문자 그대로 무설정 전체부트스트랩을 재현했다고 주장하지 않는다.
- AT-VPP-STATUS-01-04: partial. 단위317/317, 실제 broker integration/advanced, dispatch report/client-security 회귀 로그가 통과했다. 정확 후보 이미지 k3s UI/MQTT/outbox, 동일 백업 현재1.7.1/하위1.7 복원·정리 및 새 불변 checkpoint는 아직 없다. 로컬 회귀를 원격 승격으로 확대하지 않는다.

## 문서 및 실패 이력

protocol과 PRD 부록은 동일한 conditional `.env` 존재/심볼릭링크 guard와 예제/기본 포트 구분을 갖는다. 현재 명령 중복방지·재시작/검증 버전 복원은 유지하면서 별도 v1 legacy_accepted 지원을 약속하지 않는다. 첫3101 점유 preflight 및 macOS cp-n skip exit1의 두 실패는 quickstart-attempts.json에 남아 있다. 최신 conditional guard의 absent/existing 양 실행exit0와 원본환경 불변·소유포트 종료가 기록되었다. 이전 실패를 삭제하거나 성공으로 재해석하지 않았다.

## 소스 연결

client-status-source.json의4해시와 quickstart.json의6해시를 현재 파일에 직접 재계산하여 모두 일치했다. 핵심 helper SHA256은 ecb5f3b3fcdf74fa5a3d352da33856b47116eb27b4eb91b039fa58b39e12b53f, vpp-client는762cb18072e5db77b48199681a266b520ee08b12986efd8795356e4b877911cd, protocol은07295bdbc14613aa87a3890ee32439e715009ca2310859ad2dc18259d4734709다. 검토한 tests/client-security.test.js는4bbb1597054f3e8e897193508f17d1d3e74835d12cfc200482fcaaaae791bb3d다. 실행 당시 source 기록과 현재 바이트의 일치이며 아직 OCI identity 증거는 아니다.

로컬 범위 차단사항은 없다. root frontend/build summary는 별도 후속이며 전체 회귀 수를 중복 합산하지 않는다. stable1.7/1cab, 첫1시간 관찰 후 교체 조건, 원래 동결21:37:33Z/종료22:07:33Z, 최종 영상/PPT/인도 미완료를 유지한다.
