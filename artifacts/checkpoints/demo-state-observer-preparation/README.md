# 최종 시연 읽기 전용 관측 도구 준비

`python3 scripts/deadline-command.py --timeout-seconds 365 -- python3 scripts/media/observe-demo-state.py --config <실제-final-scenes-config.json> --output <새-artifacts-출력폴더/weather-observations.jsonl> --seconds 360`

출력 부모 폴더를 먼저 준비한다. config는 실제baseUrl/tokenFile/lifecycle.registration.name/private journal을 포함해야 한다. 토큰과journal은repository의artifacts/private아래일반파일이며symlink경로는거절한다. output은새artifacts파일만exclusive생성하며기존파일을덮어쓰지않는다. config나journal본문/CSV/토큰/전체state를출력하지않는다. actual201증거이전에는waiting행만기록하고이름검색으로RTU를추정하지않는다.

대상은actual201 ownedID/name/createdAt/type와원래baseline run에고정한다. run변경은journal의확인된연속scenario transition과현재ownedrun이일치할때만허용한다. 일시HTTP/연결/identity오류는고정unavailable행으로남기고0.5초간격으로유한재연결한다. 401/403은고정인증거부행뒤즉시끝낸다. redirect/proxy를사용하지않으며127.0.0.1로만접속한다. HTTPS는기본인증서검증을유지한다(인증서우회없음). 각요청은SIGALRM과sockettimeout으로최대3초,전체는지정시간(최대450초)과원래run.deadlineAt중빠른시각을따른다.

출력은고유ID/runID,수치기상4개,허용출처(default/manual/kma),발전기별순서·출력·가용출력,합계,최근history의출력/가용출력만포함한다. 응답본문의임의문자열/secret은기록하지않는다. 생성된sample은HTTP200및대상/버전/수치검증이통과한경우뿐이다. 오류나waiting은sample이아니다.

종료0은관측구간동안유효sample을얻었다는뜻일뿐전체시연성공이아니다. 360초경과나verification파일존재로recorder terminal을추정하지않는다. 메인이별도로실제recorder핸들종료·정상복원·weather651.8/CSV500전후증거·영상SHA와시각을대조해야한다. 오류만있거나인증실패/원래마감도달이면CLI는0으로끝내지않는다. 원래deadline이도달하면늦은sample/완료행을쓰지않는다.

## 실제 검증

격리loopback fixture11tests가실제HTTP요청/503후복구/연결close후복구/401즉시중단/redirect거부/확인된journalrun전이/미확인run거부/actual201전대기/기존RTU거부/원래deadline과요청중단/출력불변을검증했다. 마지막원본실행17616이exit0이고tests-final.log에11PASS가있다. 별도productionCLI형태실행92454도원래run.json시각을그대로읽어격리서버의read→503→recovery를기록하고exit0이다. 실제JSONL과고정오류행/출력SHA를보존했다. test synthetic token은어떤관측출력에도없다.

첫실행29950은exit125로실패했고deadline wrapper가원본오류내용을가렸다. initial-helper.py/tests.log를보존했다. HTTP body소진후닫힌response를다시읽지않도록수정한중간10tests(15487 exit0),추가연결손실/허용필드검증을포함한마지막11tests근거를분리했다. 원격/앱RTU/녹화는없다. 소스가동결된뒤독립보안검토를별도로받는다.
