# 제품 검토 025 — 1.5 로컬 접수 확인 인수

PRD1.12의 신규8개 항목만 검토했다. UI-12 및 AT-COMMAND-RECEIPT-01의1~5는 로컬 검증 범위에서 충족한다. FR 집계와6번의 실제 후보 k3s/정확한 이미지·백업·현재/하위 복원은 아직 부분 인수다. stable1.4와 원래 일정·최종 미디어 조건은 그대로다.

command-receipts-1.5-browser-round1의14개 case/38개 POST 관측과 스크립트 assertion을 읽었다. 실제 로컬 서버 accepted/expired/rejected, POST 확정 후 화면조회 실패, 저장 후 응답차단과 미도달 차단, 원래ID 읽기 확인, 미발견/조회실패의 미확정 유지, A pending 중 B 허용 및 A 재마운트 중복방지, 모든 REST 제어 경로를 확인한다.38은 브라우저에서 관측한 POST 요청 수이며 synthetic 미도달도 포함하므로38개 서버 접수라는 뜻이 아니다. 응답 차단/잘못된ID·상태는 통제된 fixture이지 실제 운영 장애가 아니다.

늦은 읽기 결과가 새 receipt를 덮어쓰지 않고 같은 행 중복조회가1회다. 이전 미확정 안내,20개 상한·접힌19개 이력·오래된 항목 제외,390px 가로넘침 없음, reload 뒤 메모리receipt0/서버이력수 유지 assertion이 있다. cleanup은 기존 설정 불변과 소유2개RTU의 장애 해제/정상 재생/제어 설정 복구를 기록한다. 이는 설정 보존이며 시간에 따라 변하는 모델 궤적의 불변 주장이 아니다.

POST timeout은 실제 브라우저15,045ms 관측이다. 확인 GET 및 후속 /state의15초 정책은 같은 request helper의 기본값과 주입15ms 지연본문 단위 경계로 검증했다. 실제 GET을15초 기다린 브라우저 증거로 확대하지 않는다. 단위검사는 identity/action/source/알려진 상태 일치, 확정값 보존, 더 오래된 상태와 제외된 receipt의 부활 방지, 후속 GET 종료 전 pending 해제,401 경로 및 원문 오류 비노출도 다룬다.

command-form-1.5-browser-round1은44검사/5POST 및 실제 broker accepted→executing→completed, 가용초과 timed_out,0초 expired를 기록한다. 기존2개RTU 설정 불변,0목표/소수/입력범위·날짜 오류/키보드 경로는 이 별도 증거와 assertion 범위로 대조했다. receipt 시험 하나가 이 모든 동특성을 새로 증명한 것으로 합치지 않는다.

기존 auth/preview/export/scenario 회귀 summary는14:24:11Z에4개 exit0로 완결됐다. 각 결과와 summary의 파일 SHA를 직접 대조했다. 실제 제공된 JS SHA는 b6c1288921d9fa2e67e284cdbf9596f3b81abeae6625f9500acd07970f2e1dda, UI 소스는 e4fa5c0a31fcc534f9ab04d6e73d08054dd0a313d1a6c08565f08943a31c111c, helper는576b56a4799aef06ec70ff3b0db124744bd4d4d865cbdc08801a5c6262665122로 현재 파일과 같다. 후보1.5 로컬3109 근거이며 운영k3s1.5라는 뜻이 아니다.

전체 단위 round2는263/263, 통합/고급/build는 완료 로그를 확인했다. round1의261/262와 실패1개는 삭제하거나 성공으로 바꾸지 않는다. 기존 outbox VM fixture에 process.env가 빠진 경계는 fakeenv/default/invalid-port 검사를 추가한 수정 후 선택6개와 전체263개로 재검증됐다. 개별11receipt보안·39binder·5fixture 검사는263에 포함되므로 더해 세지 않는다.

인수 원장의 신규8개만 수정했다. UI와1~5는 verified_local, FR과6은 partial로 두고 현재/하위 복원·원격 이미지 및 stable 승격 근거가 남았음을 명시했다. 이번 검토는 파일 읽기/해시 대조만 수행했으며 기능 재시험이나 원격 변경을 하지 않았다. 최종 영상/PPT·전체 시간 게이트는 계속 미완료다.
