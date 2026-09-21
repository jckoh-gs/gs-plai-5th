# 제품 검토017 — 목표 명령 폼 검증 경계

현재 Target 폼(web/src.jsx)을 읽은 결과, targetKw/toleranceKw/timeoutSeconds/validSeconds/priority 입력을 모두 동일한 required/min=0 Num으로 렌더링한다. Num 기본step은any이다. 서버 Controller는 toleranceKw0.01~10000, timeoutSeconds1~3600, priority0~100을검증하므로 UI가허용한0허용오차·0timeout·priority101은전송후rejected가된다. 이는소스관찰이며이번회차브라우저재현/변경은없다. 서버안전검증은이미존재하므로잘못된제어가실행되는결함은아니다.

권고하는작은개선 하나: **일반 목표 입력 폼의 서버범위 일치**. 입력별min/max 및짧은범위hint를적용해운영자가실수로실패시험을만들지않게한다. targetKw는0이정당하고실제가용량을초과한명령은의도한timed_out시험이므로가용량으로막거나자동보정하지않는다. validSeconds에는문서에없는최대값을새로발명하지않는다. tolerance0.01~10000,timeout1~3600,priority0~100만기존서버규칙에정확히일치시킨다. 서버가소수를허용하는규칙을UI만정수로바꾸지않는다. malformed/invalid명령계약시험은기존MQTT클라이언트/시험fixture로계속가능하다.

효용: 새OSS/DB/API계약/권한/시뮬레이션변경없이일반사용자의입력오류피드백을전송전에제공. 기존preview/export/시나리오필터와중복없다. 새데이터패널이나진단추정기능보다범위가작다. 기존명시FR의서버범위와UI정합성수정으로취급할수있으며새minor버전필요여부는메인이판단한다.

최소수락: 실제브라우저에서 tolerance0/10000초과,timeout0/3600초과,priority101은HTML유효성실패및POST없음; 각경계값은통과. target0은전송가능,정격이내가용초과목표는막지않음. 서버검증을제거하지않으며기존MQTTinvalid/rejected시험유지. 유효값입력과제어완료기존흐름을확인하고표시단위/키보드동작유지. 값자동치환금지.

위험: 이도구는오류시험용이기도하므로UIinvalid요청을막는것을버그로볼수있다. 일반폼은유효명령입력,고의invalid는MQTT시험경로라는구분에메인이동의할때만채택한다. 합의가없으면보류해도현재필수기능checkpoint완료를뒤집지않는다.

현재는제안/소스관찰만이다. PRD/버전/소스/배포/운영handle변경없음.1.3정상checkpoint와원래21:37:33UTC동결·22:07:33UTC마감유지. 이외추가기능을만들필요는발견하지못했다.


## 후속 실제 브라우저 재현 · 제안 v2

메인이 로컬1.3의 실제 index-Bq6rJvbB.js(SHA256 8d61e59d833af0cea234ed17c6d61300e4b564708cfeb78f51f8a0ab2e6a5a3c)에서 경계를 재현했다. `artifacts/checkpoints/command-form-before/result.json`은 서버 범위 밖 입력들이 native validity를 통과함을 기록한다. priority101은 실제 POST 후 HTTP200/rejected로 반환되고 SCADA 제어를 실행하지 않았다. 이는 원격 k3s 시험이 아니며 서버 방어 실패도 아니다.

추가로 `validSeconds=100000000000000000000`을 입력하면 native validity는 true이나 클릭 시 `Invalid time value` 브라우저 예외가 발생하고 명령 POST는0회였다. `artifacts/checkpoints/command-expiry-before/result.json`과 화면·실행소스로 보존했다. ISSUE-021로 등록한다. 제안 v2는 기존 범위 정합성에 더해, 만료일을 ISO로 변환할 수 있는지 미리 확인하고 불가능한 입력에 사용자 피드백을 주는 범위를 포함한다. 계약에 없는 업무상 만료시간 상한을 만들거나 값을 자동 보정하지 않는다.

아직 채택/수정/배포하지 않았다. 다음 결정 시1.3 관찰 결과와 함께 검토하고 채택 전에 PRD/제품 버전을 기록한다. 기존 v1 제안과 수정 전 증거는 보존한다.
