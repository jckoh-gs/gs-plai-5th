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

현재 결정: **개정3 채택, PRD1.11 / 제품1.4.0 후보**. 아래 제안v1/v2의 미채택 표현은 당시 이력이다. REVIEW-019의 범위와 인수를 PRD에 반영했다. 첫1시간 관찰 및 원격 저장 증거를 확보했고, 로컬 관측 공백은 별도 운영 이슈로 보존했다. stable1.3을 유지한 채 격리 후보에서 구현·검증한다. 담당 메인/UI, 독립 보안·이슈·제품 검토. 아직 구현·배포·stable 승격을 뜻하지 않는다.

REVIEW-017.md의 소스 관찰을 등록한다. toleranceKw0.01~10000, timeoutSeconds1~3600, priority0~100을 일반 목표 폼의 입력 범위/안내와 일치시키는 제안이다. target0 또는 가용량 초과 목표를 자동 보정하지 않으며 의도한 실패시험은 유지한다. 현재는 미채택·미구현이고 PRD/제품 버전은1.10/1.3.0 그대로다. 메인은 우선 재연결/최종창 운영 공백을 보완했다. 1.3 최초1시간 관찰 구간을 확보한 뒤 가치와 위험을 다시 판단하며, 채택할 경우 PRD·제품 버전을 먼저 기록하고 기존1.3 stable을 복원 기준으로 보존한다. 개발자 응답을 기다리는 항목이 아니다.


IDEA-008 제안 v2: 실제 로컬 브라우저 범위 입력 재현을 추가했다. 극단적인 validSeconds 입력이 ISO 변환 중 예외를 일으키므로 유효한 만료일 구성 여부를 확인하고 폼에 오류를 안내하는 범위를 추가 제안한다(ISSUE-021, REVIEW-017 후속). 업무상 임의 상한이나 서버 계약 변경은 포함하지 않는다. 여전히 미채택/미구현, PRD1.10/제품1.3.0 유지.


IDEA008 개정3 로컬 완료: runtime fdd0491 / PRD1.11 / 제품1.4.0. 범위·날짜 오류·접근성·동일폼 수정·실제 MQTT 단계와0목표/가용초과/만료 의미를 REVIEW020에서 독립 대조했다.240workstation+독립3입력시험, 실제broker통합/고급,4개 기존브라우저회귀 통과. 정확OCI c19d550f의77개 앱시험과 보안검사 완료. 실제k3s1.4 배포·백업·복원·stable 승격은 아직 대기이며 현재원격1.3 fallback을 유지한다.


IDEA008 개정3 기능·배포·복원 완료: 실제 fdd0491/c19d 이미지에서 main UI·MQTT·outbox 재시작, 동일594944000바이트/be09 백업의 별도1.4·하위1.3 복원17증거와 새폼44검사를 REVIEW021에서 독립 확인했다. 기능 안정 기준1.4.0으로 고정하며 태그/manifest 해시 검증은 별도 운영 기록으로 완료한다. 위 구현·배포 대기 표현은 각 시점의 이력이다. 최종 영상/PPT·시간·인도는 미완료다.

## IDEA-009 · REST 명령 접수 결과와 응답 유실 안내 — 제안 v1

**미채택·미구현.** [REVIEW-024](REVIEW-024.md)의 소스 관찰과 최소 수락안을 등록한다. HTTP200의 rejected/expired를 접수 성공으로 표시하는 문제, accepted 뒤 상태조회 실패를 명령실패로 혼동하는 문제, 응답대기 중 새UUID 중복 제출을 하나의 REST 접수 흐름으로 다룬다. 제안 범위는 Target/대시보드 REST 명령의 정확한 반환 상태·고정 RTU/commandId receipt·RTU별 단일 pending guard·응답미확정 시 읽기 확인이다. 자동 재전송·새 서버 API/DB·전체 폼 재설계·탭 간 exactly-once는 제외한다. 실제 재현은 독립 이슈 담당 증거와 대조 후 채택 판단한다. 현재 stable1.4/PRD1.11과 원래 동결/종료·미디어 조건은 변경하지 않았다.


### IDEA009 채택 결정 — 개정1

메인은 실제 local1.4 beforeproof의 rejected 성공알림, accepted 후 상태GET 오류, 서로다른ID의 중복POST를 확인하고 REVIEW024 범위를 PRD1.12/제품1.5.0 후보로 채택했다. 각 HTTP대기15초, RTU별 단일 pending POST 및 앱메모리 최근20개 확인, 명시적 원래ID 읽기 확인을 계약에 고정한다. 구현/시험/stable 승격은 대기이며 실제원격1.4와 immutable checkpoint/백업을 보존한다. 위 미채택 표현은 채택 전 이력이다.


IDEA009 기능·배포·복원 완료: runtime6d165d1/image2fd3f21의 실제 main UI/MQTT/outbox 재시작과 동일719527936바이트/ad34 스냅샷 fresh1.5·하위1.4 복원19개 근거를 REVIEW027에서 독립 대조했다. 신규 receipt14case는1.5에서만, 기존form44는 양 버전에서 검증했다. 원래5단지 데이터/설정 보존과 양rig0/noPods/소유터널 종료를 확인했다. 새 stable 태그/immutablemanifest 출처 검증은 메인 후속이며 최종 미디어·시간·인도는 미완료다. 앞선 제안/로컬대기 문구는 당시 이력이다.

## IDEA-010 · 운영 이벤트의 실제 시각 표시 — 제안 v1

미채택·미구현. REVIEW029의 소스 관찰: 서버 audit_events는 created를 반환하지만 로그 UI는 timestamp/createdAt/time만 읽어 실제 저장시각을 누락한다. 기존 로그 시험은 메시지와 Invalid Date 부재까지만 검증한다. 최소 범위는 created 표시·시간대 안내·누락/잘못된 시각의 비추정이며 새검색/export/API/DB는 제외한다. 실제 읽기 재현 뒤 채택 여부를 판단한다. stable1.5 및 원래 일정·최종미디어 게이트는 변경하지 않는다.


IDEA010 개정1 채택: 실제1.5 이벤트55개 유효created가 모두 대시인 ISSUE023을 메인이 확인하여 PRD1.13/제품1.6.0 후보로 채택했다. UI04/AT-EVENT-TIME01 4개 계약은 canonical created 검증·명시적KST·접근가능UTC·invalid대시 및 기존읽기계약 불변이다. 기존1.5 fallback과 불변manifest는 보존하되 알려진 결함을 숨기지 않는다. 위 미채택 문구는 제안 당시 이력이며 현재 구현·검증 대기다.


IDEA010 로컬검증완료: REVIEW030에서 실제4개created→KST/접근가능UTC,5개경계fixture·TZ/좁은화면·읽기불변·281전체시험 및 기존회귀를 대조했다. 신규AT01~03 verified_local, UI04/AT04 partial 유지. 운영1.5의ISSUE023은 정확1.6원격/복원승격 전까지 알려진 결함이다. 최종미디어·시간게이트별도.


IDEA010 기능·배포·복원 완료: REVIEW032에서 runtime331/image4af, main59·복원79이벤트, 동일851673088B/9bd의현재1.6·하위1.5복원19보고서+2Podidentity와양rig정리를독립확인했다. UI04/AT4개기능검증완료. 하위1.5에는ISSUE023수정이없으며과거기록을고치지않는다. 예정runtimealias는331, stable-v1.6.0은백업보강포함완료운영커밋을가리키므로구분한다. 태그/manifest출처검증은메인후속, 최종미디어·시간·인도는미완료다.

## IDEA-011 · 명령 목록 조회 실패의 가시성 — 제안 v1

미채택. REVIEW034의실제main1.6 읽기+브라우저GET503 fixture에서기존명령행이있으면조회실패2회가표시되지않고상단SSE는정상인현상을확인했다(API쓰기0). 최소범위는명령목록의마지막성공시각·실패/대기/빈상태구분과이전행보존·RTU경합방지이며새서버/DB/제어기능은없다. 기존POSTreceipt/전체SSE신선도와다른개별목록진단이다. 채택/버전변경은메인판단전까지하지않는다.


IDEA011 개정1 채택: PRD1.14/제품1.7.0후보, UI13 및 AT-COMMAND-LIST01 네개계약확정. 목록별마지막성공브라우저시각·조회상태·이전행보존/복구·RTU전환·단일유한abort polling에한정하며구현/인수는대기다. 위미채택표현은제안당시이력이다. stable1.6 운영checkpoint180fa68/runtime331/9bd fallback과원래21:37:33Z동결/22:07:33Z종료·최종영상/PPT조건은불변이다.

### IDEA011 구현·배포·복원 인수 완료

제품1.7.0/runtime d98d3c4/PRD1.14를 실제k3s에 배포했다. 로컬8군 경계검증과 실제main/현재복원 목록읽기, 같은1cab 스냅샷의1.7/1.6복원23보고서+2Pod identity를 REVIEW037에서 대조했다. REVIEW038은 checkpoint-1.7.0의1731해시/실제Ready/선택백업을 확인했다. 위 제안·채택대기 표현은 당시 이력이다. 종료시각과 최종 신규 영상·같은영상 PPT 게이트는 남아 있으며 전체 목표 완료를 뜻하지 않는다.

## IDEA-012 · 연동 가이드와 RTU 상태 관측 계약 정정 — 제안 v1

**미채택·미구현 제안.** REVIEW040과 NFR08-CONTRACT-REVIEW/FIXTURES-20260922의 소스·순수 fixture 근거로 제품1.7.1/PRD1.15 패치를 권고한다. 독립 quickstart의 안전한 `.env` 준비와 실제 예제 포트, monitor의 strict boolean online/offline 구분, 구현되지 않은 legacy_accepted 약속 정정이 최소 범위다. PRD 부록 A의 같은 두 문서 불일치도 함께 정정해야 한다. 현재 명령 중복방지·재시작/하위버전 복원·MQTT wire 계약을 줄이지 않는다. 새 DB/server/control/UI 변경은 불필요하며 실제 격리 실행/monitor 및 기존 배포·복원 근거를 채택 후 검증해야 한다. stable1.7/1cab과 불변 manifest, 첫1시간 관찰 이후 교체 조건, 원래 동결·종료·최종 미디어 게이트는 그대로다.

### IDEA012 채택 결정 — 개정1 (당시 이력)

REVIEW040과 실제 순수beforefixture를 근거로 제품1.7.1/PRD1.15에 채택했다. RTU상태 online 출력, 빠른시작 환경·포트 및 미지원 v1 문구 정정으로 한정한다. 구현·새시험·배포·복원 인수는 아직 대기다. stable1.7/1cab을 보존하며 실제1.7 첫1시간 관찰기록 전에는 새 이미지로 교체하지 않는다. 원래 동결·종료·최종미디어 일정은 그대로다.

### IDEA012 로컬 인수 (당시 이력)

구현과 로컬 전체 317개·실제 MQTT 통합/고급·report/client-security·실제 online/LWT monitor·새 실행 폴더 quickstart·빌드를 통과했다. REVIEW041은 신규 AT01~03을 로컬 검증으로, AT04를 부분 충족으로 판정했다. 정확 이미지·k3s·동일 백업 현재/하위 복원·불변 checkpoint는 아직 대기다. 초기 quickstart 실패 두 건과 기존 브로커 재사용/3112 지정 범위를 보존한다.

### IDEA012 현재 상태 — 기능·배포·복원·출처 검증 완료

제품1.7.1/runtime40b9ed8/PRD1.15는 [REVIEW045](REVIEW-045.md)의 실제main·outbox·동일1075081216B/5ff 현재1.7.1/하위1.7복원26보고서+2Pod·정리를 통과했다. [REVIEW046](REVIEW-046.md)은 [checkpoint-1.7.1](../../artifacts/releases/checkpoint-1.7.1.json)의2033해시/실제Ready/전체백업SHA를 확인했다. [원격태그 근거](../../artifacts/checkpoints/release-1.7.1/tags.json)에서 stable-v1.7.1은 운영c9b43bd, runtimealias는40b9ed8로 확인됐다. 위 미채택·후보·원격/복원대기 문구는 해당 시점 이력이다. quickstart의 기존브로커 재사용/3112지정과 실제main monitor의 retained/LWT 미주장 범위는 유지한다. 안정1.7/1cab과 과거 불변근거를 보존하며 원래 동결21:37:33Z/종료22:07:33Z 및 최종영상/PPT·역할마감·인도 게이트는 미완료다.
