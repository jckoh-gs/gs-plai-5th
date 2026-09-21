# 시연 상태 관측기 독립 보안 검토

대상 scripts/media/observe-demo-state.py를 읽기 검토했다. 새 보안 차단 결함은 발견하지 않았다. 보안 담당은 코드·원장 변경, 원격 요청, 실제 관측기 실행·재시작 또는 네트워크 차단을 수행하지 않았다. 새 OSS/제품 runtime 변경도 없다. media 담당의 최종 격리시험 종료 후 source hash를 별도로 대조한다.

## 보호 경계

HTTP(S) loopback origin만 허용하고 실제 socket은127.0.0.1로 연결한다. proxy/DNS/redirect를 사용하지 않으며 고정 GET /api/state만 수행한다. 401/403은 고정 authorization_denied 행 후 재시도 없이 끝난다. 요청 헤더의 token은 private file에서 읽고 응답본문·오류 원문은 출력하지 않는다. 요청3초 제한은 socket timeout과 SIGALRM으로 body까지 적용하며 응답8MiB를 제한한다.

journal은 runId/원래deadline/제품버전/baseUrl을 대조하고 actual201 basis, 기존 RTU에 없는 새ID, baseline/name, UUID 및 연속 scenario run chain을 확인한다. 최초 anchor의 ID/createdAt/initialRun/name이 바뀌면 샘플을 수용하지 않는다. HTTP 후 atomic journal을 다시 읽어 진행 중 scenario 전환의 오래된 응답을 거절한다. 응답의 버전·일치 대상1개·name/run/createdAt/type/mode도 확인한다. 이 도구는 ID를 재등록하거나 복구 명령을 발행하지 않는다.

관측 출력은 UUID·고정kind/상태·숫자 weather/generator·허용 source enum과 해시로 제한한다. bool/nonfinite numeric 및 합계 overflow를 거부하고 원본 plant명·CSV·오류·API body를 기록하지 않는다. JSON 직렬화 후 현재 token 및 Bearer 패턴을 추가 검사한다. 이를 모든 미지 개인정보 탐지라고 표현하지 않는다.

최대450초와 원래 종료22:07:33.079009Z 중 이른 시간으로 wall/monotonic remaining을 계산한다. 동결21:37:33.079009Z 이후에도 읽기 관측은 가능하나 쓰기 권한을 부여하지 않는다. output은 기존 artifact 부모에서 symlink를 거부하고 exclusive 생성하므로 과거 출력을 이번 실행으로 재사용하지 않는다. 종료행과 stdout 모두 recorderTerminalConfirmed=false다. exit0도 최소샘플/인증거절없음/마감미도달의 제한된 관측 종료일 뿐 녹화완료·전체기간무오류·기능인수 성공이 아니다. unavailable 행과 샘플 개수를 함께 읽어야 한다.

## 잔여 한계

config와 private journal은 신뢰된 동일 사용자 파일이며 actual201 basis/transition metadata는 암호학적 서명되지 않는다. run chain 검증은 존재/연속성 검사이고 모든 transition 시각의 독립 서버 출처를 증명하지 않는다. config origin은 loopback 경계이며 동일사용자의 다른 로컬 서비스나 파일변조 공격을 격리하는 sandbox가 아니다. read/stat/symlink 검사 뒤 악의적 동시교체 경쟁은 남는다. 숨은 기상 입력 복구나 recorder lifecycle 종료는 이 read-only 관측기로 입증할 수 없다.

파일 읽기/쓰기와 마지막 deadline검사·실제종료는 OS 수준 원자적 시간 보장이 아니므로 deadline-command.py 외부 wrapper를 유지한다. SIGALRM은 Python main thread/Unix 실행을 전제하며 내부 http.client socket 접근은 사용 runtime 호환성 시험 범위로 확인해야 한다. 원격/관측 오류 뒤 재접속은 읽기만 반복하며, clean-session MQTT 전체과거수신이나 중단된 AI 세션 부활 보장은 제공하지 않는다.

## 출처

초기 검토 UTC 2026-09-21T19:32:31.380634+00:00

source SHA256 `7f9e3656821859d77a2c9cb42c1f3f428221119a28d39c56509b1638fd6b78cc`

## 최종 시험 후 동일 소스 대조

media 담당 handle17616 terminal0 및 [11개 최종 시험 로그](../../artifacts/checkpoints/demo-state-observer-preparation/tests-final.log)를 확인했다. 완료 후 helper SHA256을 다시 계산하여 초기 검토7f9e3656821859d77a2c9cb42c1f3f428221119a28d39c56509b1638fd6b78cc와 동일함을 확인했다. 초기 EOF 실패와 중간10개 통과 이력은 보존된다. 담당이 별도 production CLI를 격리 loopback503/회복 대상으로 실행한92454/exit0 근거는 [준비 폴더](../../artifacts/checkpoints/demo-state-observer-preparation/)의 cli-result.json 및 actual-loopback-observations.jsonl에 있다. 보안 담당이 해당 실행을 직접 수행하거나 실제 main에 연결한 것은 아니다. 이 결과는 녹화 완료 또는 실제 main 무중단 관측 주장이 아니다.
