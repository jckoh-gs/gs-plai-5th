# 제작 리허설 검토 (최종 산출물 아님)

2026-09-21 UTC. 메인 작업의 동결 전 제작 도구 검증이다. artifacts/video 또는 artifacts/presentation의 최종 인도물은 생성하지 않았다.

- 전체 흐름: `rehearsal/verification.json`, `rehearsal/scenes.json`, `rehearsal/GRID-VPP-demo-ko.srt`. 8장면241.37초, 제작265.769초,1920×1080 H.264/AAC, 전체 디코딩, pageErrors=[] 확인.
- 실제 MQTT: `rehearsal/source/vpp-command-4.json`. command742b22d4-3bbc-48a1-af98-ce9d8119a606, 요청125, accepted/executing/completed, actual125/error0. 서버1.0.0 로컬fixture와 제작 당시 클라이언트1.1.0이다. 최종 배포 버전 증거로 사용하지 않는다.
- CSV등록·상한/기동/정지·RTU검색/메트릭·통신/센서 장애 해제·재생1×/활성·시나리오 새runId·가이드 조작을 완주했다. 기존 RTU는 변경하지 않았고 고유 이름으로 생성한 리허설 RTU만 제어했다.
- 전체 영상의 시작/중간/끝, 클릭 링과 확대 프레임을 확인했다. 포인터/자막은 보이며 한국어 문장 음성 길이에 연결한 SRT는 장면 끝까지 억지로 늘어나지 않는다. 전체 회차에서 canvas와 결과표가 아래로 밀린 프레이밍 문제가 발견되어 중앙 스크롤과 canvas 상대좌표를 적용했다. 이전 전체 영상은 수정 전 리허설로 남긴다.
- 수정 검증: `focused-camera-preview/verification.json`, source/camera-before.png 및 camera-after.png, source/preview-normalized.png. 인증된3103의1.1.0 후보,39.07초 영상, 제작43.828초, 오디오 평균 -19.6dB, pageErrors=[], 전체 디코딩 확인. 실제canvas의 시점 변화·포인터·미리보기 정규화 결과를 육안 확인했다. 미리보기 뒤 취소했으며 기존 단지 제어 설정은 바꾸지 않았다.
- PPT: `deck-full-rehearsal/rehearsal.pptx`와 slide-01.png~slide-14.png를 모두 개별 육안 확인했다.14장,16:9, 한글, editable텍스트/구조도, 실제캡처, 상대 영상경로 및 노트 정상. 자동검증 receipt는 같은 폴더verification.json의 validationReceipt 경로에 있다. 화면 캡처는 전체UI 구조를 보여주는 용도이며 중요한 수치는 별도 큰 본문으로 표시한다.
- 리허설 PPT의3D캡처는 보완3103 회차에서 가져왔고 다른 캡처는3101 전체회차에서 가져왔다. 이 자료를 같은 최종 릴리스 발표자료로 전달하지 않는다. 최종 영상·PPT의 내용/버전 검수는 동결 뒤 새로 수행한다.

수정 후 공통 장면 생성기(scene-plan.cjs)는 인증·원격 주소를 입력받고, 최종 바인더는 실제 API와 확정 매니페스트의 제품 버전을 비교한다. 동결 밖 실행, 미완성 템플릿, 같은 커밋/매니페스트로 검수하지 않은 영상 뒤의 최종PPT 제작을 차단한다. 최종 요구의 완성을 주장하는 기록이 아니다.

`media-alignment-check.json`: 전체25문장과 보완4문장의 SRT 시작/끝을 실제 문장 음성 cue 길이와 대조했다. 최대 차이1ms미만이며 MP4에서H264·1920×1080·AAC·mov_text 트랙을 직접 확인했다. `freeze-guard-check.json`: 동결 전 최종 장면 바인딩 실행은 거절되고 최종 파일을 만들지 않았다.

## 제품1.2 명령 상태 내보내기 준비

확정 매니페스트 제품 버전으로 기능을 선택한다. 1.0은 미리보기/내보내기를 제외하고, 1.1은 CSV 미리보기만, 1.2 이상은 기존 명령 장면에 최근 명령 상태 JSON 다운로드를 추가한다. 새 장면은 늘리지 않는다. `release-features.cjs`가 버전 선택을, `validate-command-download.cjs`가 선택 RTU·schemaVersion1·contractVersion2·scope·최대20개 및 DTO 허용 필드와 알려진 자격증명 미포함을 확인한다. 잘못된 RTU, 21행, 원본 request/reason 필드는 거절한다.

인증된 localhost:3103의1.2.0 후보에서 읽기 전용 UI 다운로드를22.03초 집중 리허설로 검증했다. 제작23.279초,1920×1080 H264/AAC, 전체 디코딩 성공, pageErrors=[], 음성 평균 -17.6dB이다. 선택 RTU의 실제4개 저장 상태를 내려받았다. 최대20개라는 범위이며 외부 VPP 수신 증거나 전체 감사 이력이 아니라는 내레이션/자막을 포함한다. 중앙 확대가 우측 버튼을 자르는 문제를 발견해 내보내기가 포함된 명령 장면은 전체 프레임을 유지하고 다른 장면의 점진 확대는 유지했다. 수정 프레임에서 버튼·포인터·자막을 확인했다.

근거는 `artifacts/media-preparation/focused-command-export-v12-final-framing/verification.json`, 같은 폴더의 source/recent-command-states.json, `artifacts/media-preparation/command-export-validation.json`이다. 로컬 후보의 제작 검증이며 예비 매니페스트 정보는 최종 버전 증거가 아니다. 동결 시각/커밋/이미지/매니페스트 일치 및 최종 영상 검수 후 PPT 제작 방지장치는 유지한다. 최종 디렉터리는 생성하지 않았다.
