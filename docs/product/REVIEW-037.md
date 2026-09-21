# 제품 검토 037 — 1.7 기능·복원 인수

16:55:43Z paired restore-summary의23개보고서를각각읽어PASS를확인했고별도2개Pod identity의UID/Ready app·broker를대조했다. 현재앱d1e4b1d8…4c692/runtime d98d3c48d22c54e7fd092ee9e46ca9ab49e4bbf9와하위앱4af가각각일치한다. 같은931876864바이트/SHA1cab74e110d172307ffd3605543da2db4261c27f009b97871a21bd1bf665827c의두fresh init source/destinationSHA와existingDestination=false도직접확인했다.

원래5단지/1scenario를fixture전에대조하고 canonical generator on/limitPct도포함한다. 양버전form44/receipt14·UI/export/preview/MQTT·실제이벤트시각이검증됐다. scenario는원래ID보존범위이고새scenario/KMA기능시험은아니다. 목록신선도는main1.7 및복원1.7의actual-only 읽기로확인했으며API쓰기/setup쓰기0이다. 하위1.6에새목록표시가있다고assert하지않았다.

복원HTTP JS154fe2de1f039fe27fbcce6793e15716e843ca3814c2d361392a2207b6918dfc와CSS51137은정확런타임근거와일치한다. REVIEW035의동일bundle/소스 로컬8그룹이503·header/body15초·단일poll·RTU경합·해제취소·좁은화면오류를담당한다. 운영/복원actual-only결과만으로그곳에서실제장애를발생시켰다고확대하지않는다. 운영harness와compiled runtime source도구분한다.

main-command-list/main-MQTT/outbox-post-normal PASS를읽었다. terminalsummary는양rig0replicas/0Pods·소유forward19658/54676종료·3105/18885닫힘·4PVC/백업보존·운영DB복원시험미수정을기록한다. 메인의새실시간root확인은별도후속이므로이문서가직접새kubectl을수행한것처럼기록하지않는다.

판정: UI13/AT-COMMAND-LIST01 네개를verified_functional로승격한다. source/이미지·로컬오류경계·실제main읽기·정확현재/하위복원범위가충족됐다. 새불변manifest/태그출처는별도운영단계이며관측1시간·전체무중단·최종미디어·14시간완료는주장하지않는다. REVIEW036의리허설도최종영상이아니다. 이번에는본검토와해당5개인수행만수정했다.
