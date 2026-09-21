# 최종 시연 제작 계획

최종 제작 시점은 run.json의 freezeAt 이후이며 현재 파일은 준비 계획이다. 영상과 발표자료는 당시 검증된 동일 커밋·이미지·PRD 버전을 사용한다. 인증 토큰·암호·개인 데이터가 화면·음성·자막에 나타나지 않게 로그인 후 녹화를 시작한다.

## 영상 흐름

1. 실제 배포 대시보드: 가상 발전단지와 SCADA → RTU → MQTT → 외부 VPP 시험 목적, 실물 제어가 아닌 범위를 설명한다.
2. CSV/TSV 등록: 시각·출력·전압·전류, 단지 유형과 발전기 구성, 좌표 기본값 출처를 보여준다.
3. 발전 제어: 풍력·태양광·복합 장면, 풍향과 회전, 마우스 드래그/휠, 출력 제한·정지·기동 및 일치하는 계측값을 보여준다.
4. RTU: 선택·검색·연결·건강 상태, 전체 발전기 데이터, 60초 샘플과 QoS1/outbox의 의미를 설명한다.
5. 실제 외부 VPP 제어: 충분한 가용량의 검증 단지에125kW를 요청하고 accepted/executing/completed와 actual125/error0을 실제 관측한 화면 및 보고서로 보여준다. 완료 이전 상태를 성공으로 편집하지 않는다.
6. 장애 실험: 오프라인 상태 수집·복구, 센서중단의 결측 의미, 지연/손실 및 중복 가능성을 보여준다.
7. 시나리오·가이드: 저장·복원·새 runId, RTU별 토픽과 규격 다운로드를 소개한다.
8. 검증 및 한계: k3s 이미지/영속 복원 증거, 실측 결과, 남은 취약점·외부 연동 제한을 사실대로 마무리한다.

## 제작·검수

- 실제 브라우저 연속 녹화,1920×1080, 한국어 음성·자막. 단순 스크린샷 슬라이드쇼를 시연으로 대체하지 않는다.
- 브라우저에 포인터 및 클릭 표시를 넣고 실제 이동을 녹화한다. 주요 제어·상태 읽기 장면에서 제한적으로 확대/축소하여 문맥을 유지한다.
- 녹화용 fixture와 실제 운영 상태를 구분하고 시연을 위해 주입한 가상 발전량/장애를 명시한다.
- FFmpeg로 전체 영상 디코딩, 해상도·길이·음성 존재를 확인한다. 대표 프레임에서 한글·마우스·강조·잘림을 확인한다.
- 최종 영상 이후 편집 가능한 PPTX를 작성하고 전 슬라이드 렌더링·육안 검수, 발표자 노트에 영상 파일과 타임코드를 연결한다.
- artifact-tool 한글 PPTX2장 사전 제작/렌더링은 성공했다. artifacts/media-preparation/presentation-pilot/는 최종 인도물이 아니다.

## 재현 가능한 제작 도구 (동결 전 준비)

`scripts/media/record-demo.cjs`는 장면 JSON의 실제 Playwright 조작을 연속 녹화한다. Yuna 한국어 음성, 실제 조작 포인터·클릭 링, 완만한 확대·축소, 화면에 표시하는 한국어 자막 및 별도 SRT를 만든다. `scenes.json`은 실제 장면 시간과 클릭 시각을 보관한다. 원본 브라우저 영상·음성·장면 캡처·VPP 클라이언트 결과도 source 아래에 보관한다. 전체 디코딩 후 검증 JSON은 육안/주장 검수를 `pending`으로 남긴다.

- 개요: `scripts/media/scenes-template.json` (현재 8장면 약4분 초안, 빈 actions는 반드시 실제 조작으로 채운다).
- 지원 조작: `click`, `fill`, `select`, `upload`, `assert`, `move`, `scroll`, `drag`, `press`, `wait`, `dispatch`.
- 대상은 CSS `selector`, 접근성 `role`/`name`, `label`, 정확한 `text` 중 하나다. 필요하면 `exact:false`를 사용한다.
- `dispatch`는 해당 RTU에 scripts/vpp-client.js를 실제 실행한다. config의 mqtt.url/username/passwordFile/prefix를 사용하며 action에 rtuId/targetKw/timeoutSeconds를 지정한다. 결과 파일의 관측된 completed 및 actualKw를 확인하고 실패 시 성공 영상을 생성하지 않는다. 기본20초 제어 제한, 도구90초 상한이다.
- 영상 재생 시 자막을 끄더라도 읽을 수 있도록 한글 자막을 영상에 합성한다. 별도 선택 가능한 자막 트랙은 중복 표시 방지를 위해 기본 비활성이다.
- 확대는 scene.zoom.scale(최대1.25)로 지정하며 중앙을 기준으로 1초 동안 점진적으로 진입·복귀한다. 해당 조작 대상을 화면 중앙에 배치하고, 확대가 화면 결과를 자르지 않는지 프레임으로 확인한다.
- 인증은 녹화 시작 전 세션 저장소로 전달한다. 토큰·암호는 파일에서 프로세스 메모리로 읽고 내보내기 JSON에 넣지 않는다. 화면에 로그인이나 비밀값을 노출하지 않는다.

`scripts/media/build-deck.mjs`는 artifact-tool로 14장 기본 개요의 텍스트와 구조도를 편집 가능한 객체로 작성한다. 최종 영상 검증 완료와 동일 릴리스 매니페스트 해시를 확인한 뒤 작성한다. 실제 최종 화면은 각 슬라이드의 image 경로로 삽입한다. 최종 패키지를 재수입하여 모든 슬라이드를 PNG로 렌더링한다. 무결성·폰트·배치 검증은 자동이지만 모든 슬라이드의 육안 검수는 별도다.

두 템플릿의 `preparationTemplate:true`는 최종 출력 방지장치다. 최종 문구·actions·근거·타임코드를 채우고 false로 변경해야 한다. 최종 실행은 run.json의 freezeAt 이후, deadlineAt 이전에만 가능하다. `--rehearsal`은 항상 artifacts/media-preparation 안에 출력하며 최종 인도물로 처리하지 않는다. 기존 출력이 있으면 덮어쓰지 않는다. 영상·PPT 소스 코드는 기존 pilot 파일과 독립적이다.

## 마지막 30분 실행 순서

1. 0~3분: 정상 커밋/이미지/호환 DB를 확정한다. 릴리스 매니페스트를 고정하고 원격 터널·UI·MQTT를 확인한다. 사전 준비한 final-scenes.json의 approvedReleaseCommit/imageDigest를 실제 확정 값으로 채운다. 녹화 전 단지·장애·시나리오를 점검하며 시연용 합성 데이터를 명확히 표시한다.
2. 3~10분: `node scripts/media/record-demo.cjs artifacts/media-preparation/final-scenes.json`을 실행한다. 실제4분 조작, 음성·합성·디코딩이 뒤따른다. 완료 직후 조작한 장애/제어 설정을 인도 상태로 복구한다.
3. 10~14분: 시작/중간/끝과 클릭·확대 프레임, 자막·음성·실측 VPP 결과를 검토한다. 필요 시 오류를 수정해 별도 출력 디렉터리로 재녹화한다. verification.json의 visualReview/claimsReview는 실제 검수 뒤에만 passed로 갱신한다.
4. 14~21분: final-deck.json에 실제 장면 캡처·확정 결과·근거 경로·영상 타임코드를 채운다. `node scripts/media/build-deck.mjs artifacts/media-preparation/final-deck.json`으로 PPT를 생성한다. 영상은 발표자료 기준 `../video/GRID-VPP-demo-ko.mp4`로 안내한다. 배포 파일을 옮길 때 video와 presentation의 상대 폴더 구조를 유지한다.
5. 21~27분: 모든 슬라이드를 각각 열어 한글·잘림·캡처·표현·근거를 확인하고 사실과 불일치한 내용을 수정한다. 자동 검증 성공을 육안 검수로 대신하지 않는다. 내용 수정 시 새 출력 경로로 재생성한다.
6. 27~30분: MP4/SRT/원고/장면 JSON/제작 소스/대표 프레임/PPT/노트/검수 기록을 연결하고 최종 버전과 미완료를 정직하게 기록한다. deadlineAt을 넘겨 완료했다고 표시하지 않는다.

사전 리허설 결과: 한국어 음성·실제1920×1080 UI·포인터·점진 확대·하드 자막이 포함된 12.97초 영상의 전체 디코딩을 확인했다. artifact-tool로 편집 가능한14장 패키지를 생성하고 최종 패키지 재수입 후 전 장 렌더링을 확인했다. 표지/구조도/텍스트의 대표 렌더는 한글과 배치가 정상이다. 이것은 최종 영상/슬라이드의 내용 검수나 최종 릴리스 성공 증거가 아니다.

전체 리허설용 `scripts/media/prepare-rehearsal.cjs`는 localhost:3101에만 접근하여 고유 이름의 풍력·태양광 fixture를 만들고 CSV UI등록으로 복합 단지를 추가하는 8장면 JSON을 준비한다. 다른 기존 단지는 변경하지 않는다. 이 준비기를 원격 최종 배포에 사용하지 않는다. 최종 녹화용 데이터와 ID는 메인이 동결 버전에서 별도로 확인한다. 전체 흐름은 CSV등록, 3D드래그 및 유형 전환, 상한/정지/기동, RTU메트릭, 별도MQTT125kW, 통신/센서 장애복구, 재생/시나리오, 가이드를 포함한다.

음성은 문장별로 합성하고 각 오디오의 실제 길이를 측정한 뒤 결합한다. SRT 시작/종료 시각은 해당 문장 음성의 누적 길이에 연결한다. 장면의 남는 대기시간까지 자막을 억지로 늘리지 않는다. 전체 JSON의 실제 `cues`와 최종 음성·자막을 함께 점검한다. 리허설 배너는 모든 녹화 화면 상단에 표시하며 최종 모드에서만 빠진다. 등록/선택 조작은 실제 UI의 카드와 select를 구분한다. select를 포함한 래핑 label에는 옵션 텍스트가 포함되므로 label 선택자는 기본 부분일치로, role/text는 기본 정확일치로 동작한다.

## 동결 버전 자동 연결과 전체 리허설 결과

`scene-plan.cjs`는 시험을 마친8장면 조작을 공유한다. `final-input-template.json`의 URL·MQTT 터널·자격증명 파일·확정 커밋/이미지를 입력한 뒤 `node scripts/media/prepare-final-scenes.cjs artifacts/media-preparation/final-input.json`을 실행한다. 이 명령은 동결 창 안에서만 실행되고, 실제 API 버전과 새 릴리스 매니페스트의 제품 버전이 같은지 확인한다. 기존 풍력·태양광 단지의 정확한 이름을 읽고 시연 전용 새 복합 단지를 UI에서 등록하는 장면을 만든다. 기존 단지의 설정을 변경하지 않는다. 결과 final-scenes.json으로 녹화를 실행한다. 기존 예비 매니페스트를 최종 확정 매니페스트로 간주하지 않는다.

제품1.1.0 후보의 CSV 해석 미리보기를 등록 장면 안에 넣었다. 1.0.0으로 복원하면 그 조작과 관련 설명을 포함하지 않는다. 미리보기 버튼·정규화 결과·실제 canvas 상대좌표 드래그는 인증된 localhost:3103에서 별도39.07초 리허설을 완료했다. 녹화43.828초, pageErrors 없음, 오디오 평균 -19.6dB, 전체 디코딩 성공이다. 실제 3D 시점이 달라진 전후 캡처와 입력 단위/UTC/KST 미리보기 프레임을 확인했다.

전체8장면 리허설은 localhost:3101에서241.37초 영상으로 완주했다. 음성 생성·실제 녹화·단일 인코딩·자막트랙 추가·대표프레임·전체 디코딩까지265.769초가 걸렸다. 직접 생성한 전용RTU에서 MQTT 명령742b22d4-3bbc-48a1-af98-ce9d8119a606의 accepted/executing/completed, actual125/error0을 수신했다. 이 리허설 영상에서 발견한 카메라 고정좌표와 결과표 위치는 이후 canvas 상대좌표와 중앙 스크롤로 수정했고 별도 집중 회차로 확인했다. 따라서 이전 전체 리허설 영상을 최종본으로 재사용하지 않는다.

발표자료도14장 전체를 export→무결성/폰트/기하 검사→최종 PPT 재수입→전장 렌더링했다. 전장 개별 육안 검수에서 한글·본문·이미지·구조도의 잘림/겹침이 없음을 확인했다. 실제 최종 내용은 영상 제작 뒤 갱신하며 현재 리허설은 로컬1.0.0 흐름과1.1.0 후보의 보완 캡처를 함께 사용한 제작 검증이다. 동일 최종 릴리스 검증 자료가 아니다.

최종 입력 예시는 `scripts/media/final-input-template.json`이다. 실제 MQTT 터널 포트를 확인한 후 복사해 사용한다. 생성된 final-scenes.json은 녹화 직전8장면 조작을 검토할 수 있는 실행 계획이며, 토큰·암호 본문을 포함하지 않는다. 본문 값을 입력하지 말고 파일 경로만 전달한다. 최종용 기존 출력이 있으면 새 outputDir로 생성하며 기존 정상 산출물을 덮어쓰지 않는다. 리허설 추가 실행은 rehearsalName으로 별도 artifacts/media-preparation 하위 폴더를 선택할 수 있다.

## 제품1.2 명령 상태 내보내기 준비

확정 매니페스트 제품 버전으로 기능을 선택한다. 1.0은 미리보기/내보내기를 제외하고, 1.1은 CSV 미리보기만, 1.2 이상은 기존 명령 장면에 최근 명령 상태 JSON 다운로드를 추가한다. 새 장면은 늘리지 않는다. `release-features.cjs`가 버전 선택을, `validate-command-download.cjs`가 선택 RTU·schemaVersion1·contractVersion2·scope·최대20개 및 DTO 허용 필드와 알려진 자격증명 미포함을 확인한다. 잘못된 RTU, 21행, 원본 request/reason 필드는 거절한다.

인증된 localhost:3103의1.2.0 후보에서 읽기 전용 UI 다운로드를22.03초 집중 리허설로 검증했다. 제작23.279초,1920×1080 H264/AAC, 전체 디코딩 성공, pageErrors=[], 음성 평균 -17.6dB이다. 선택 RTU의 실제4개 저장 상태를 내려받았다. 최대20개라는 범위이며 외부 VPP 수신 증거나 전체 감사 이력이 아니라는 내레이션/자막을 포함한다. 중앙 확대가 우측 버튼을 자르는 문제를 발견해 내보내기가 포함된 명령 장면은 전체 프레임을 유지하고 다른 장면의 점진 확대는 유지했다. 수정 프레임에서 버튼·포인터·자막을 확인했다.

근거는 `artifacts/media-preparation/focused-command-export-v12-final-framing/verification.json`, 같은 폴더의 source/recent-command-states.json, `artifacts/media-preparation/command-export-validation.json`이다. 로컬 후보의 제작 검증이며 예비 매니페스트 정보는 최종 버전 증거가 아니다. 동결 시각/커밋/이미지/매니페스트 일치 및 최종 영상 검수 후 PPT 제작 방지장치는 유지한다. 최종 디렉터리는 생성하지 않았다.

## 인도 전 일치 검사 보강

최종 영상 준비기와 녹화기는 `release-binding.cjs`로 확정 커밋·실제 이미지 digest·runId·런타임 커밋·제품 버전·k3s 대상·HTTP/MQTT 접속 경로를 실행 기록과 비교한다. 유효하지 않은 일정이나 다른 이미지/로컬 fixture 경로는 거절한다. 녹화 직전에는 `verify-release.mjs --at-commit --remote`로 파일 해시와 실제 Ready 컨테이너 이미지를 다시 확인하고 결과를 영상 source 아래에 보존한다.

PPT 제작기는 같은 릴리스의 검수 완료 영상이더라도 연결된 실제 MP4의 SHA가 다르면 거절한다. PPT 검증 기록은 사용한 영상 SHA를 남기며, 인도 검사기는 이 값과 PPT에 복사된 영상 검수 기록·현재 MP4를 함께 비교한다. 생성 소스·정확한 설정·사용 이미지·검증 영수증·상대 경로용 설정을 PPT 폴더 내부에 보존한다. 전체 구조와 실행 방법은 DELIVERY-PLAN.md에 있다.

`node scripts/verify-delivery.mjs --manifest artifacts/releases/FINAL_MANIFEST.json --report artifacts/delivery/FINAL_INVENTORY.json`는 완성된 파일의 존재·해시·상대 영상 연결·재생성 자료를 검사한다. 보고서 경로는 새 파일을 사용한다. 누락/불일치는 종료코드1과 INCOMPLETE이며, 통과해도 ARTIFACT_CHECKS_PASSED 및 completionClaim:false다. 이 검사는 실제 동작·디코딩·육안/주장 검수·인수/운영시간 게이트를 대신하지 않는다. 현재 최종 영상/PPT 미생성 상태와 과거 리허설을 최종본으로 넣는 경우가 거절됨을 확인했다.
