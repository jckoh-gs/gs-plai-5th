# 제품 검토020 — IDEA008 로컬 인수 독립 대조

PRD1.11 FR-CONTROL-FORM01/UI11/AT01~06, REVIEW019, Target/helper, browser round2 result·REVIEW 및 correction-delta를 대조했다. 결과: FR/UI의로컬범위와AT01~05는충족. AT06은기존기능로컬회귀부분만완료이며exact후보k3s/backuprestore/stable은미완료다. 현재원격1.3을1.4로표현하면안된다.

- AT01:6개잘못된범위×버튼/Enter각제출,POST증가0/fieldfocus/aria-invalid·describedby·오류문구를실제browser assertion으로확인. native속성만의검증이아니다.
- AT02:각min/max/소수는boundary-only로정확히구분됐다.5필드빈칸/overflow입력차단과실제요청25.5/.125/3.25/50.5보존을확인.모든min/max명령완료를주장하지않는다.
- AT03:1e20과확장연도300000000000 입력POST0,예외0.정상30초·0초expired와별도correction-delta의0.25초→250ms actualpayload 확인.후자는accepted까지만관측하며completed를합성하지않았다.
- AT04:round2스크립트의invalid전후commandId목록deepEqual,fieldfocus/error연결/narrow/RTU전환assertion이있다.별도delta가동일폼잘못된날짜→30.5초수정→Enter→25.25kWcompleted를증명해RTU전환초기화만으로대신하지않았다.화면육안은메인의desktop/narrow검토를범위구분해참조한다.
- AT05:실제localMQTT receipts에서accepted/executing/completed;RESTpoll이executing을놓친것과구분했다.target0/on유지,가용100/rated1000에target200 timed_out,정격초과1001 rejected가관측됐다.
- AT06:local240tests/독립3input시험/build/actualbrokerintegrationadvanced 및auth/preview/export/scenario회귀기록은후보로컬증거.현재OCIbuild/scan진행이나파일존재로원격인수를통과시키지않는다.

Source/servedasset: UI web/src.jsx SHA d44ecb94…93227, command-form ba71bfda…3b67e,served index-BndL-kls.js SHA37a5224b…d5bce를round2와correction-delta가동일하게기록한다.과거실패harness로그는보존됐으며REST단계순간누락·broker대기조기판정을수정한시험후성공으로구분한다.현재helper/source와해당계약에추가누락/거짓PASS를발견하지못했다.

기존연속제출이각각새commandId를만드는동작은이번입력범위·날짜오류수정밖이며중복방지추가/검증을주장하지않는다.서버동일ID멱등성과별개다.이검토는REVIEW020만작성하며acceptance/PRD/run/resume/소스/git/배포/handle을변경하지않았다.전체목표/14시간/최종영상PPT게이트는계속미완료다.
