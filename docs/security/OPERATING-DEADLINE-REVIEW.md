# 운영 마감·프로세스 소유권 독립 검토

범위: verify-release.mjs, deadline-command.py, media-deadline.cjs, record-demo.cjs, build-deck.mjs. 실제 클러스터 변경·녹화·배포 없이 소스 및 격리 fixture를 검토했다. 앱 runtime·OSS·lock 변경은 없어 npm/이미지 재검사는 하지 않았다.

발견 및 조치:

- 미디어 감시기가 reaped worker PID를 다시 신호 대상으로 삼는 경계를 보고했다. 담당은 종료 이벤트에서 신호를 없애고 birth/command/ancestry를 매 신호 직전에 재확인하도록 수정했다. 소유권 불명확 시 종료를 생략한다. 사용자 공간 ps→kill 사이 TOCTOU와 초 단위 lstart 식별의 한계는 남으며, 모든 프로세스 종료나 PID 재사용의 절대 방지를 주장하지 않는다.
- 초기 Python 래퍼의 32MiB 제한은 종료 후 검사여서 실행 중 임시 디스크 사용량이 제한되지 않았다. 메인이 stdout/stderr streaming 합산 제한으로 수정했으며, 과다 출력이 실행 중 중단되고 원문을 내보내지 않는 시험을 독립 재통과했다.
- 초기 래퍼가 부모 exit0 뒤 같은 그룹 자식을 남기는 문제를 격리 재현했다: 0.3초 예산 래퍼가 약0.053초에 성공 반환했으나 자식은 1초 뒤 파일을 썼다. 원본 재현은 evidence/deadline-wrapper-background-initial-review.json에 보존한다. 메인은 leader를 WNOWAIT 상태로 유지해 PID가 재사용되기 전에 잔여 그룹 종료 후 reap하는 방식으로 수정했다. 최신 background-success 회귀시험에서 자식의 후속 marker 생성이 차단됨을 독립 확인했다.
- 수정 래퍼 초기 독립 실행에서 정상 종료 경로 killpg의 EPERM이 처리되지 않고 traceback으로 재발한 것을 보고했다. 이 중간 실패 로그는 operating-deadline-wrapper-initial-eprem-tests.txt로 보존했다. 수정 후 bounded ps pgid/stat로 live member가 없을 때만 진행하고, 소유 그룹 정리가 불확실하면 성공 출력을 내지 않는 것을 읽기 검토했다. 최종 래퍼 6/6 시험이 독립 통과해 이 결함은 해결 처리한다.
- SIGTERM 시 Python 기본 동작이 finally를 건너뛰는 가능성도 메인에 전달했다. 메인이 handled interruption으로 바꾼 뒤 독립 SIGTERM fixture에서 exit130, 비밀 fixture 출력 억제, 자식의 후속 marker 미생성을 확인했다(evidence/deadline-wrapper-sigterm-review.json). SIGKILL·호스트 정지·별도 세션으로 이탈한 자식은 정리를 보장할 수 없다.

미디어 및 release boundary 격리 시험 12/12를 독립 재실행했다(evidence/operating-deadline-media-review-tests.txt). 최종 proof는 freeze/deadline 및 영상·릴리스 binding 검사를 유지하며 visualReview/claimsReview는 pending으로 생성된다. 이 로컬 시험은 최종 영상·슬라이드 제작·육안 검증을 대신하지 않는다.

명시적 범위: --rehearsal은 사용자에게 전달된 소스를 실행 종료 후에도 재생성하기 위한 운영자 기능이다. 기존 run deadline 뒤 실행 가능하더라도 rehearsal 표시와 별도 출력으로 구분되며 최종 성공 증거로 사용할 수 없다. 메인 자동 실행의 14시간 종료 정책을 연장하지 않는다. GRID_MEDIA_WORKER는 신뢰된 로컬 실행 환경의 내부 옵션이며 인증 경계가 아니다. verify-release의 git show/로컬 동기 파일 I/O까지 절대시간으로 중단하려면 외부 deadline-command 래퍼가 필요하다. kubectl 클라이언트 종료는 원격 작업 취소·롤백의 증명이 아니다. 성공 출력은 원문 그대로 전달하는 기능이므로 비밀을 출력하지 않는 검증 도구만 사용해야 하며, 임의 성공 명령의 비밀 제거 필터라고 주장하지 않는다.

최종 독립 결과: 미디어/release 경계 12/12, 래퍼 6/6 및 별도 SIGTERM 재현 1건 통과. 운영 소스의 발견된 수정 항목은 해결됐다. 실제 원격 작업이나 최종 미디어 제작을 실행하지 않았고 성공 증거를 대체하지 않는다.
