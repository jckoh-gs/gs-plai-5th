# 제품 검토 005 — 기능 집계

UI004/control stages는 실제20%→stop→start 차트/표 일치, 검색/선택, 복사/키보드, 풍향yaw를 증명한다. ISSUE009 finite target fallback 수정 후 관측도 포함한다. process-metrics-round2는 실제SIGKILL 누적카운터 복원이다. 이전/수정 이미지 별도 원격복원과 original4plants/runIDs/generatorIDs/datasetcounts/scenario, 브라우저/실제125MQTT가 확인됐다. 마지막 af7f223 이미지의 배포 확인은 별도다.

이제 근거가 충분한 FR-DATA03/04, SIM01/03/04/05, WTH02, CTRL01/03, MQTT02/03, STORE02, METRIC02와 G01~05 등을 verified_functional로 집계했다. 각 집계에 coveredBy 자식 ID와 증거 hash를 연결했다. 상위 항목을 무조건pending으로 두지 않는다. 나머지는 partial과 구체적인 미확인 조항을 기록했다.

우선 기능/안전 확인은 다음으로 좁힌다:
- scenario snapshot paused 및 faultRNG/irradiance 등 전체 지정필드 roundtrip과 복원 전 pendingoldrun 보존을 한 시험에서 확인.
- UI 이벤트 로그의 영속/종류/비밀비노출과 가이드5탭 필수 설명 대조; RTU상세 모든 요구 지표를 현행 화면으로 점검.
- API 20MB 요청 상한, sample3600/frame120 조회 한도 및 정렬. 기존 parser 대표오류는 통과했으므로 모든 조합 반복시험은 불필요하며 명시된 경계만 직접 확인.
- KMA actualkey 제공 여부, token/config 공개키와 비노출 전체검사, MQTT per-deviceconfig/LWT 경계의 보안담당 최종 판단 연결.

새 결함을 발견한 것은 아니며 위는 명시 조항의 증거 부족이다. candidate Alpine 단위57/integration/advanced는 플랫폼 검증으로 유용하지만 최종commit/image의 전체체크를 대체하지 않는다. 남은 릴리스 게이트: af7f223 배포식별, stable/tag+manifest/backup 해시와 복원증거 일치, 최종faultcleanup. 영상/PPT와14시간 운영마감은 별도 미완료다. 신규 제품 아이디어를 추가할 이유는 현재 없다.
