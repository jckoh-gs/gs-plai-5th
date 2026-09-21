# 최종 인도 계획

이 문서는 GOAL §16의 인도 파일을 준비하는 계획이다. 최종 완료 판정이나 최종 릴리스 선언이 아니다. [실행 시간](run.json)의 동결 이후에만 새 영상을 만들고, 검수한 영상 다음에 같은 릴리스로 PPT를 작성한다. 마감은 연장하지 않는다. 예비 `artifacts/releases/current.json`을 검증 없이 최종 매니페스트로 사용하지 않는다.

## 전달 구조와 휴대성

저장소 루트를 전달 기준으로 유지한다. `artifacts/video/`와 `artifacts/presentation/`은 형제 폴더다. PPT 노트의 영상 참조는 `../video/GRID-VPP-demo-ko.mp4`이며 두 폴더를 함께 이동한다. 문서의 저장소 상대 근거 경로도 함께 보존한다. 공개 전달본에 `artifacts/private/`, `.env`, kubeconfig, API/MQTT 암호·토큰, 원본 Secret 매니페스트, 비밀번호 포함 URL을 넣지 않는다. 운영자가 필요한 자격증명은 기존 승인된 비밀 저장 경로로 별도 유지한다.

## 영상 묶음

- `artifacts/video/GRID-VPP-demo-ko.mp4`: 동결 배포에서 새로 녹화한 한국어1920×1080 H264/AAC 영상. 실제 포인터·클릭과 적절한 점진 확대, 합성 자막을 포함한다.
- 같은 폴더 `GRID-VPP-demo-ko.srt`, `narration-ko.md`, `scenes.json`: 문장 음성에 연결한 자막, 한국어 원고, 실제 장면 시작·끝·조작 시각이다.
- `source/`: 브라우저 원본 WebM, 문장/장면 음성 AIFF, 실제 UI 캡처, MQTT 실행 결과, 지원 버전의 명령 상태 다운로드. 기록의 최근 저장 상태를 외부 VPP 수신 증거나 전체 감사 이력이라고 표현하지 않는다.
- `frame-*.png`, `verification.json`: 시작·중간·끝 및 상호작용 대표 프레임, 전체 디코딩·오디오·화면 크기·버전·해시·육안/주장 검수 결과. `passed`는 실제 최종 검수 후에만 기록한다.
- 재생성 입력/소스: 실제 사용한 장면 설정의 비밀 없는 보관본, 합성 CSV, `record-demo.cjs`, `recording-sources.cjs`, `scene-plan.cjs`, `release-features.cjs`, `validate-command-download.cjs`, `release-binding.cjs`, 최종 바인더와 VPP 클라이언트 및 그 의존 소스. 자격증명 파일의 내용은 복사하지 않는다. 메인의 영상 패키징 작업과 최종 inventory 검증기가 실제 파일 목록·해시를 확정한다.

## 발표자료 묶음

- `artifacts/presentation/GRID-VPP-presentation-ko.pptx`: 같은 최종 릴리스의 편집 가능한16:9 한국어12~15장. 실제 최종 UI와 편집 가능한 구조도를 포함한다.
- `speaker-notes.md`: 각 슬라이드 설명·영상 상대 파일명·실제 타임코드·근거. PPT 내부 노트에도 동일 연결을 보관한다.
- `slide-01.png`부터 마지막 장까지: 최종 PPTX를 다시 가져와 렌더링한 전 장 이미지. 개별 육안 검수에서 한글·겹침·잘림·해상도·가독성을 확인한다.
- `verification.json`, `validation.json`: 사람이 확인한 내용/화면 판정과 패키지 무결성·폰트·배치·재수입의 자동 검사. 자동 검사는 최종 내용이나 PowerPoint 네이티브 실행을 검증한 것으로 확대 해석하지 않는다.
- `source/config.original.json`: 실제 입력의 정확한 바이트. `reproduction-manifest.json`에 해시를 기록한다.
- `source/config.portable.json`, `source/build-deck.mjs`, `source/assets/slide-NN.png`: 경로를 묶음 기준으로 바꾼 설정, 실행한 생성 소스, 사용한 모든 화면 이미지.
- `source/release-manifest.json`, `source/video-verification.json`, `docs/operations/run.json`: 작성 시점의 릴리스/영상/시간 근거 스냅샷. 발표자료 폴더 안에서 원래 저장소를 다시 읽지 않아도 재생성할 수 있다.
- `source/REGENERATE.md`: artifact-tool·발표자료 스킬 런타임·Node/Python·폰트 의존성 안내. 인도 폴더에서 `node source/build-deck.mjs source/config.portable.json --rehearsal`로 재생성한다. 재생성은 리허설로 표시하며 최종 판정이나 동결 제한을 우회하지 않는다. 원본 최종 PPT를 덮어쓰지 않는다.

`build-deck.mjs`는 입력의 자격증명 필드/비밀 파일 참조를 거절하고, 이미 파일이 있는 출력 폴더를 덮어쓰지 않는다. 최종 모드의 동결 창과 먼저 완료·검수한 같은 릴리스 영상 조건은 유지한다. 검증 영수증을 준비 폴더에만 남기던 문제와 설정/이미지 원본 누락을 위 묶음으로 해결했다. 런타임 패키지와 폰트 바이너리는 재배포하지 않으며 수신 환경에 설치가 필요하다.

## 소프트웨어·운영·근거 연결

- 실행 가능한 소스/커밋/태그/실행 절차: [README](../../README.md), 최종 선택된 [릴리스 폴더](../../artifacts/releases/), Git 전달 상태. 작업 트리와 이미지가 같은 최종 소스를 가리키는지 확인한다.
- 소프트웨어 전달은 미디어 inventory와 별도로 확인한다. 선택 manifest의 `source.commit`·`source.hashes`에서 `samples/wind.csv`, `samples/solar.csv`, `samples/hybrid.csv`, `package.json`, `package-lock.json`, `tests/`와 `scripts/`를 실제 Git 객체/전달본과 대조한다. 정확한 runtime commit과 이후 운영·근거 commit을 구분하고, 원격 branch/tag가 그 커밋을 포함한다는 근거 및 파일 수·해시 결과를 최종 인도 기록에 넣는다.
- charles-k3s 배포/이미지/접속/PVC: [배포 절차](../../deploy/README.md), [배포 매니페스트](../../deploy/app.yaml), [배포 검증](../../deploy/verification/). 매니페스트의 확정 이미지 digest와 현재 실행 중 이미지, API 버전, 최종 미디어를 대조한다.
- 백업/복원: 확정 릴리스의 backup 필드, `deploy/verification/`의 해당 버전 백업·복구 기록, [체크포인트](CHECKPOINT-3.md). 백업 실파일 위치/해시·DB와 소스 호환·복구 후 기능 검증을 연결하고 공개 묶음에 비밀 백업을 무조건 포함하지 않는다.
- 요구사항/변경/아이디어: [PRD](../PRD-VPP-SCADA-RTU.md), [PRD 변경 이력](../product/PRD-CHANGELOG.md), [아이디어](../product/IDEAS.md).
- API/MQTT/클라이언트: [프로토콜](../protocol.md), [계약](CONTRACTS.md), [실행 클라이언트](../../scripts/vpp-client.js), 실제 앱의 연동 가이드. 최종 contractVersion과 클라이언트 버전을 대조한다.
- 수락/독립 검토: [요구사항 수락 결과](../product/acceptance.json), [제품 검토](../product/), 해당 최종 릴리스 evidence 목록과 파일 해시. 로컬·실제 k3s·외부 VPP/AWS 미검증 범위를 구분한다.
- 보안: [취약점 관리](../security/VULNERABILITY-MANAGEMENT.md) 및 연결된 스캔·패치·미해결 근거.
- 이슈/해결/회귀: [이슈 목록](../issues/ISSUES.md) 및 연결 근거. 미완료 이슈를 없던 것으로 표시하지 않는다.
- 실제 시간/한계: [실행 시간](run.json), 실제 동결·종료 기록, [미디어 계획](MEDIA-PLAN.md). 마감까지 미완료이면 부분 완료와 누락을 명시한다.

`scripts/verify-software-delivery.mjs`는 선택된 과거 source/runtime Git 객체와 새로 조회한 승인된 origin의 main·두 annotated tag를 대조한다. source의 server/web/samples/scripts/tests 전체 목록은 빠짐없이 존재해야 하고 비어 있을 수 없다. 필수 샘플3종·package/lock, runtime 전체 파일, 추가 README·`.env.example`·Compose·로컬 Mosquitto 설정4종도 실제 regular blob으로 해시한다. 이4종은 기존 불변 manifest를 수정하지 않고 supplemental inventory로 구분한다. 이후 main의 운영 파일은 별도 목록이며 과거 source와 같다고 주장하지 않는다. runtime 파일만 main에서도 동일해야 한다.

호출 시 manifest와 두 태그 및 새 출력 파일을 명시한다. 출력 부모는 이미 존재하는 별도 근거 폴더여야 한다. 예를 들어 현재 안정 체크포인트 확인은 다음과 같다.

```sh
python3 scripts/deadline-command.py --timeout-seconds 70 -- node scripts/verify-software-delivery.mjs --manifest artifacts/releases/checkpoint-1.7.1.json --checkpoint-tag stable-v1.7.1 --runtime-tag stable-runtime-v1.7.1-40b9ed8 --output artifacts/checkpoints/software-delivery-1.7.1/checks.json
```

완료 판정은 원래 실행의 **exit0 + stdout 영수증 + outputSha256와 실제 checks.json 일치**를 함께 요구한다. 중단 또는 fsync 중 마감 초과 뒤 파일이 남을 수 있으므로 파일 자체는 `SOFTWARE_GIT_CHECKS_RECORDED` 및 `requiresSuccessfulExitReceipt=true`로 기록한다. 파일 존재만으로 PASS로 취급하지 않는다. 원격 Git 읽기 실패·누락 객체·다른 manifest·비정상 경로는 거절하며 fetch/push/원격 변경이나 전체 목표 완료 선언은 수행하지 않는다. 실제 시험 실행·비밀값 검사·배포·미디어 검수는 기존 별도 증거가 필요하다.

최종창에서는 최종 선택 manifest를 포함한 커밋을 원격 main과 새 불변 checkpoint 태그에 전달한 뒤 같은 검사를 새 출력 경로로 수행한다. 이미 존재하는 stable 태그를 이동하거나 과거 source/runtime 커밋을 덮어쓰지 않는다. 준비 단계의 검사 결과를 이후 최종 refs 관측으로 재사용하지 않는다.

[현재1.7.1 준비 관측](../../artifacts/checkpoints/software-delivery-1.7.1/summary.json)은 source188/runtime28/추가4/main194파일을 실제 Git 객체와 대조했다. source의 scripts81/tests63/samples3 및 package/lock을 포함하며 main5afd224·stable태그c9b·runtime태그40b의 원격 refs를 조회했다. [실행 영수증](../../artifacts/checkpoints/software-delivery-1.7.1/execution.json)의 원래 handle11253 종료0/stdout/정확 파일 SHA를 함께 확인했다. 이는 해당 관측의 전달 근거이며 최종창의 새 refs 관측과 미디어 인도를 대신하지 않는다.

[독립 제품 검토048](../product/REVIEW-048.md)은 저장된 refs/종료 영수증과 실제 로컬 Git 객체의 해시·포함 관계를 대조했다. 현재 준비 인도 공백은 채웠지만 최종 시점의 선택·원격 상태는 다시 관측해야 한다.

## 동결 전 역할 판정 수집

원래 동결 10분 전인 **2026-09-21T21:27:33.079009Z**부터 선택할 정상 릴리스에 대한 제품·보안·이슈 역할의 마지막 검토를 수집한다. 제품은 채택·보류 아이디어와 요구별 잔여 판정, 보안은 정확 lock/image 및 미적용 취약점의 담당·완화·재검토 조건, 이슈는 미해결 사항·원인 미확정·후속 조치를 확인한다. 이는 준비 시각이며 원래 동결/마감을 바꾸지 않는다. 실제 종료 시 변경분과 담당의 종료 판정을 다시 연결하고 OPS02/AT-OPS03 근거로 남긴다. 기존 문서 링크의 존재나 이 계획 자체를 역할 종료 증거로 취급하지 않는다. [REVIEW042](../product/REVIEW-042.md)의 인도 공백 점검을 따른다.

## 최종 인벤토리 검증 순서

메인이 최종 inventory를 만든다. 먼저 확정 커밋·이미지·백업·런타임을 선택하고, 위 전달 파일 존재/해시/상대 링크/비밀 제외를 검사한다. 영상 전체 디코딩 및 화면·음성·자막·주장을 확인한 뒤 PPT 전 장과 노트·타임코드를 확인한다. 각 미디어 검증 JSON, 릴리스 매니페스트 해시, 실제 배포 버전을 대조한다. 모든 요구사항의 최신 판정과 미완료 목록을 연결한 후에만 인도 상태를 기록한다. 리허설 폴더를 최종 산출물로 대체하지 않는다.

발표자료의 최종 모드는 영상 imageDigest와 릴리스 appImage의 정규화된 digest 일치, 상대 영상 경로에 실제로 있는 MP4의 SHA-256과 검수 기록의 일치도 확인한다. 다른 파일이나 바뀐 영상을 노트에 연결한 상태로 제작하지 않는다.

패키징 사전 시험: `artifacts/media-preparation/deck-portable-packaging-verified/`에서14장 렌더·6개 이미지·13개 보존 파일 해시·정확한 입력 바이트를 확인했다. 이 폴더를 작업 기준으로 portable 설정과 복사된 소스만 실행하여 두 번째14장 리허설 생성도 성공했다. 리허설이며 최종 콘텐츠 검수나 최종 산출물이 아니다.

최종 영상/원본 WebM/음성 및 인도 압축본은 Git에서 제외하되 로컬 인도 경로에 보존한다. Git 제외는 삭제나 산출물 생략이 아니다. 두 미디어 폴더와 인도 목록을 함께 제공하고 필요시 상대 경로를 유지한 압축본을 만든다. 비밀 폴더/운영 DB/자격증명 내용은 그 묶음에 포함하지 않는다.

인도 검사기는 두 source/release-manifest.json이 선택된 매니페스트와 같은지, PPT 구조·배치·폰트·재수입 검증 영수증도 실제로 통과했는지 확인한다. 이 검사들은 육안/내용 검수의 대체가 아니다. 관련 보호·보존·불일치 거절 시험18개를 통과했다.

발표자료 구성 설정은 `prepare-final-deck.cjs`와 `final-deck-binding.cjs`로 검수한 실제 영상에 연결한다. `facts.template.json`은 사전 검토용이며 최종물에 그 값을 그대로 제출하지 않는다. 실제 사용한 facts JSON 및 SHA-256, 바인더 두 파일과 release-features.cjs/validate-command-download.cjs를 최종 PPT 재생성 소스 묶음에 포함하고 인벤토리에서 확인해야 한다. build-deck는 source/facts.original.json과 source/deck-binding-input.json 및 네 바인더 의존소스를 자동 보존하고 모든 해시를 reproduction-manifest에 포함한다. portable 설정은 묶음 내부 facts 경로를 사용한다. 본문/노트는 reviewed facts, 시간은 실제 scenes.json, 캡처는 같은 video/source, 과거 복구 주장은 선택 manifest의 정확한 evidence 해시를 기준으로 한다.


영상의 `source/demo-recovery.json`에는 실제201 등록 응답으로 확인한 소유 RTU, 실제200 시나리오 run 전환, 초기 설정 복구 및 기존 RTU 불변 결과를 보관한다. 같은 객체를 verification.demoRecovery에 연결한다. private journal 원본은 인도 묶음에 넣지 않는다. 재생 seed 복원은 기존 API 의미상 난수 상태를 재초기화하며 과거 시간·출력·난수 궤적 복원을 주장하지 않는다. scenario runId 전환 때문에 baselineHash와 actualHash가 달라질 수 있으며 settingsMatched 및 기록된 전이를 함께 확인한다.

인도 검사는 복구 기록/PPT facts/바인더 입력·소스 누락과 해당 영상·장면·MQTT 보고서·릴리스·복구 파일의 해시 불일치를 거절한다. 이 검사의 통과만으로 실제 운영/육안 검수 또는 전체 목표가 완료되었다고 선언하지 않는다.
