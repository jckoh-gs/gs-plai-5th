# 개선 아이디어

제품 담당은 코드 변경 회차마다 제안을 검토하고 메인에게 전달한다. 채택은 PRD 버전 변경을 동반하며 구현·검증 상태는 별개다. 필수 게이트 통과 전 새로운 확장 때문에 배포·영상 시간을 소모하지 않는다.

## IDEA-001 · MQTT 시험 보고서
- 핵심 목표: 실제 왕복 증거를 재사용 가능한 JSON으로 남긴다.
- 우선순위/영향: P1 / 시험 클라이언트·가이드, MQTT 계약 변경 없음.
- 상태: 기능 구현·검증 완료. checkpoint1.0.0의 보고서/실제MQTT 증거 참조; 최종미디어·시간게이트 별도.
- 수락: FR-VPP-REPORT-01 및 AT-VPP-REPORT 전체. 실패 출력도 사실에 맞고 자격증명 없음.
- 담당: 메인. 버전: 신규 검증 후 확정(과거 v2.1.0 태그 승계 아님).

## IDEA-002 · 원격 관리 토큰 로그인
- 핵심 목표: 인증이 켜진 k3s에서 실제 UI 운용 가능.
- 우선순위/영향: P0 / UI·관리 API; MQTT 계약 변경 없음.
- 상태: 기능 구현·원격인증브라우저 검증 완료. acceptance.json FR-AUTH-01 증거 참조.
- 수락: FR-AUTH-01/AT-AUTH-01. 인증 REST·SSE·다운로드, 401 복구, 비밀 비노출.
- 담당: 메인 + UI.

## IDEA-003 · 오래된 화면 명확히 표시
- 핵심 목표: SSE 중단 때 마지막 값이 현재 관측으로 오해되지 않게 한다.
- 우선순위/영향: P1 / UI만. 기존 데이터 freshness 요구를 강화.
- 상태: 구현·검증 완료. IDEA003은 초기/무응답/단절/복구 browser 증거, IDEA004는 checkpoint-1.0.0 manifest276해시·배포식별 검증에 연결. 최종미디어·시간게이트 별도.
- 수락: UI-07 / AT-FRESH-01. 마지막 수신 시각과 연결 끊김 표시, 5초 이상 무수신 시 stale 표시, 재연결 후 해제. stale에서 제어 접수 성공을 추측하지 않음.
- 담당: UI. 소요 대비 효과가 높으며 새 서버 기능 불필요.

## IDEA-004 · 복원 가능한 릴리스 증거 묶음
- 핵심 목표: 동결 시 정상 버전·이미지·DB·검증 로그의 대응을 실수 없이 확인.
- 우선순위/영향: P0 / 운영 문서·스크립트. OPS-03 구현 구체화.
- 상태: 구현·검증 완료. IDEA003은 초기/무응답/단절/복구 browser 증거, IDEA004는 checkpoint-1.0.0 manifest276해시·배포식별 검증에 연결. 최종미디어·시간게이트 별도.
- 수락: OPS-05 / AT-RELEASE-01. machine-readable manifest에 커밋/이미지 digest/PRD/DB snapshot 경로·해시/시험 로그/k3s 복원 결과를 연결하고 비밀정보 제외. 존재하지 않는 stable을 만들지 않음.
- 담당: 메인.

## IDEA-005 · 등록 전 CSV 해석 미리보기 — 채택·구현·기능 검증 완료

현재 상태: 1.1.0 checkpoint에서 완료했고 현재1.2.0에 유지된다. 아래 후보·버전 제안 표현은 채택 당시 이력이다.
- 핵심 목표: kW/kWh, 시점/구간평균, KST/UTC 해석 오류를 단지 생성 전에 발견한다. 현재 등록 폼은 성공 시 곧바로 RTU를 생성하므로 잘못 해석한 데이터로 시험을 시작할 수 있다.
- 우선순위/효용: P1. 기존 CLI 보고서와 중복되지 않는 입력 품질 개선. 신규 OSS·외부키·DB마이그레이션 없음. 파서 재사용으로 계산 규칙 중복 방지.
- 범위 제안: 인증 관리 API `POST /api/datasets/preview`에 `{csv,type,unit,semantics}`를 보내 parseCSV 결과의 행 수, 시작/끝 UTC 및 KST 표시, 입력 단위/선택 의미/실제 보간, 정규화 최소·최대kW, 앞3행을 반환. RTU/UUID/DB/outbox 생성이나 기상조회 없음. 등록폼에 명시적 미리보기 버튼과 요약을 추가하되 미리보기 후 실제 등록은 기존 서버 검증을 다시 수행한다.
- 수락 제안:10kWh→60kW/hold,100→200kW linear,55행TSV/KST정규화,hybrid분리출력 미리보기; 잘못된행은 기존 row오류; 전후plant/command/outbox개수 불변.20MiB 상한/인증 동일. 입력4요소 중 어느것이 바뀌어도 이전미리보기 즉시 무효화. 늦게 끝난 이전요청은 새입력 결과를 덮어쓰지 않음. HTML/원본CSV 전체를 응답하지 않고 최대3행만 반환.
- 위험/완화:100000행 처리비용 및 비동기응답 경합. 자동키입력당 호출 없이 버튼으로만 실행, 요청 중 중복버튼 비활성, 입력revision 검사. hybrid의 총합 표시 방식은 wind+solar 합임을 명시하고 임의단지유형 추론 금지.
- 상태: 메인채택(PRD1.8/제품1.1.0후보). 기준 runtime af7f223, stable-runtime-v1.0.0-af7f223, delivery d853f59, artifacts/releases/checkpoint-1.0.0.json. 구현 및 배포기능 검증 완료(8599ab9/71unit/remote preview+browser races). 현재버전 복원·1.0.0역호환·stable 승격 완료. checkpoint-1.1.0.json 및 stable-runtime-v1.1.0-8599ab9 참조. 최종미디어/운영시간은 별도.
- 버전: PRD1.8 / 제품1.1.0. MQTT계약2·보고서schema1 유지. 회귀/브라우저/배포/복원 통과 후 stable로 승격했고 이전1.0.0 checkpoint도 보존했다.

## IDEA-006 · 최근 명령 상태 내보내기 — 채택·구현·기능 검증 완료

현재 상태: 제품1.2.0/runtime83d10ce/stable-v1.2.0. [REVIEW010](REVIEW-010.md)과 [REVIEW011](REVIEW-011.md)의 기능·복원·manifest 검증 완료. 아래 제안/재검토/채택 당시의 문장은 변경 이력이며 현재 미채택이나 후보 상태를 뜻하지 않는다.
- 핵심 목표: UI로 수행한 시험도 지원 담당자에게 전달 가능한 작은 JSON 기록으로 남긴다. 기존 CLI report는 특정 dispatch 실행의 실시간 수신기록이며, 이 제안은 서버에 저장된 최근 명령 이력의 읽기 전용 내보내기다.
- 우선순위/효용: P2. 기존CLI보고서와 일부 중복되므로 IDEA005보다 후순위. 새수집/자동재실행/압축파일/패키지는 추가하지 않는다.
- 범위 제안: 선택RTU의 최근20개 commandId/action/status/source/시각/목표/실제/오차/정제원인과 productVersion,contractVersion,exportedAt,rtuId/runId를 허용목록으로 JSON 다운로드. 원본요청·CSV·기상키·브로커URL·인증·전체로그 제외. 서버에 없는 전이는 합성하지 않는다.
- 수락 제안: 현재화면/GETcommands와 내보낸 값 비교, pending값null 유지, 폐기·실패상태도 보존, RTU전환 시 다른단지 명령 혼입없음, 정제 전 사용자문자열에 포함된 시험credential 비노출, 인증실패 다운로드 금지, 다운로드 자체가 명령을 만들거나 재발행하지 않음.
- 위험/완화: 과거명령runId 누락 시 현재runId를 대신 넣는 오류 및 오류문구 비밀유출. 명령별 관측값없으면 null, 별도 export schemaVersion1과 명시적allowlist 사용. CLI보고서 대체나 실제VPP 수신증거라고 표시하지 않음.
- 상태: 제안만. IDEA005 완료 후 잔여시간과 실제수요를 재평가. 함께넣어 범위를 키우지 않는다.
- 버전 제안: 추후 단독 채택 시 직전PRD/제품minor를 각각 증가. 현재는 버전 배정·채택·구현 없음.

### IDEA-006 재검토 — 정상1.1.0 확정 후, 제안상태 유지

소스검토: Controller.list(id)는 updatedAt 내림차순 최근200개 영속command cache를 반환한다. UI는 앞20개를 보여준다. 수락된 명령에는 원래runId/acceptedAt/expiresAt/dispatchedAt/deadlineAt/updatedAt/targets/actualKw/errorKw가 있으나 일부 rejected에는 runId나 acceptedAt이 없다. malformed/일부 earlyreject는 command cache에 저장하지 않고 audit/event/outbox만 남기므로 '모든수신명령 이력'이라고 부르면 부정확하다. duplicate재수신 이벤트도 새명령행이 아니다.

권고: 가치가 있는 작은 다음후보다. 기존 CLI report는 클라이언트를 켠 단일dispatch의 수신증거이며 REST시험·이미지난명령의 저장상태를 나중에 전달할 수 없다. UI운영자가 장애직후 최근20개 상태를 제출하는 흐름은 명확히 추가가치가 있다. 다만 이름은 **최근 명령 상태 내보내기**로 하고 타임라인/외부VPP수신증거/완전감사로그를 표방하지 않는다.

제안계약(미채택): 인증 `GET /api/plants/:id/commands/export`, 최대20개 최신updatedAt순 JSON, `schemaVersion:1,productVersion,contractVersion:2,exportedAt,plantId,scope:'recent-command-snapshots',limit:20,commands:[...]`. root에는 현재runId를 두지 않는다. 행의 runId는 그명령의 저장값만 사용하고 없으면null. empty목록은정상200/없는단지404. 다운로드는기존command 읽기이며 어떠한명령/상태/통신도 변경하지 않는다.

행허용목록 제안: commandId(검증된bounded문자열),runId,action(4enum),source(REST/MQTTenum),status(정의된enum),acceptedAt/dispatchedAt/deadlineAt/expiresAt/updatedAt(유효시각 또는null),targetKw/actualKw/errorKw(유한수 또는null). targetKw는 targets가 비어있지않고 모든targetKw가유한수일때만 합한다. 미전달start/limit은null,stop은확정0. request/canonical/scadaSignal/원본targets/CSV/plantName/원본reason은제외한다. 원본reason은자유문자열이고 commandId치환이들어갈수있어 최초버전에서는내보내지 않는편이 낫다. UI에는 기존상세원인을볼수있음을설명한다. 원인필요성이확인되면별도고정reasonCode를설계한다.

개인정보/보안: commandId도사용자문자열이므로 알려진API/MQTT/KMAcredential일치,URLcredential,제어문자 제거와최대길이 적용. 제거된ID는원본추적과다를수있음을metadata에설명하고 정제된값으로제어를재발행하지않는다. env-secret 치환만으로알수없는개인정보를완전제거했다고주장하지않는다. 파일명은서버UUID/UTC만으로생성해header주입을막고noreferrer/no-store/인증을유지한다. 다운로드파일이공유가능하다는이유로자동업로드하지않는다.

수락상세: 서로다른run의이력export에서각원본runId보존/누락null; acceptedstart/limit targetnull; 완료start/stop/limit의실제targets합; expired/rejected시각null처리;20개정렬및다른RTU혼입없음; empty404구분; credentialfixture가ID에있는경우비노출; rawrequest/reason/canonical제외; 전후DB/command/outbox변화없음; 실제브라우저다운로드내용과현재행대조;1.1.0기존MQTT/preview회귀·업데이트·복원.

비교: 대안 '목표미도달 원인안내'는가용량/램프/기동/장애가시간에따라변해추정오진위험과신규상태계약이커진다. 현재는내보내기가더작고증거중심이다. 채택시PRD1.9/제품1.2.0후보(새OSS/DB변경없음),기존1.1.0stable및마감유지. 메인채택전PRD/버전/소스변경없음.

### IDEA-006 채택 결정
메인 승인: PRD1.9/제품1.2.0후보로채택.기준stable1.1.0유지.정확계약은FR-COMMAND-EXPORT-01/UI09/AT-COMMAND-EXPORT-01이며redactionmetadata세부키는메인결정후정합화.구현·검증대기.위의미채택표현은제안당시이력이다.

IDEA006계약확정: root redaction={policy:"known-secrets-credential-urls-controls-length",redactedCommandIds:count,identifiersForReplay:false,unknownPersonalDataMayRemain:true}.각행commandIdRedacted는control제거/절단포함어떤변경에도true. runId유효UUID/null,유효달력ISO만UTC정규화,target합overflow는null. PRD1.9에정합반영.

### IDEA006 구현·배포·복원 완료
83d10ce/제품1.2.0/PRD1.9: exactimage79app시험(local88중9ops별도),실제export/authUI/MQTT125/podoutbox재시작/169414656bytebackup현재1.2및역방향1.1복원통과. stable-v1.2.0과stable-runtime-v1.2.0-83d10ce확정.기능인수완료이며현재1.2manifest최종해시검증·미디어·시간게이트는별도.

## IDEA-007 · 선택 RTU별 시나리오 목록
- 상태: 채택(PRD1.10/제품1.3.0후보), 구현·로컬 검증 완료. scenario-scope-local-round5 실제브라우저/REST 및136시험 통과. 원격배포·복원·stable은대기.
- 근거/가치: [REVIEW013](REVIEW-013.md)의 선택단지와 실제복원대상 혼동방지.
- 수락: FR-SCENE03/UI10/AT-SCENE-SELECT01. REST전체계약·원래plantId복원유지, 현재선택필터/늦은응답/대상표시/빈상태/export/A복원시B불변. UI필터는보안경계아님.
- 기준: stable1.2.0/runtime83d10ce fallback과원래시간·영상/PPT게이트유지.

KMA피드백소스관찰: 키없음/timeout에서HTTP200+weatherError일때일반act가성공뉘앙스notice를보일가능성을메인이확인중이다. 기존UX오류의재현·수정검토이며IDEA007의채택기능이나별도채택된새기능으로간주하지않는다. 브라우저재현전완료/확정결함주장없음.

IDEA007 후속:3fa3ba0실제1.3배포/격리시나리오UI/원래단지불변/지연응답/servedJS일치,동일420466688bytebackup의1.3·역방향1.2복원13검사PASS. 기능완료;태그/manifest승격은메인후속. REVIEW015참조.

IDEA007 checkpoint확정: [REVIEW016](REVIEW-016.md)에서immutable1.3manifest688hash/실제Readyimage/backupSHA를독립확인. stable-v1.3.0 및stable-runtime-v1.3.0-3fa3ba0는모두runtime3fa3ba0. 현재기능checkpoint완료이며remoteGitpush/최종동결·미디어·시간완료를이검증으로추론하지않는다.

## IDEA-008 · 일반 목표 입력의 기존 서버 범위 안내 — 제안 v1

REVIEW-017.md의 소스 관찰을 등록한다. toleranceKw0.01~10000, timeoutSeconds1~3600, priority0~100을 일반 목표 폼의 입력 범위/안내와 일치시키는 제안이다. target0 또는 가용량 초과 목표를 자동 보정하지 않으며 의도한 실패시험은 유지한다. 현재는 미채택·미구현이고 PRD/제품 버전은1.10/1.3.0 그대로다. 메인은 우선 재연결/최종창 운영 공백을 보완했다. 1.3 최초1시간 관찰 구간을 확보한 뒤 가치와 위험을 다시 판단하며, 채택할 경우 PRD·제품 버전을 먼저 기록하고 기존1.3 stable을 복원 기준으로 보존한다. 개발자 응답을 기다리는 항목이 아니다.


IDEA-008 제안 v2: 실제 로컬 브라우저 범위 입력 재현을 추가했다. 극단적인 validSeconds 입력이 ISO 변환 중 예외를 일으키므로 유효한 만료일 구성 여부를 확인하고 폼에 오류를 안내하는 범위를 추가 제안한다(ISSUE-021, REVIEW-017 후속). 업무상 임의 상한이나 서버 계약 변경은 포함하지 않는다. 여전히 미채택/미구현, PRD1.10/제품1.3.0 유지.
