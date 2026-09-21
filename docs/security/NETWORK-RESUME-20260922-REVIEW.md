# 재연결 후 작업 재개 독립 보안 검토 — 2026-09-22 KST

읽기 검토와 격리 시험에서 새로 입증된 차단 결함은 발견하지 않았다. 이는 임의 네트워크 장애 후 AI 작업의 무조건적 지속 보장이 아니다. 원격 명령, 실제 네트워크 차단, supervisor/관측기 종료, 원장·코드 변경은 수행하지 않았다. 실제 heartbeat 설정·현재 실행 생존·원격 상태 확인은 메인 담당의 별도 검증 범위다.

## 확인한 경계

resume-status는 git/kubectl 조회와 인증 GET만 수행하고 로컬0600 상태 파일을 원자 교체한다. 배포·제어·백업을 호출하지 않는다. resume-policy는 마감→동결→연결→배포 identity→API→관측 원장 순서로 판단한다. 원래 freeze2026-09-21T21:37:33.079009Z와 deadline22:07:33.079009Z를 재연결 시 새로 계산하거나 연장하지 않는다. 동결/마감 action은 작업 지시 분류이며 그 자체가 연결 불능에서 복원 쓰기를 허용하는 것은 아니다.

supervisor는 단일 lock의 PID+시작 identity를 대조하며 불명확한 lock은 닫힌 상태로 실패한다. 원격 이미지/Ready, 인증 API와 MQTT 연결을 확인한 뒤 회복을 기록한다. 소유 ChildProcess forward만 종료하며 점유된 타인 포트는 차단한다. 재시도는 로컬 연결 복구이며 원격 배포/제어/복원 재실행이 아니다. 진단은 고정 분류·HTTP 숫자·시각으로 제한되고 kubectl stderr/API 본문/토큰을 기록하지 않는다.

NEXT-ACTIONS와 NETWORK-RECOVERY는 응답 유실 시 journal·고유 리소스·담당 핸들·종료 영수증을 먼저 대조하고 새 commandId나 완료된 배포/복원을 반복하지 않도록 명시한다. 백업은 partial과 완료 파일을 구분하며 완료 파일 재전송은 새 snapshot 생성과 다르다. 현재 코드가 범용 exactly-once 작업 스케줄러를 제공하는 것은 아니므로 이 재조정 절차를 건너뛰면 안 된다.

## 격리 검증과 잔여 한계

`node --test tests/resume-policy.test.js tests/observation-bindings.test.js tests/security-observation-bindings.test.js tests/supervisor.test.js tests/supervisor-diagnostics.test.js`를 실행하여32/32 PASS, exit0을 확인했다. fake kubectl 및 loopback 서버로 재연결, 다른 이미지 차단, 타인 포트 보존, singleton, 마감, 잘못된/지연 응답 진단과 비밀 비노출을 검증했다. 실제 원격 장애 재현이나 백업 재실행은 아니다.

관측 metadata의 일치는 프로세스 생존 증거가 아니며 저장된 status는 오래될 수 있다. 실제 PID·시작 identity·소유 명령/파일·담당 handle과 최신 영수증 확인이 필요하다. 초 단위 ps identity와 신호 사이 OS 경쟁을 절대 배제한다고 주장하지 않는다. supervisor의 commandsAllowed는 권한이 아니며 재개 전 현재 시간을 다시 확인해야 한다. 읽기 도중 상태가 바뀔 수 있으므로 resume 결과가 이후 쓰기에 대한 원자적 잠금도 아니다.

heartbeat는 기존 세션을 깨우는 수단이며 Mac/Codex 종료나 서비스 불가 중 실행을 보장하지 않는다. clean-session MQTT 관측 재접속은 모든 과거 메시지 재수신 보장이 아니다. 호스트 명령 timeout은 원격 작업 취소 증거가 아니며 기존 backup cancellation 문서의 kernel I/O·강제종료·metadata 단계 한계는 유지한다. 다음 변경 권고는 새 기능보다 기존 재조정 절차·시각/소유 증거의 유지이며, 이번 검토에서 코드 수정을 요구하는 새 재현 결함은 없다.

## 검토 소스 SHA256

검토 기록 UTC 2026-09-21T18:25:43.670532+00:00

- `scripts/resume-status.mjs`: `f69e4b9821d84ae640f3c603646664ccb56c6d467cf15742755154e8f81d29f5`
- `scripts/resume-policy.mjs`: `6c5d5eca4f9c41cddba39f804722ace63762ec3b4c84e83c76766766eb6dfbed`
- `scripts/connection-supervisor.mjs`: `07266601ae421fbb2ceaf3a2370b5f891fb94005f4ae24cdf3920e6ac3845ab8`
- `scripts/observation-bindings.mjs`: `8970fb2793b0aa3d92f3871ce0340ffc7cd7cc5bc21246e18edf0afa31ebed9e`
- `docs/operations/NETWORK-RECOVERY.md`: `abe703bc136cb41f1ddd80e5e68f4510ccd9a1dacb94c969a1e05ef5a242fd52`
- `docs/operations/NEXT-ACTIONS.md`: `80899be9044c2ffb3c51c8626231f39a67eb6e68ab19d32b36e6aaa9c2f99896`
