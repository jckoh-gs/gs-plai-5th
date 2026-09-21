# RTU별 관찰기 v1 검증

관찰 도구 추가에 대한 증거이며 제품1.2.0의 재배포나 전체목표 완료가 아니다.

- `pilot-source/`, `pilot-result.json`, `pilot-observations.jsonl`: 강화 전 관찰기 원본과90초 pilot. 구조검사 누락이 있었으므로 현재 강화검사 통과로 소급하지 않는다.
- `docs/issues/evidence/review-014-audit-before.log`: 독립 검토가 누락5건을 재현한 실패 기록.
- `docs/issues/evidence/review-014-audit-after.log`: 강화 후 집중·독립11/11PASS. 실제 model+Store100기/60frame분할, 동일시각, 정상ramp-down/nullable전기값, 중복불변성, 맥락별gap, 잘못된필드·시간 등을 확인했다.
- `first-verified-observation.json`: 강화 세션54bdac4e의10:48:36.941Z snapshot. 실제5RTU 각각180samples,24messages 합계, invalid/connectionError0. 각RTU≥2메시지·≥120samples 수신과 실행소스2개의SHA/보존사본 일치를 확인한 뒤 불변 파일로 저장했다. 이는 이시점까지 관측한 데이터만 증명한다.
- `live-identity.json`: 독립 읽기 전용 재개 점검이 실제Ready app/broker image, API1.2.0을 확인한 인접시점 증거다. 관찰 receipt의 기대image필드를 실제검증값으로 오인하지 않는다.
- `source-and-secret-check.json`: 검사 당시 새파일15개의SHA 및 알려진배포credential bytes 일치0. 완전한 비밀탐지나 보안감사를 대신하지 않는다. 파일후속변경은 이시점해시와 구분한다.

장기 관찰은 새실행 디렉터리에서 계속되고, 전체원관측·종료기록·실행소스는 동결시 따로 보존한다. primarysoak와연결supervisor는 중단하지 않았다. 시작이전/연결공백, 중복기록10,000개 범위밖, 실제외부VPP 저장성공에 대한 보장은 없다.
