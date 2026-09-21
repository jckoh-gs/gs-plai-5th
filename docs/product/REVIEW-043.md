# REVIEW-043 — 안정1.7 첫1시간 관찰 증거

읽기 검토 대상은 artifacts/checkpoints/soak-1.7.0-first-hour의 요약·두 JSONL prefix·경계·자원·캡처 소스/출처다. 재실행·원격 변경·인수/운영 원장 승격은 하지 않았다.

13개 파일 SHA256을 직접 재계산해 모두 일치했다. sha256.json 자체 SHA는8e4d091fb5022a3da4e5b51b7d89539c7c3deae592afbdb81e78cf9f748f5cd4다. 각 JSONL의 마지막 행은 해당 boundary와 같고 그 이전 모든 행은 각 시작으로부터3600초 미만이다. 따라서 임의로 일찍 자른 prefix가 아니라 각 관측기의 첫1시간 이상 poll이라는 범위가 맞다.

primary는16:45:54.122Z→17:45:54.620Z,3600.498초/346poll이고 audit는16:45:54.307Z→17:45:55.626Z,3601.319초/361poll이다. 캡처17:46:19.023184Z는 두 경계 이후다. 각598수신, 기록된 invalid/duplicate/connection error0이며 primary API error/비정상health poll0이다. audit의5RTU는 각각3599samples, sample discontinuity/baseline drift/run transition0이다. 이는 관측된 수신 집합이며600개나3600samples로 반올림하지 않는다.

primary 구간의 maxPending은3이며 경계에서0인 사실과 구분한다. RSS는101363712~157900800B의 관측 범위이며 누수 부재 또는 장기 상한 증명이 아니다. primary 최대poll간격16320ms와 전체RTU 메시지간격62815ms도 서로 다르고 RTU별 무손실 증명이 아니다.

17:46:18.894Z 자원 읽기는 실제Pod79784e51…의 app d1e4/broker a75b Ready, 재시작0을 기록했다. DB1048797184B/WAL4890472B/data파일합13521050173B, 가용hostFS64438407168B다. 가용량은 PVC 예약량이 아니며 캡처 순간의 상태다. 이 한 번의 Ready 읽기를 전체시간 무중단 증거로 확대하지 않는다.

primary 소스는17:42:21에 캡처해 d98 바이트와 대조한 것이며 시작 때 로드된 코드의 독립 attestation이 아니다. audit는 자체 시작시 source hash를 보존했다. sourceHead f1eb0d는 캡처 때 Git HEAD이며 캡처 보강의 미커밋 상태를 숨기거나 깨끗한 checkout으로 해석하지 않는다. 실제 사용 capture-first-hour.py와 resource-read.mjs 바이트는 이번13개 해시에 포함된다. ISSUE028의 선행 준비경로 실패와 이후 수정·독립검토는 이 성공 캡처와 별개 이력으로 보존한다.

판정: 안정1.7의 위 첫1시간 관찰 근거로 사용할 수 있다. incidentEvidence 빈 배열은 알려진 링크가 없다는 뜻이며 사건이 전혀 없었다는 증명은 아니다.14시간 전체운영·모든구독자수신·무중단 uptime·후보1.7.1원격 또는 전체목표 완료를 뜻하지 않는다. 최종 동결/영상/PPT/종료 게이트는 남는다.
