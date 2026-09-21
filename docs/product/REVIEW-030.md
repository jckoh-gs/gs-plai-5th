# 제품 검토 030 — 1.6 이벤트 시각 로컬 인수

실제 event-time-round1 결과·저장 소스·현재 helper·단위/브라우저 assertion 및 desktop 이미지를 읽었다. UI04의 알려진 운영1.5 결함은 아직 원격에서 수정되지 않았으므로 partial을 유지한다. 신규 AT01~03은 로컬검증, AT04는 로컬부분만 완료로 구분한다.

실제 저장4행의 created를 표시된 KST(다음날00시), datetime/title/aria 원본UTC와 대조했다. ms가 다른3행과 이전분1행을 id순으로 유지하며 유형/메시지도 같다. 실제화면에서 명시적 KST(UTC+09:00) 열 제목과 날짜/시각이 읽힌다. 별도5개 route fixture는 윤일·KST 자정경계·malformed·missing·불가능한 날짜를 검사하며 다른 timestamp/createdAt fallback이 없음을 증명한다. UTC와 America/Los_Angeles 브라우저 결과 동일 및 좁은 화면 가로넘침 없음이 기록됐다. fixture는 서버데이터가 아니다.

helper는 네자리년/밀리초3자리/Z인 canonical UTC ISO만 허용하고 Date roundtrip으로 실제달력을 검증한 뒤 Asia/Seoul을 명시한다. invalid는 null로 반환해 화면대시이며 원문잘못된값/현재시각을 대입하지 않는다. 기존 서버 events(limit80)의id내림차순·전역계약과 store/API는 변경되지 않았다. 실제4행 및 source계약 대조이지 실제80행을 새로 생성한 시험은 아니다. 브라우저 mutation0은 해당읽기 시험 범위이며 전체제품이 쓰기없다는 뜻이 아니다.

event 증거8개 SHA를 직접 대조했다. servedJS는2bcc3c1bc75a178acf7dac51bd91436b6f5e30bd1c8e3f1a176980900417be06, UI source5e638f9e8c50d69f18175ee0bbcc8eeaae94b07d52f0aaeffbf6c57d6d4e53fd, helper251c71e39967b05c99ca054c093385a71728200db5f407d8cd6dc667972a7c28이다. auth/SSE/narrow·receipt14·기존form44 및 cleanup 결과도 확인했다. 전체unit round2는281/281이고 round1의280과 합산하지 않는다. build/실제broker 통합·고급은 별도완료로그 범위다.

form round2의 실제반환 baseline 복구·기존설정불변은 유효하다. 다만 당시 harness는r.ok로 확인했고HTTP201 자체를 별도로 assert하지 않았다는 clarification을 유지한다. 이후201/pageguard 변경은 syntax/source검토만이며 다음복원시험이 그 실행증거를 확보해야 한다. 이운영harness수정을1.6앱기능의재실패/재완료로 혼합하지 않는다.

판정: 로컬 시각 계약과 읽기표시 불변을 충족했다. 정확후보이미지 실제k3s·동일백업 현재1.6/하위1.5 복원·stable은 대기다. 이번에는 REVIEW030/5개해당인수행/IDEA010상태만 바꾸며 PRD/run/source/기존manifest는 수정하지 않는다. 최종영상/PPT·시간·인도는 여전히 미완료다.
