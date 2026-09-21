# REVIEW-044 — 후보1.7.1 실제 main 중간 인수

완료된 candidate-40b9ed8 main-regression/post-rollout의 요약뿐 아니라 참조된13개 보고서를 직접 읽어 PASS와 범위를 대조했다. main-mqtt/main-client-online, exactimage provenance/pre-deployment 및79개 app 단위 로그, REVIEW041 로컬 근거도 대조했다. 진행 중 outbox 출력은 판단에 사용하지 않았다. 추가 원격 작업이나 시험은 없다.

실제main은40b9ed8/이미지234ec56/제품1.7.1이다. post-rollout이 읽은15개 원격 파일 해시를 git show40b9ed8의 바이트로 재계산해 모두 일치했다. 실제 제공JS154fe2de/CSS51137c와 protocol HTTP200·22437B·SHA07295bdb가 exactimage/로컬 근거와 연결된다. 따라서 수정된 env/포트/online/레거시 계약 문서가 로컬에만 남은 상태는 아니다. 원래5단지 canonical 설정·runId/시나리오 보존, 인증, 실제UI/SSE·preview·export·이벤트시각·명령목록 읽기의 완료 범위를 확인했다. proxy/응답 오류fixture는 원격 자체 장애로 표현하지 않는다.

MQTT는 인증된 실제main에서125kW/actual125/error0, accepted→executing→completed, duplicate 확인과60sample/99970B 프레임을 기록했다. 정확 커밋의 공급 monitor는 같은 실제 브로커에서 online true/status null을 출력하고exit0·Pod불변을 확인했다. 이main monitor 근거는 retain bit를 노출하지 않으므로 retained delivery나 실제main LWT 검증이 아니다. retained online/실제 비정상 단절 offline은 별도 격리 exactimage client-status 통합 근거에만 해당한다.

exactimage79개와 workstation317개는 범위가 다르며 합산하지 않는다. provenance의 deployed:false는17:27 빌드 당시 이력이다.17:53 post-rollout 실제Ready와 모순되는 현재판정으로 사용하지 않는다. 보안의 기존4matches/2CVEs를 취약점0으로 표현하지 않는다.

판정: AT01~03의 로컬 판정을 보존하고 원격 공급가이드/monitor 보강 근거를 추가할 수 있다. AT04는 실제main 일부 통과의 partial을 유지한다. FR-VPP-STATUS01 역시 최종 기능/배포/복원 승격 전 partial이다. 실제 outbox 종결·정상화, 정상백업 exactSHA, 같은 snapshot 현재1.7.1/하위1.7 복원 및 양rig 정리, 독립검토/새 불변manifest가 남았다. stable1.7/1cab fallback은 유지한다. 최종 영상/PPT·원래동결/종료·인도 완료를 주장하지 않는다.
