# 제품 검토 003

기준 revision/검토 파일 SHA 및 각 증거 SHA는 acceptance.json 참조. 142개 중 local36, partial26, 이전 명령pass4, pending76. 완전한 최종 릴리스 판정이 아니다.

추가 직접 증거: unit round3 53pass; 독립 control/retention11pass 및 MQTT invalid8case; sensor gap/no-backfill;46초 result_wait_timeout; 온라인 backup API 별도 DB 복원/실제 telemetry; remote correct-token/SSE/guide/narrow viewport; k3s 재시작 후 plant/scenario/command 유지; 실제 MQTT ACL. 브라우저 첫 offline fixture 오류는 실제 proxy 단절 시험 PASS로 보완했다.

## 남은 우선 자동 검증

1. remote-integration.log는 검토 시 connack timeout으로 실패했다. 실제125kW dispatch/전체SCADA/명령 전이 성공을 재실행 증거로 연결해야 한다. 원격 PUBACK와 DB/outbox 재시작, 이전 정상 이미지/호환DB rollback은 아직 별도 게이트다.
2. process 재시작 시 미완료 명령 deadline: review control은 DB close/reopen은 증명하지만 같은 프로세스다. child server 종료/재기동 및 남은 timeout 경계를 직접 확인한다.
3. 이미 만료/latency 중 만료 명령이 모델을 안 바꿈, fractional startup 도중 completed 조기 발생 없음, scenario restore의 active command cancelled, samples[] 모든 발전기 포함, 원문55행 TSV, hybrid total allocation을 각각 명시 assertion으로 보완한다.
4. 인증 오입력/재로그인, 토큰 URL·로그 비노출, 세션 경계. sessionStorage는 opener로 연 새 탭에 복제될 수 있으므로 '모든 새 탭은 무조건 비인증'을 가정하지 말고 실제 브라우저 세션 정책을 확인한다.
5. stale 핵심5초/복구는 remote PASS이나 최초 무수신 대기 및 연결은 열려있고 메시지만 멈춘 SSE를 별도 시험한다. 현재 socket-cut 시험만으로 두 경계를 증명하지 않았다.
6. 실제 timeout KMA fixture, 긴 SSE snapshot parse, 기상 방향→3D 방향 응답, guide복사와 keyboard focus, 제한/기동/정지→chart/table 일치, metric 누적 재시작을 남긴다. local native Chrome fault/model/curve/irradiance/seek/download 흐름은 확실히 기록된 범위만 인정했다.
7. release manifest의 실제 image/commit/PRD/DB/log hash 검증, 복원 앱의 UI 및 실제 제어 왕복, pending outbox 복원은 local backup smoke보다 넓다. 최종 video/PPT는 후반 게이트로 유지한다.

## 운영상 관찰

배포 이미지0b23c41과 현재 UI 수정 사이 차이가 remote-api.json에 명시되어 있다. 최종 QA는 같은 이미지로 갱신 후 시행해야 한다. 현재 검토로 새 제품 기능을 추가할 필요는 없다. 남은 시간은 이러한 인수 경계를 채우고 안정 이미지·복원 지점을 만드는 데 우선 사용한다.

## 같은 회차 후속 증거

remote-integration-round2.log는 새18885 tunnel을 통해 인증 MQTT125kW 실제 왕복 및 duplicate PASS. 초기 connack 실패를 이 범위에서 보완했으며 sampleCount1을60초 배치로 주장하지 않는다. browser-round2.log는 잘못된 토큰 재입력/독립 새탭 로그인/localStorage 미저장/body·URL 검사 PASS. 완전한 요청·로그·download 비노출과 config 공개 키 범위는 별도 확인을 남긴다. weather-timeout.log는 실제12.001초 AbortSignal timeout과 이전 weather/source/time 보존 PASS. 위 우선목록에서 이미 보완된 좁은 사례는 이 후속 기록을 적용한다.
