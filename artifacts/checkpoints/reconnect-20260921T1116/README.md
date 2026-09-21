# 실제 자동복구 및 관측시각 보완

11:16Z에 주관찰API요청1회실패, MQTT구독연결종료가관측됐다. supervisor는동일Pod를검증한뒤11:16:17.529Z localforward를다시열었고11:16:19.292Z ready가됐다. 두observer의재연결은19.2Z,5RTU의다음메시지수신은33.6Z에확인했다. 앞뒤원격PodUID와컨테이너재시작0은같으며 최초실패의근본원인은미확정이다.

`summary.json`과세관측JSONL, `pod-after.json`, `resume-after.json`은실제사건증거다. `supervisor-source-before.mjs`는수정전소스로, localReady실패후connecting경로에서outage시각이갱신되지않는ISSUE017을설명한다. 초기사건의lastOutageAt/reconnectedAt는오래된10:07값이므로11:16상태전이와observer실제시각을사용한다. 원문은수정하지않았다.

수정코드는격리회귀9/9PASS후11:19Z에계획교체로활성화했다. `handoff-plan.json`/`handoff-result.json`,이전·이후status와handoff-events를참조한다. 이전supervisor98912는종료됐으며새25872/PID54951이자신의forward를소유한다. 두observer는같은세션으로계속실행한다. 약6초의계획된구독연결공백도별도로기록한다. 새로운강제현장장애시험은수행하지않았다.

누적mainAPIerror1/connectionErrors3, RTUobserverconnectionErrors5를보존했다. 복구·교체후5RTU의재수신을확인했고해당관찰범위의invalid/샘플불연속은0이다. 이는무중단·완전수신·외부VPP저장성공보장이아니다. `docs/issues/ISSUES.md` ISSUE017에원인분석·수정·최초시험의일시실패·재실행결과를정리했다.
