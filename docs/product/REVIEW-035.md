# 제품 검토 035 — 1.7 명령 목록 로컬 인수

UI13/AT-COMMAND-LIST01의후보로컬증거를대조했다. actualbundle154fe2de…18dfc, 저장UI ffbb204d…fa592/helper18e353fb…f026 및시험소스SHA를직접검증했다. source의조회는GET전용·redirect거절·인증401경로유지이며response.json까지abort신호를공유한다. 완료후2초에다음poll을예약하고해제시timer/deadline/controller를정리한다. 서버/DB/API/export/POSTreceipt변경은범위밖이다.

독립browser round1의8그룹은실제기존expired행의순서/출처/상태와브라우저성공시각,통제503시기존행·시각보존/항상표시되는목록경고,실제GET복귀,최초loading/failure/empty구분,지연A→B불혼입을검증한다. 실제브라우저header15,482ms·body15,502ms 대기상한,각요청1회/body maxActive1/소유연결close1 및unmount취소도기록했다. API쓰기와setup쓰기모두0이다. 이는브라우저응답/소유loopbackfixture이며원격실서비스장애를주장하지않는다.

보충스크린샷검토가terminalPASS이고 좁은화면 이미지를직접열어목록특정HTTP503경고·이전값안내·마지막성공의브라우저시각설명·SSE와별개설명을읽었다. 테이블은기존가로스크롤범위이며경고문구는잘리지않는다. 전체화면/모든행을각각육안검수했다는주장은아니다.

전체302PASS를로그에서확인했고이전회차/선택검사를합산하지않는다. 실제broker통합/고급은별도완료로그다. auth/event의완료결과는있으나추가form/receipt/export/preview회귀는메인진행중이므로전체회귀집계PASS를미리기록하지않는다. 정확이미지/k3s/현재1.7·하위1.6동일백업복원은아직없다.

판정: AT01~03은위로컬증거범위에서verified_local. UI13과AT04는partial로두어정확이미지·원격·복원·남은기존회귀를기다린다. 마지막성공시각은서버이벤트시각이아니다. fallback1.6/원래동결·종료·최종영상/PPT·인도조건은유지한다. REVIEW035와신규5행의한정인수만수정했다.
