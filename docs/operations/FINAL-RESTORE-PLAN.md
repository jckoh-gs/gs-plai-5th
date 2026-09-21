# 최종 30분: 동일 스냅샷 복원과 릴리스 연결

준비 문서이며 실행 증거가 아니다. 현재 기능상 안정 기준은 제품1.4.0 / PRD1.11 / runtimefdd0491 / imagec19d550f다. 독립 복원17개 및 main proof7개 검증 후 stable-v1.4.0과 stable-runtime-v1.4.0-fdd0491 태그를 로컬 생성했다. 선택한 정확한 백업은594944000바이트/be09a5f5이며1.4 및 하위1.3 복원을 검증했다. run.json의 backup/stableCheckpoint가 선택 기준이며 불변 매니페스트 생성·검증은 별도 후속 게이트다. 동결21:37:33Z, 종료22:07:33Z는 변경하지 않는다. 역사적 fallback420466688바이트/12:17 백업(b515ef26…)은 별도 PVC에서1.3 및 하위1.2 복원·UI·MQTT 검증까지 완료되었다. 이전169MB/335MB 백업은 별도 이력이며 새 최종 백업의 복원 증거로 대체하지 않는다.

## 선행 준비와 한계

프로젝트 루트에서 Node24+, Python3, kubectl charles-k3s 접근, Chrome/Playwright 런타임, 기존 비밀 파일 `artifacts/private/deploy/{api-token,client-password}`가 필요하다. 비밀을 명령행/로그/공개 Git에 넣지 않는다. 실제 클러스터의 여유 디스크를 동결 전에 다시 확인한다. 최근 관측 /data 전체파일5031428043바이트는 단일594944000바이트 snapshot 크기와 다르다. available78692749312바이트는 공유 host 파일시스템 여유이며 PVC 전용 예약량이 아니다. 최종 snapshot·압축파일·로컬복사·복원PVC의 중복 공간과 이후 성장량을 함께 계산하며 자동삭제하지 않는다. 원본PVC의 새 SQLite 및 압축본, 별도 복원PVC, 로컬 전송본을 모두 보관할 공간이 필요하며 현재 파일 크기로 밤의 크기를 보장하지 않는다. 이미지가 이미 노드에 있더라도 레지스트리와 PVC 상태를 읽기 점검한다.

`deploy-restore-rig.py`는 기존 DB가 있으면 복사를 건너뛴다. 새 검증에는 새 고유 이름/PVC를 사용한다. `grid-restore-final-20260921`이 존재하면 먼저 실제 상태와 이번 시도의 기록을 대조한다. 다른 검증에서 사용한 리소스임이 확인된 경우에만 별도 이름을 선택한다. 이번 apply의 응답을 잃은 경우에는 새 이름으로 중복 실행하지 않는다. 원본PVC는 복원 init에 읽기 전용으로만 연결되고 운영DB는 수정하지 않는다.

동결 전 보완 완료: optional `--expected-sha256` 인수를 추가했다. 최종 복원에서는 필수로 전달한다. init은 원본을 스트리밍 SHA256 검증한 뒤 복사하고 목적DB도 스트리밍 검증한다. 두 값이 메타데이터와 일치하고 SQLite integrity_check가 통과해야 앱을 시작한다. JSON init로그를 보존한다. 앱이 시작한 뒤 SQLite 파일은 변경될 수 있으므로 이후 재시작 시 init이 재검증에 실패할 수 있다. 이 검증용 rig를 일반 지속운영 배포로 재사용하지 않는다. 항상 새PVC를 사용하고 실패한 기존 목적파일을 덮어쓰지 않는다. 인수를 생략하는 과거 명령은 호환되지만 exactSnapshotVerified는 false이다.

백업은 새 bounded helper 기준 총180초 예산, 명령별 상한, 종료시각을 적용한다. 복원 helper도 원래 run.json.deadlineAt과 시작+210초 중 빠른 시각을 총예산으로 적용한다. get은 host20초, apply30초, rollout180초와 단계 시작 시 남은 총예산 중 작은 값으로 제한한다. run이 없거나 유효한 종료시각이 없거나 이미 만료되면 kubectl 실행 전에 실패한다. `--run-file`은 격리시험 주입용이며 최종 실행에서는 원래 run.json을 사용한다. 복원/미리보기/MQTT검증/브라우저검증의 직접HTTP fetch는 각 요청15초 AbortSignal과 redirect 거절을 사용한다. 요청별15초는 전체 단계 종료시각을 보장하지 않으며 브라우저/후속검증 도구 전체에는 같은 총예산이 있는 것은 아니다. 부모의 전체 deadline과 단계 컷오프는 메인이 계속 감독한다. 메인이 프로세스 세션을 감독하고 단계별 아래 컷오프를 적용한다. 임의 명령 재시도는 새 실행이 중복되었는지 확인한 뒤 한다. 원격 exec 응답 유실은 원격 작업 취소 증명이 아니다. 특히 apply 타임아웃은 원격 적용 취소를 뜻하지 않는다. 새 이름으로 다시 실행하지 말고 기존 고유 이름의 deployment/PVC/Pod 실제 상태를 유한 host대기로 조회한 뒤 메인이 후속 조치를 결정한다. 도구는 명령 raw stdout/stderr를 오류에 노출하지 않는다.

## 시간 배분과 병행

- 0~3분: 최종 건강상태/실행 이미지 확인, 새 정상 백업과 전송·해시 검증. 목표는90초 이내, 네트워크/전송 예산180초다. NETWORK-RECOVERY.md에 기록한 동기I/O 중간취소 한계는 유지한다. 영상 원고/덱 배치 준비는 병행 가능하지만 매니페스트 고정 전에 최종 렌더를 시작하지 않는다.
- 3~6분: 새로운 격리PVC 복원, 실제 이미지ID 확인, 원본 데이터 비교. UI 검증과 MQTT 검증은 같은 복원앱에서 병행 가능하다. MQTT는 최대75초 telemetry 대기+제어/재연결 여유가 필요하다. 이전1.2 복원 전체는 약3분30초(하위1.1 검증 포함)였다. 이번은 현 버전 복원을 필수로 하고 이미 검증된 이전 버전 반복은 마지막30분 필수경로에서 제외한다.
- 6~7분: 복원 결과9개가 아닌 이번 실제 실행 결과만 요약, 복원배포0/Pod0/터널종료, acceptance와run 백업 연결, 증거커밋, 매니페스트 및 원격검증. 약1분 예상.
- 7~15분: 새 최종 영상 녹화·음성·합성·전체디코딩·내용/화면검수. 준비된 장면 기준이며 실패 시 남은 시간으로 재시도 여부를 판단한다.
- 15~23분: 검수된 동일 영상의 실제 캡처와 타임코드로 PPT 생성/재수입/전장렌더, 슬라이드 검수.
- 23~30분: 인도 해시/상대링크/소스/검수영수증 검사 및 제한 사항 기록. 이는 예상 예산이지30분 완료 보장이 아니다. 7분까지 새 백업 복원 증명이 끝나지 않으면 그 시점의 검증된 stable 체크포인트(현재594944000바이트/be09a5f5의1.4)를 선택하고 새 백업은 추가 백업으로만 기록하는 대안을 메인이 판단한다. 최종 매니페스트의 backup은 반드시 실제 증명된 선택 스냅샷이어야 한다. 해당 stable의 정확한 snapshot 복원 근거가 없으면 버전명이나 파일 존재로 검증을 추론하지 않는다. 이전1.3/b515ef26 백업은 별도 역사적 fallback이며1.4 증거와 혼합하지 않는다.

## 실행 명령: 백업부터 복원

아래 `final_command`는 직접 get/logs/scale/wait와 매니페스트 도구를 별도 로컬 프로세스 그룹에서 실행하며 명시한 초와 원래 deadline 중 빠른 시각에 제한한다. 성공한 명령의 출력만 전달하고 실패/시간 초과 출력은 숨긴다. 합산32MiB를 넘는 출력은 실행 중 차단한다. 명령의 종료 상태를 회수하기 전에 그 명령이 만든 같은 프로세스 그룹의 잔여 작업도 종료한다. 상주 서비스나 터널을 시작하는 용도로 쓰지 않는다. 별도 세션으로 이탈한 자손·원격 작업 취소까지 보장하지 않으며 OS의 신호 처리/동기I/O 지연도 절대 실시간 보장은 아니다. 응답이 끊긴 scale/apply는 실제 상태를 조회한 뒤 다음 조치를 결정한다. 각 독립 셸에서 함수를 다시 정의한다. verify-release 자체도 remote 모드에서 원래마감·전체60초·kubectl20초 제한과 PASS 직전 검사를 적용하지만 로컬 동기 I/O/기존 git show까지 강제로 중단하려면 이 외부 wrapper가 필요하다.

다음은 동결 후 실행할 명령이다. 지금 실행하지 않는다. `set -e`가 있는 전용 셸에서 실패를 무시하지 않는다. 운영 터널3104/18884와 supervisor는 유지하며 별도3105/18885만 사용한다. 포트가 다른 프로세스 소유이면 종료하지 말고 비어 있는 포트로 아래 환경변수를 일관되게 바꾼다.

```sh
set -e
FINAL_EVIDENCE=deploy/verification/final-restore-20260921
FINAL_BACKUP=deploy/verification/final-backup-20260921.json
FINAL_RIG=grid-restore-final-20260921
FINAL_VERSION=$(node -p 'JSON.parse(require("fs").readFileSync("docs/operations/run.json")).deployment.productVersion')
RESTORE_HTTP_PORT=3105
RESTORE_MQTT_PORT=18885
export FINAL_EVIDENCE FINAL_BACKUP FINAL_RIG FINAL_VERSION RESTORE_HTTP_PORT RESTORE_MQTT_PORT
export RESTORE_API="http://127.0.0.1:$RESTORE_HTTP_PORT"
export RESTORE_MQTT="mqtt://127.0.0.1:$RESTORE_MQTT_PORT"
mkdir -p "$FINAL_EVIDENCE"
final_command() {
  final_command_limit="$1"
  shift
  python3 scripts/deadline-command.py --timeout-seconds "$final_command_limit" -- "$@"
}
BACKUP_METADATA_PATH="$FINAL_BACKUP" node scripts/remote-backup.mjs > "$FINAL_EVIDENCE/backup.log" 2>&1
FINAL_IMAGE=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).appImage' "$FINAL_BACKUP")
FINAL_BASENAME=$(node -p 'require("path").basename(JSON.parse(require("fs").readFileSync(process.argv[1])).remotePath)' "$FINAL_BACKUP")
FINAL_SHA=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).sha256' "$FINAL_BACKUP")
FINAL_LOCAL=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).localPath' "$FINAL_BACKUP")
export FINAL_IMAGE FINAL_BASENAME FINAL_SHA FINAL_LOCAL
python3 scripts/deploy-restore-rig.py --name "$FINAL_RIG" --image "$FINAL_IMAGE" --backup "$FINAL_BASENAME" --expected-sha256 "$FINAL_SHA" > "$FINAL_EVIDENCE/create.log" 2>&1
final_command 20 kubectl --context charles-k3s -n gs-plai-5h get pods -l "app=$FINAL_RIG" -o json > "$FINAL_EVIDENCE/pods.json"
node --input-type=module -e 'import{readFileSync}from"node:fs";import{verifiedAppPod}from"./scripts/pod-identity.mjs";console.log(JSON.stringify(verifiedAppPod(JSON.parse(readFileSync(process.argv[1])),process.argv[2])))' "$FINAL_EVIDENCE/pods.json" "$FINAL_IMAGE" > "$FINAL_EVIDENCE/runtime-identity.json"
final_command 20 kubectl --context charles-k3s -n gs-plai-5h logs deployment/"$FINAL_RIG" -c restore-database > "$FINAL_EVIDENCE/restore-init.log"
```

다음 터널은 위 변수를 export한 전용 셸의 자식 세션에서 시작하고 세션ID/PID를 기록한다. 별도 독립 셸은 부모 변수를 상속하지 않으므로 위 설정 블록의 선택값만 동일하게 다시 설정한 후 실행한다(백업 생성 명령은 다시 실행하지 않는다). 이하 병행 작업도 같은 export값을 상속하거나 명시적으로 동일값을 설정한다. final_command 셸 함수는 독립 셸에 자동 전달되지 않으므로 이 함수를 쓰는 후속 단계는 원래 전용 셸에서 실행하거나 함수 정의를 다시 읽는다. 후속 명령 전 변수 누락은 아래 guard로 실패시킨다.

```sh
: "${FINAL_RIG:?}" "${RESTORE_HTTP_PORT:?}" "${RESTORE_MQTT_PORT:?}"
kubectl --context charles-k3s -n gs-plai-5h port-forward --address=127.0.0.1 "deployment/$FINAL_RIG" "$RESTORE_HTTP_PORT:3001" "$RESTORE_MQTT_PORT:1883"
```

```sh
: "${RESTORE_API:?}" "${FINAL_LOCAL:?}" "${FINAL_EVIDENCE:?}" "${FINAL_VERSION:?}"
RESTORE_BACKUP_FILE="$FINAL_LOCAL" RESTORE_EVIDENCE_FILE="$FINAL_EVIDENCE/data.json" node scripts/remote-restore-check.mjs > "$FINAL_EVIDENCE/data.log" 2>&1
REMOTE_API="$RESTORE_API" EXPECTED_VERSION="$FINAL_VERSION" REMOTE_EVIDENCE_FILE="$FINAL_EVIDENCE/preview.json" node scripts/remote-preview.mjs > "$FINAL_EVIDENCE/preview.log" 2>&1
```

다음 두 가지는 별도 세션으로 병행한다. 원본 데이터 비교를 먼저 완료한다. 테스트 RTU는 현 백업에서 해당ID·풍력·2기·rated1000을 확인하고 fault 없음/125kW 도달 가능을 점검한다. 조건이 바뀌었으면 `REMOTE_PLANT_ID`를 생략하여 복원본에만 새 테스트RTU를 생성한다. 운영 앱에 테스트를 보내지 않는다.

```sh
: "${RESTORE_API:?}" "${RESTORE_MQTT:?}" "${FINAL_EVIDENCE:?}"
REMOTE_API="$RESTORE_API" REMOTE_MQTT="$RESTORE_MQTT" REMOTE_PLANT_ID=f49684af-b7dd-47b2-b360-8e7d28ef751b REMOTE_EVIDENCE_FILE="$FINAL_EVIDENCE/mqtt.json" node scripts/remote-integration.mjs > "$FINAL_EVIDENCE/mqtt.log" 2>&1
```

```sh
export PLAYWRIGHT_NODE_MODULES=/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
export API_TOKEN_FILE=artifacts/private/deploy/api-token
: "${RESTORE_API:?}" "${FINAL_EVIDENCE:?}"
export GRID_URL="$RESTORE_API"
QA_DIRECTORY="$FINAL_EVIDENCE/browser" node scripts/browser-check.cjs > "$FINAL_EVIDENCE/browser.log" 2>&1
QA_DIRECTORY="$FINAL_EVIDENCE/export" node scripts/browser-command-export.cjs > "$FINAL_EVIDENCE/export.log" 2>&1
```

모든 프로세스 exit0 및 각 result PASS를 확인한 후 summary.json에 백업 메타데이터 경로/remotePath/localPath/sha256/bytes, 복원deployment, imageID/UID, 각각의 결과 파일, 운영DB 미수정 여부를 기록한다. FAIL/누락은 PASS로 바꾸지 않는다. 메타데이터의 해시를 이전 백업 기록에서 복사하지 않는다.

```sh
final_command 20 kubectl --context charles-k3s -n gs-plai-5h scale deployment/"$FINAL_RIG" --replicas=0
final_command 95 kubectl --context charles-k3s -n gs-plai-5h wait --for=delete pod -l "app=$FINAL_RIG" --timeout=90s
final_command 20 kubectl --context charles-k3s -n gs-plai-5h get pods -l "app=$FINAL_RIG" -o json > "$FINAL_EVIDENCE/final-pods.json"
final_command 20 kubectl --context charles-k3s -n gs-plai-5h get deployment/"$FINAL_RIG" -o json > "$FINAL_EVIDENCE/scaled-zero.json"
```

직접 시작한 터널만 종료하고3105/18885 대기 프로세스가 없는지 확인한다. PVC/백업은 보존한다.

## 매니페스트와 새 미디어 결합

메인이 `run.json.backup`을 선택한 새 백업 메타데이터로 갱신하고 `stableCheckpoint`의 backupEvidence/recoveryEvidence를 이번 summary에 연결한다. acceptance OPS-05에도 같은 증거를 연결한다. 현재 `release-manifest.js`는 tracked 파일만 evidence에 포함하고 존재 자체로 수락을 판정하지 않는다. 따라서 새 복원증거/메타데이터/acceptance/run을 명시적으로 add/commit한 다음 매니페스트를 생성한다. 비밀 SQLite/자격증명은 add하지 않는다. 매니페스트가 해시한 원본 증거를 이후 수정하면 무결성 검증이 실패하므로 새로운 최종 미디어 증거는 별도 기록한다.

```sh
test ! -e artifacts/releases/final-20260921.json
final_command 30 node scripts/release-manifest.js artifacts/releases/final-20260921.json
final_command 70 node scripts/verify-release.mjs artifacts/releases/final-20260921.json --remote > deploy/verification/final-manifest-verification.json
```

미디어 입력의 releaseManifest를 위 경로로, approvedReleaseCommit을 manifest.source.commit으로, approvedImageDigest를 manifest.deployment.appImage의 digest로 설정한다. 실제 baseUrl은 운영3104, mqtt.url은18884여야 한다. 복원3105/18885를 최종시연 입력으로 남기지 않는다. 원고/장면/소스는 사전 준비를 재사용할 수 있지만 최종 캡처/영상/PPT는 동결 후 같은 매니페스트로 새로 생성한다.

```sh
node scripts/media/prepare-final-scenes.cjs artifacts/media-preparation/final-input.json
node scripts/media/record-demo.cjs artifacts/media-preparation/final-scenes.json
# recorder 종료 후 source/demo-recovery.json의 PASS/settingsMatched/기존RTU불변 확인
# 실패/중단이면 recorder 종료를 먼저 확인한 뒤 아래 독립 복구 절차 사용
# 실제 전체디코딩·장면·음성·자막·주장 검수 뒤 verification의 판정을 기록
# 사실 검수 후 입력 JSON으로 같은 영상의 해시/시간/시나리오 전이를 결합
node scripts/media/prepare-final-deck.cjs artifacts/media-preparation/final-deck-input.json
node scripts/media/build-deck.mjs artifacts/media-preparation/final-deck.json
```

`final-input.json`은 아직 자동 생성되는 파일이 아니다. 메인이 검증된 scenes-template/기존 준비설정에서 실제 releaseManifest/approvedReleaseCommit/approvedImageDigest/baseUrl/tokenFile/mqtt/csvFile/outputDir를 채워 생성해야 한다. 덱 또한 실제 새 영상 캡처/타임코드/검수영수증을 연결하여 final-deck.json을 만든다. 최종 모드는 동결창 및 검수된 같은 영상 조건을 강제한다. 정확한 미디어 인도물/육안검수는 MEDIA-PLAN.md와 DELIVERY-PLAN.md를 따른다.


`prepare-final-scenes`는 고유 UUID 시험 RTU 이름과 private lifecycle journal을 만들고 기존 RTU 설정 기준을 저장한다. 등록 실제201 응답을 보존하기 전에는 제어를 진행하지 않는다. 같은 출력 설정 파일을 덮어쓰지 않으며 중단 후 기존 파일/journal/실제 상태를 먼저 읽는다. 정상 녹화와 catch 경로는 소유 시험 RTU만 초기 모델·제어·재생·장애 설정으로 복구하고 기존 RTU의 불변을 확인한다. 프로세스 강제종료는 finally를 보장하지 않으므로, 종료한 녹화 핸들을 확인한 다음 `node scripts/media/recover-demo.cjs ABSOLUTE_PRIVATE_JOURNAL ABSOLUTE_TOKEN_FILE`로 원래 마감 내 독립 복구한다. 명령 응답 유실/복원 run 전이 미확인은 자동으로 추정하지 않으며 메인이 저장된 intent와 실제 상태를 대조한다. 기존 RTU에 일괄 reset을 보내지 않는다.

`final-deck-input.json`은 releaseManifest/videoDir/factsFile/outputConfig/presentationDir의 공개 저장소 상대 경로만 담는다. facts.template.json을 새 파일로 복사하고 실제 영상/장면/MQTT/복구/캡처 해시·선택 RTU·시나리오 run 전이·슬라이드 근거를 직접 검수한 뒤 reviewed=true, preparationTemplate=false로 표시한다. 바인더는 실제 원장 시각의 UTC 마이크로초 형식을 읽으며 원장을 다시 쓰지 않는다. 준비 template을 최종 검수 사실로 대체하지 않는다.
