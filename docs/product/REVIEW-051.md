# REVIEW-051 — 1.7.1 첫1시간 관찰과 연결사건 범위

불변 soak-1.7.1-first-hour의13개 SHA멤버를 직접 재계산해 모두 일치했다. capture-first-hour.py SHA5ddb1143d7fa51e0dcf8842461e789cf10fec8271e7ed6a53dd8aec884800735는 원래준비값과 같다. 실제live JSONL을 읽어 저장된primary/audit가 각각 처음부터 해당경계까지 정확한 JSON행 prefix인지 대조했고 모두 일치했다. 각 마지막행은 boundary와 같고 이전 모든행은3600초미만, 마지막행만3600초이상이며 session도 단일하다. 출력이나 원장을 수정하지 않았다.

primary session0ea34e34는17:59:54.698Z→19:00:01.961Z/3607.263초/345poll이다. audit session1e38bd3c는17:59:55.011Z→18:59:56.065Z/3601.054초/361poll이다.19:00:10 캡처는 양경계 이후이며 미리 생성한1시간근거가 아니다. 각각564수신, invalid/duplicate0이나 **primary API오류1·API불가poll1, audit 연결오류1 및4RTU 각sampleDiscontinuity1**이 포함된다. 오류누적을 초기화하거나 무오류/무중단으로 표현하지 않는다. maxPending1, 관측RSS102289408~158879744B는 관측범위다.

자원기록19:00:10.210Z는 실제main75f4bc7a,app234ec56/broker a75b Ready 및재시작0/0이다. DB1191260160B/WAL4882232B,가용hostFS58819227648B는 순간값이며 PVC예약량이나 전체시간가용성 보증이 아니다. primary는시작전17:59:32에저장된소스 entrypoint로실행했고18:00:49에hash/ps연결을확인한provenance다. 메모리로드attestation은아니다. audit의시작소스hash도보존되며 이전1.7의사후소스기록과구분한다.

ISSUE030의별도 persisted-proof는19개저장행의범위읽기/terminal0을통해 observer간추론상미관측144sample위치가연속생성된outbox본문과PUBACK기록에있음을대조했다. 수신원문전체가보존되지않아위치는연속snapshot으로추론한것이며 모든subscriber/외부VPP의수신증명은아니다. 이저장근거가raw첫1시간의불연속을없애지않는다. SQLite6410의이전임시경로실패설명과연결사건의원인은별개이며후자는unknown유지한다.

판정: 사건을포함한실제첫1시간관찰근거로사용가능하다. 장애없는1시간/전체14시간운영/전체목표완료를뜻하지않는다. 관측기는계속진행하며최종동결21:37:33Z·종료22:07:33Z·새영상/PPT게이트는그대로남는다.
