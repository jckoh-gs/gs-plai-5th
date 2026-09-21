# 제품 검토 031 — 1.6 전환 중 재접속 인계

범위는 run/resume/NEXT-ACTIONS/NETWORK-RECOVERY의 현재 지시 정합성만이다. 실제 main1.6/runtime331ab9a/image4af와 복구기준1.5/ad34를 구분하고 아직1.6 전체 인수나 stable 승격을 판정하지 않는다. 원래 시작08:07:33Z·동결21:37:33Z·종료22:07:33Z는 유지된다. 원격조회/쓰기나 새 기능시험은 하지 않았다.

현재 supervisor72380/PID19942/00:58:48 시작identity가 resume의 currentObservationProcesses 및 supervisorDiagnosticUpgrade에 일치한다. 이전1.5 관측은 종료·아카이브로 기록되고 새 관측은 계획 outbox 교체 뒤 시작하도록 한다. fixture3110/95785는 완료·PID없음·포트닫힘/DB보존이며 재기동 지시가 아니다. active outbox46862의 owner/RTU/originalOffline=false/근거 경로가 candidateOperations.activeOperations에 남아 있다. 계획 Pod교체의 일시 NotReady를 신규 장애로 판정하지 않는다.

현재 backup은 검증된1.5 ad34이고 별도828805120B/b6e2 전환 전 파일은 복원미검증이라고 명시한다. 실제1.6 deployment와 fallback의 이미지가 다르다는 사실을 숨기지 않는다. 중단 시 실제동작·원래ID·경로·소유프로세스를 대조하라는 재개 지시가 있으며 임의 apply/새rig/새명령 재전송을 요구하지 않는다.

최소 정리 권고:

- run.deployment.status와 resume.remainingInOrder 첫 항목은 아직 “root connection activation/activates one supervisor”라고 한다. 이미72380이 verified-active이므로 “기존72380 유지·실제identity 대조”로 바꾸면 중복 감독기 기동 오해를 줄인다.
- NEXT 첫 문단/검증 다음순서는 MQTT를 아직 남은 단계로 쓴다. resume.candidateOperations의 완료 MQTT125/error0 기록과 맞춰 완료한 단계를 읽고 outbox46862부터 이어가도록 고치면 반복 제어를 예방한다.
- NETWORK의15:34 사건 문단은 당시 helper가 “로컬 개선/검증중”이라 표현한다. 뒤의 로컬완료 및 NEXT의 실제round2 결과와 구분해 “당시”라고 표시하고 최신 근거로 연결하면 충분하다. 원인미확정·과거partial 보존 문장은 유지한다.

위는 작동 중 작업의 빠른 상태변화에 따른 인계 문구 보완이며 runtime 결함이나 재배포 필요라는 뜻이 아니다. 구버전 핸들/전환 전 백업을 현재로 오인하게 하는 별도 중대한 모순은 찾지 못했다. REVIEW031만 작성했고 원장은 메인이 갱신한다. 최종복원·미디어·시간·전체목표 인수는 별도다.

후속 문구 확인(2026-09-21T16:04:46Z): run.status는 계획outbox 후 actual1.6Ready/원래5설정정상/감독기재접속으로, resume 첫단계는 완료UI/API/MQTT/outbox와 기존활성감독기 유지 뒤 새snapshot·복원으로 수정됐다. NEXT에도 완료MQTT/outbox와16:03:59Z 시작 primary8363/PID21356·audit4110/PID21357, 기존supervisor72380/PID19942/00:58:48이 일치한다. NETWORK는 당시 개선검증중이었다는 과거형과 후속실제round2 링크로 구분했다. 위 세 지적은 해소됐다. 이 읽기확인은 신규관측 활성화만 의미하며 초기0메시지를 수신완료로 해석하지 않는다. 새백업/복원과 전체인수는 아직별도다.
