# 최종 시연 제작 계획

최종 제작 시점은 run.json의 freezeAt 이후이며 현재 파일은 준비 계획이다. 영상과 발표자료는 당시 검증된 동일 커밋·이미지·PRD 버전을 사용한다. 인증 토큰·암호·개인 데이터가 화면·음성·자막에 나타나지 않게 로그인 후 녹화를 시작한다.

원고 revision1은 [REVIEW050](../product/REVIEW-050.md)의 의미 검토에 따라 측정한 값·메시지 아이디·제이슨 파일·새 실행 아이디 등7표현을 반영했다. [실제 후보 음성 대조](../../artifacts/checkpoints/audio-narration-adopted-r1/review.json)에서 일부 인식 차이가 남아 있으므로 직접 청취·발음 적합으로 표현하지 않는다. 화면의 JSON·난수 시드와 기술 계약은 유지했다. 최종 MP4의 새 로컬 전사·실제PCM 길이 검증·성공 종료 및 해시 영수증 절차는 [음성 검수 준비](AUDIO-REVIEW-PREPARATION.md)를 따른다.

현재 선택은 **제품1.7.1 / PRD1.15 / runtime40b9ed8 / image234ec56**이다. [REVIEW045](../product/REVIEW-045.md)의 동일5ff 복원과 [REVIEW046](../product/REVIEW-046.md)의 [불변 checkpoint](../../artifacts/releases/checkpoint-1.7.1.json)·2033해시 검증, [원격 태그 근거](../../artifacts/checkpoints/release-1.7.1/tags.json)를 따른다. 현재 준비 입력은 [scripts/media/facts.template.json](../../scripts/media/facts.template.json)의1.7.1/1.15이며 reviewed=false/preparationTemplate=true다. 아래 과거 버전 리허설·호환 검토는 당시 이력이고 최종 영상/PPT가 아니다. 동결21:37:33Z/종료22:07:33Z는 유지한다. 최종 선택·실제 영상 검수 후에만 새 facts를 확정한다.

[최종 입력 준비 점검](../../artifacts/checkpoints/final-input-1.7.1-preparation/summary.json)은 실제3104/18884 경로·0600 자격증명 파일 존재·합성CSV의 등록 파서 결과를 확인했다. 자격증명 내용은 복사하지 않았다. 입력 예시의 매니페스트 경로는 예비 current.json 대신 명시적 final-20260921.json으로 정정했으며 승인 커밋/이미지는 여전히 POPULATE_AT_FREEZE다. 이 준비본을 최종 입력으로 실행하지 않는다. 원래 동결창에서 실제 검증한 선택 manifest에 맞춰 두 승인값을 채우고 다시 대조한다. 최종 영상/발표자료/장면 설정은 아직 생성하지 않았다.

음성은 [독립 기술 검수 준비](AUDIO-REVIEW-PREPARATION.md)에 따라 실제 문장 파일의 디코딩·신호·길이와 원고/SRT 동기를 별도로 확인한다. 이 검사는 직접 청취나 발음 품질 판정을 대신하지 않는다. 로컬 전사 도구 준비 여부와 범위도 같은 문서의 최신 후속 기록을 따른다.

원고·동작 revision2는 [REVIEW052](../product/REVIEW-052.md)의 누락을 보완했다. 소유한 새 복합 RTU에서 수동 기상을 적용하여 실제500→651.8kW 변화를 관측하고 CSV500kW·입력 설정으로 복귀했다. [집중3장면 준비](../../artifacts/checkpoints/media-weather-r2/README.md), [메인 대조](../../artifacts/checkpoints/media-weather-r2-root-review/checks.json), [REVIEW053](../product/REVIEW-053.md)을 따른다. 첫 CSV 기상 overlay 복원 실패는 ISSUE031에 보존했고, 검증된 제출 CSV와 actual201 응답에서만 입력 기준을 저장하도록 수정하여20개 경계시험과 실제 재녹화·후속MQTT125·재복원을 확인했다. 기존3RTU 설정은 불변이며 수동 적용 후 출처가 manual인 사실은 되돌리지 않았다.

현재 최종 입력 CSV는 [demo-synthetic-weather-control.csv](../../artifacts/media-preparation/demo-synthetic-weather-control.csv)다. 기상 열이 없는2행500kW 합성 입력과 [새 파서 준비 근거](../../artifacts/checkpoints/final-input-weather-r2-preparation/summary.json)를 사용한다. 이전 기상 열이 포함된 CSV와 과거 입력 점검은 당시 이력으로 보존한다. 최종 승인 커밋/이미지는 여전히 동결 후 확정해야 한다. 집중영상131.13초는 최종8장면이 아니며, 전체길이 약291.33초는 종전 실측+증가36초의 추정이다. 새8장면 녹화·음성·주장 검수 및 PPT 제작은 원래 마지막30분에 남는다.

원고 revision3은 [REVIEW054](../product/REVIEW-054.md)에 따라 장면6의 마지막 문장에 재시작 후 **재전송과 브로커 확인이 별도 실행 근거**임을 명시했다. [현재8장면·34문장 음성 준비](../../artifacts/checkpoints/audio-narration-r3-preparation/review.json)에서 Yuna170 실제 음성161.637초, 장면별 하한을 포함한 최소계획290초, 계획SRT34문장 일치를 확인했다. [메인 대조](../../artifacts/checkpoints/audio-narration-r3-root-review/checks.json)는22파일·현재/보존 소스4개·각문장AIFF/PCM 해시와 길이를 확인한다. 전체/변경장면 ASR 종료0이며 재전송·브로커·별도 근거 표현을 대조했다. 인식 차이와 긴 무음의 중복/환각은 그대로 기록하며 직접 청취나 발음 품질 통과로 해석하지 않는다.290초는 실제 조작 초과·로딩을 제외한 계획이며 최종 실제 장면 시각/SRT/음성은 새 녹화에서 검수한다.

## 영상 흐름

발표자료 준비 템플릿 revision2의7번 슬라이드는 같은 최종 영상의 `weather-model-output.png`를 사용한다. 수동 기상·실제 출력 변화·CSV 복귀와 manual 출처를 설명하며 [REVIEW055](../product/REVIEW-055.md)에서 의미를 대조했다. 현재 facts는 reviewed=false/preparationTemplate=true이고 수치·캡처SHA는 최종 관측으로 확정한다. 과거 캡처나 준비 수치를 최종 결과로 대입하지 않는다. 나머지 슬라이드의 명령 접수/저장 상태와 MQTT 완료 구분은 유지한다.

1. 실제 배포 대시보드: 가상 발전단지와 SCADA → RTU → MQTT → 외부 VPP 시험 목적, 실물 제어가 아닌 범위를 설명한다.
2. CSV/TSV 등록: 시각·출력·전압·전류, 단지 유형과 발전기 구성, 좌표 기본값 출처를 보여준다.
3. 발전 제어: 풍력·태양광·복합 장면, 풍향과 회전, 마우스 드래그/휠, 소유 RTU의 수동 기상 입력·실제 출력 변화·CSV 복귀, 출력 제한·정지·기동 및 일치하는 계측값을 보여준다.
4. RTU: 선택·검색·연결·건강 상태, 전체 발전기 데이터, 60초 샘플과 QoS1/outbox의 의미를 설명한다.
5. 실제 외부 VPP 제어: 충분한 가용량의 검증 단지에125kW를 요청하고 accepted/executing/completed와 actual125/error0을 실제 관측한 화면 및 보고서로 보여준다. 완료 이전 상태를 성공으로 편집하지 않는다.
6. 장애 실험: 오프라인 상태 수집·복구, 센서중단의 결측 의미, 지연/손실 및 중복 가능성을 보여준다. 짧은 오프라인 조작만으로 배치 재전송을 입증하지 않는다. 재시작 후 같은 메시지 재전송·broker 확인은 선택 매니페스트의 별도 실행 근거와 구분해 설명한다.
7. 시나리오·가이드: 저장·복원·새 runId, RTU별 토픽과 규격 다운로드를 소개한다.
8. 검증 및 한계: k3s 이미지/영속 복원 증거, 실측 결과, 남은 취약점·외부 연동 제한을 사실대로 마무리한다.

## 제작·검수

최종 기상 입력/출력 근거는 `scripts/media/observe-demo-state.py`로 실제 final-scenes와 private journal에 연결해 읽는다. [격리11시험·실제CLI 복구](../../artifacts/checkpoints/demo-state-observer-preparation/README.md), [독립 보안 검토](../security/DEMO-STATE-OBSERVER-REVIEW.md), [소스 보존22시험](../../artifacts/checkpoints/demo-state-observer-integration/summary.json)을 완료했다. 등록 actual201의 소유ID 전에는 대기하며 연결 오류는 고정행으로 남기고 읽기만 재시도한다. 최종 부모폴더 준비 후 `--seconds 360`/외부wrapper365초를 권장하며 원래마감과450초 상한은 유지한다. recorder의 실제 종료를 별도로 확인하고, 새 JSONL/소스/영상 SHA 및 실제 시각·날씨/CSV 전후 표본·encoded frame을 함께 검수한다. 종료0은 제한된 관측구간 종료이고 녹화 성공이 아니다. 관측 근거 경로는 `artifacts/video/source/weather-observations.jsonl`이며 최종 검수·PPT facts의 근거와 인벤토리에 연결한다.

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

정확한 스냅샷 복원과 명령은 [FINAL-RESTORE-PLAN.md](FINAL-RESTORE-PLAN.md)를 따른다. 아래 시간은 준비 예산이며 완료 보장이 아니다.

1. 0~3분: 정상 커밋/이미지를 확인하고 새 정상 DB를 백업·전송·검증한다. 원고와 덱 배치 준비는 병행할 수 있다. 기존 정상 백업을 덮어쓰지 않는다.
2. 3~7분: 새 고유 PVC에서 해당 백업의 원본/목적 SHA와 무결성을 확인한 뒤 실제 UI/MQTT 복원을 검증한다. 복원 앱의 데이터 비교를 먼저 하고 UI와MQTT 검증을 병행한다. 원격 복원 증거·선택 백업을 연결한 소스를 커밋하고 릴리스 매니페스트를 고정한다. 7분까지 새 백업의 복원 증거가 없으면 이미 복원 검증된 정상 스냅샷 선택 여부를 판단하며, 새 파일의 존재만으로 복원 성공이라고 표시하지 않는다.
3. 7~15분: 확정 approvedReleaseCommit/imageDigest와 운영3104/18884로 final-scenes.json을 준비하고 `node scripts/media/record-demo.cjs artifacts/media-preparation/final-scenes.json`을 실행한다. 실제4분 조작·음성·합성·전체 디코딩 이후 시작/중간/끝, 포인터·클릭·확대, 한글·잘림, 음성·자막 및 실측VPP 결과를 검수한다. visualReview/claimsReview는 실제 검수 뒤에만 passed로 기록한다. 시연용 합성 데이터를 명시하고 완료 직후 장애/제어 설정을 정상 인도 상태로 복구한다.
4. 15~23분: 검수된 새 영상의 실제 캡처·타임코드·같은 매니페스트로 final-deck.json을 작성한다. `node scripts/media/build-deck.mjs artifacts/media-preparation/final-deck.json`으로 제작·재수입·전장 렌더링한 뒤 모든 슬라이드의 한글·잘림·겹침·표현·근거를 개별 검수한다. 수정 시 새 출력 경로로 재생성한다. PPT의 영상 참조는 `../video/GRID-VPP-demo-ko.mp4`이며 두 폴더의 상대 구조를 유지한다.
5. 23~30분: MP4/SRT/원고/장면 JSON/제작 소스/대표 프레임/PPT/노트/검수 기록의 해시·연결을 확인하고 실제 배포 정상 상태·최종 버전·미완료를 기록한다. 오류 수정·재제작도 남은 원래 시간 안에서만 하며 deadlineAt을 넘겨 완료했다고 표시하지 않는다.

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

## 제품1.3 미디어 호환성 검토 (당시 이력)

후보 소스3fa3ba0의 선택 RTU별 저장 시나리오 필터/대상 알림과 KMA 조회 결과 표시를 기존8장면에 대조했다. 기존 `저장 시나리오` 탭, `시나리오 이름` 필드, `현재 상태 저장` 버튼, `.scenario` 내부 정확한 h3 이름과 첫 복원 버튼은 유지된다. 시연은 새로 등록한 복합 RTU를 계속 선택한 상태에서 저장·복원하므로 다른 RTU의 시나리오가 숨겨져도 자신의 새 시나리오를 찾는다. 변경된 패널 제목이나 성공 알림 문자열에 의존하는 선택자는 없다. 비동기 목록 갱신 뒤 클릭은 Playwright 요소 대기로 처리한다.

1.3.0에서도 기능 분기는 CSV 미리보기와 명령 상태 내보내기를 모두 포함하며1.0/1.1/1.2 복원 분기를 유지한다. 버전 행렬과 시나리오/내보내기 선택자 계약을 로컬 소스로 확인했다. 변경된 선택자가 없어 추가 전체 녹화·PPT 렌더를 수행하지 않았고 원격3104에 접근하지 않았다.

발표자료의 시나리오 설명(저장 상태 복원·새 runId·외부 지연 비보장)은1.3에도 유효하다. 최종1.3 채택 시 버전 개선 슬라이드에는 선택 RTU의 시나리오만 표시하고 작업 결과에 대상 RTU를 명시한다는 범위만 실제 근거와 함께 추가한다. KMA 조회 결과는 반환 출처·관측 시각을 확인하도록 설명하며 조회 요청 처리 완료를 새로운 실시간 관측 적용 성공으로 표현하지 않는다. 기존 시연에는 KMA 조회를 실행하는 장면이 없어 새 외부 API 성공 주장을 넣지 않는다. 최종 템플릿은 계속 미완성 보호 상태로 두고 동결한 버전에 맞춰 내용/타임코드를 확정한다. 릴리스 바인딩·실제 원격 확인·영상 우선 PPT 보호 조건은 변경하지 않았다.

## 미디어 마감 집행 보완

`media-deadline.cjs`가 녹화기와 PPT 생성기를 별도 작업 프로세스로 실행하고 원래 run.deadlineAt까지의 남은 시간만 부여한다. 동기 say/FFmpeg·오디오 검사에도 남은 시간 이하의 timeout/SIGKILL을 적용한다. 브라우저·artifact-tool·검증 하위 프로세스가 멈추거나 JavaScript 이벤트 루프를 막아도 독립 감시 프로세스가 마감에 작업 트리를 종료한다. Chromium처럼 별도 프로세스 그룹인 자식도 해당 작업의 PID 계보로만 찾아 종료하며 다른 앱을 이름으로 종료하지 않는다. OS 스케줄링과 최대500ms의 PID 조회 지연은 있을 수 있으므로 절대 정시 보장을 주장하지 않는다. 호스트 전체 마감 감시는 메인 운영 계획과 함께 사용한다.

최종 verification.json 작성 직전에도 실행 창을 재확인한다. 만료된 작업은 검증 완료 기록을 쓰지 않으며 부분 출력은 미완료로 남긴다. 리허설은 원래 최종 동결 시간을 바꾸지 않고 별도15분 상한을 사용한다. 생성 소스 묶음에 이 감시 helper도 보존한다. 동결·실제 배포·릴리스·영상 우선 조건은 유지한다.

작은 시험에서 남은 시간/만료 기록 차단, 멈춘 동기 child 종료, 이벤트 루프가 막힌 작업과 별도 그룹 자식의 종료를 확인했다. 정상 리허설 도구 실행과 소스 보존 시험 포함12개 통과. 전체 녹화나 PPT 렌더를 반복하지 않았다.

마감 감시의 소유권 보완: worker의 exit/error 이벤트 뒤에는 이미 회수된 PID나 그룹에 신호를 보내지 않는다. 살아 있는 작업의 PID·시작 시각·명령 식별정보를 저장하고, 종료 직전 각 자식의 같은 식별정보와 부모 계보를 다시 확인한다. 다른 프로세스나 부모가 바뀐 대상은 건너뛴다. 종료 탐색은1초 예산과 각 ps 최대500ms로 제한한다. macOS의 ps 확인과 signal 사이에는 원자적 PID 핸들이 없어 극히 짧은 TOCTOU가 남으며 PID 재사용을 완전히 방지한다고 주장하지 않는다. 정상 종료, 재사용된/회수된 worker, 바뀐 자식 식별정보, 무관한 프로세스 제외와 실제 detached 자식 종료를 시험했다. 소스 보존 포함14개 통과. 녹화기의 최상위 실패 메시지는 하위 명령의 원문 stderr를 출력하지 않는다.

## 검수한 영상에서 최종14장 설정 바인딩

`scripts/media/prepare-final-deck.cjs`는 녹화나 렌더를 하지 않는다. 입력 JSON은 `releaseManifest`, `videoDir`, `factsFile`, `outputConfig`와 선택적 `presentationDir`를 가진다. CLI는 원래 run.json의 동결 창 안에서만 동작하고 기록 직전 마감도 확인한다. 출력 파일이 존재하면 거절한다. `final-deck-binding.cjs`는 순수 파일 바인딩 계층이며 시험에서만 clock/root를 주입한다.

당초 제품1.3 기준으로14장 초안을 준비했으며, 현재 [facts.template.json](../../scripts/media/facts.template.json)은 제품1.7.1/PRD1.15의 본문·설명·장면·캡처·근거 후보를 담는다. reviewed:false/preparationTemplate:true이며 현재 최종 설정으로 사용할 수 없다. 영상 검수 후 실제 videoSha256/scenesSha256, selectedRtuId, 시나리오 복원 전후 runId와 근거, PRD 버전, 사용하는 캡처별 SHA-256을 채우고 각 본문과 근거를 확인한다. 최종 선택이 현재1.7.1과 달라지면 선택 버전에서 검증된 기능·캡처·manifestEvidence로 바꾸고 현재 템플릿의 개선 문구를 그대로 승인하지 않는다. 미래 제품 버전은 바인더의 명시적 검토 없이는 거절한다.

바인더는 non-rehearsal/fullDecode/visualReview=passed/claimsReview=passed와 실제 MP4 해시·매니페스트 해시·커밋·image digest를 비교한다. scenes.json의 실제 start/end+lead로 MM:SS를 만든다.8장면의 경계와 영상 길이를 확인하고 실제 같은 영상 source 내부 캡처 및 검수된 캡처 해시를 요구한다. 별도 MQTT 보고서의125kW/실제125/오차0, accepted/executing/completed, 선택 RTU를 확인한다. 지원 버전의 명령 내보내기도 같은 RTU·최대20개·파일 해시를 확인한다. 시나리오 새run 주장은 검수된 facts의 이전/새run과 별도 근거를 요구하며 스크린샷만으로 run 변경을 추정하지 않는다.

과거 outbox/backup 검증은 각 slide.manifestEvidence의 경로가 **선택한** manifest.evidence에 있고 파일 SHA가 일치할 때만 추가한다. 템플릿의 후보가 새 매니페스트에 없거나 바뀌면 최종 근거를 다시 선택한다. 외부 KMA 실관측/AWS/운영 VPP는 explicit unverified로 남기며 시험 브로커의 별도 클라이언트 관측과 구별한다. 바인딩 이후 `build-deck.mjs`로 제작하고 모든 장을 검수하는 순서는 유지한다.

이 바인더 최초 도입 당시의 후속 연결 기록이다(현재 패키징 상태는 DELIVERY-PLAN.md를 따른다). 새 바인더 자체와 사용한 facts는 최종 재생성 근거다. 메인 패키징/검증기에 `prepare-final-deck.cjs`, `final-deck-binding.cjs`, 의존 `release-features.cjs`/`validate-command-download.cjs`, 정확한 사용 facts 파일과 해시를 추가 연결해야 한다. 현재 build-deck의 설정/이미지/생성 소스 보존과 별도로 필요한 파일이며 이 작업에서 기존 생성기를 수정하지 않았다. 합성 fixture10개 시험으로 시간표시/동일 영상 해시/자산/마감/덮어쓰기 제한을 확인했으며 실제 최종 config를 생성하지 않았다.

### Recorder lifecycle integration (FR-FAULT-02)

`prepare-final-scenes.cjs` creates a unique registration fingerprint and a mode0600 private baseline/journal through `demo-lifecycle.cjs`. The final config contains `lifecycle.journalPath` and `lifecycle.registration`; final recording refuses missing lifecycle options. The recorder reuses only an unchanged, pre-intent baseline. Previous rehearsal configs without lifecycle options retain their action format.

The registration click is preceded by durable intent and followed by the actual POST201 body capture before any owned controls. Mutating scene actions verify that the displayed target is the journal-owned hybrid RTU. Existing wind/solar selections are observation only. Scenario restore verifies its original owner, writes intent, and records the actual HTTP200 distinct run transition without replacing the initial settings baseline. Lost registration/restore responses never authorize an invented baseline or run transition.

After capture, cleanup and unchanged-existing-RTU verification finish before encoding. `source/demo-recovery.json` and `verification.json.demoRecovery` record registration basis, scenario transitions, settings comparison, and existing RTU hashes; failure or ambiguity prevents a verified video. Catch attempts one bounded cleanup. The final recorder watchdog stops90seconds before the original deadline; rehearsal remains15minutes and no final deadline is extended.

After interruption, the main agent must first confirm that the recording tool handle/worker has stopped, then inspect the private journal and invoke `node scripts/media/recover-demo.cjs /absolute/journal.json /absolute/token-file`. Do not automatically run cleanup alongside a live recording. Forced termination cannot guarantee finally/catch execution. Ambiguous ownership or unresolved restore requires main-agent state/journal reconciliation, not blind re-registration or resetting other RTUs. Keep private baselines/journals out of shared delivery assets; preserve helper source code separately.

Bounded tests passed: lifecycle real-model HTTP fixture8, deadline/watchdog7, scene-plan compatibility/ownership2. No remote3104 mutation or complete video was performed by this integration check.
