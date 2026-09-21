# 한국어 음성 검수 준비와 확인 범위

제품1.7.1 기능 안정 상태의 준비 작업이다. 기존 `artifacts/media-preparation/full-candidate17-20260921`의1.7 로컬 리허설만 읽었다. 최종 영상·음성은 원래2026-09-21T21:37:33UTC 이후 새로 만들고22:07:33UTC 전에 검수해야 한다. 기존 결과를 최종 음성 검수로 대체하지 않는다.

## 직접 청취·전사 경로 확인

현재 세션의 사용 가능한 도구 메타데이터에서 audio/transcription/speech 입력·전사 도구를 찾지 못했다. 오디오 파일을 화면에 첨부하거나 afplay로 로컬 스피커에 재생하는 동작은 에이전트가 내용을 직접 들었다는 증거가 아니므로 이를 청취 검수로 사용하지 않았다. 이전 native audio unsupported 한계를 성공으로 바꾸지 않는다.

PATH의 whisper/whisper-cli, 시스템 Python의 whisper/faster_whisper/vosk/torch/torchaudio/transformers/speech_recognition/mlx_whisper/soundfile/librosa, 번들 Python site-packages의 관련 패키지 이름 및 일반 whisper/HuggingFace/MLX 모델 캐시 위치를 한정 검색했다. 사용할 수 있는 설치 패키지·모델을 찾지 못했다. 이는 확인한 경로의 결과이며 컴퓨터 전체에 어떤 음성 소프트웨어도 없다는 단정은 아니다. macOS Speech framework는 권한·언어별 로컬 모델 지원을 확인하지 않은 상태여서 실행하거나 권한을 바꾸지 않았다. 다운로드·설치·클라우드 전송은 하지 않았다.

사용 가능한 로컬 경로는 설치된 Yuna(ko_KR) 음성 생성기, afinfo와 기존 번들FFmpeg 분석기다. 음성 생성기의 한국어 등록 사실은 발음 품질이나 내용 이해를 보증하지 않는다.

## 기존 리허설의 독립 기술 검수

실행 소스와 결과는 `artifacts/checkpoints/audio-review-preparation/analyze.cjs`, `analysis.json`이다. 문장별 AIFF32개를 전체 디코딩하고 각 파일 SHA·실제 길이·평균/최대 신호·0.25초 이상 침묵 구간을 기록했다.8개 장면의32개 문장 모두 디코딩 성공, 평균 신호가 -60dB보다 크고 최대 신호는0dBFS 미만이다. 이것은 신호 존재와 디지털 최대치 도달 여부 검사이며 청감 품질·모든 잡음·왜곡·발음 오류가 없다는 뜻은 아니다. 문장 시작/끝의 정상 무음도 침묵 검출에 포함된다.

실제 AIFF 길이와 cue 길이의 최대 차이는0.004921초다. FFmpeg 길이 표기의 소수 둘째 자리 반올림 범위와 일치한다.32개 SRT 문장은 줄바꿈 공백을 정규화한 원고와 모두 같고, start/end+lead와 SRT의 최대 차이는 부동소수 계산 수준인2.84e-14초다. 기존 완성 MP4의 전체 디코딩·평균-19.2dB 기록은 이전 기술 검수이며 이번 결과도 직접 청취나 ASR 전사를 포함하지 않는다.

## 원고 표현 검토

텍스트상 백이십오 킬로와트, 육십 초, 스무 개, 새 실행 식별자는 의미가 명시돼 있다. k3s는 기존 리허설에서 “케이쓰리에스”로 작성됐다. GRID/VPP, CSV/TSV, RTU, MQTT, JSON은 영문 약어로 들어가므로 실제 발음의 명료성은 아직 확인하지 못했다. SCADA/runId는 전문용어 목록에는 있으나 이번 문장에서는 대부분 한국어 개념으로 풀어 설명한다. 발음 불확실성을 이유로 검증된 제작 소스를 이 준비 작업에서 임의 변경하지 않았다.

우선 청취 대상은 scene1 sentence3(GRID/VPP), scene2 sentence1~2(CSV/TSV/RTU), scene4 sentence2(MQTT/육십 초), scene5 sentence1·6(MQTT/125kW/JSON), scene8 sentence2(k3s)다. 해당 파일은 source/voice-{sceneIndex}-{sentenceIndex}.aiff의0기반 번호로 찾는다. 전체 문장 목록과 SHA는 analysis.json에 있다.

## 최종 창에서 재사용할 절차

1. 최종 영상 생성이 정상 종료하고 원본 음성/원고/scenes/SRT가 확정된 뒤 동일 분석기를 별도 새 결과 파일로 실행한다. 예: `node artifacts/checkpoints/audio-review-preparation/analyze.cjs artifacts/video artifacts/media-preparation/final-audio-technical-review.json`. 이미 존재하는 결과 파일에는 쓰지 않으며 문장별 child는10초/5초 상한을 둔다. 이 분석기가 최종시각 보호를 대신하지 않으므로 메인 마감 감독 아래 원래 마감 전에만 실행한다.
2. 문장 수·전체 디코딩·유한 길이·비무음 신호·SRT원고·시각을 확인한다. 실패하거나 신호가 매우 작으면 원인 문장 파일을 특정하고 자동 통과로 처리하지 않는다. 기술 통과는 `technicalAudioReview` 범위로 기록한다.
3. 지원되는 실제 오디오 청취/전사 경로가 그때 확보된 경우 위 우선 문장과 연결 부위를 먼저 검수하고, 가능한 범위에서 전체 한국어 흐름·발음·끊김·배경 잡음·화면 동기를 확인한다. ASR만 있으면 텍스트 대조 근거로 한정하고 자연스러운 발음을 들었다고 주장하지 않는다.
4. 직접 청취 경로가 끝내 없으면 결과에 `directListening:false`와 전문용어 발음/청감 미검수 범위를 남긴다. ASR 여부는 해당 최종 파일의 실제 전사 성공 영수증에 따라 별도로 기록한다. 단순 레벨·SRT 일치를 근거로 청취 완료나 한국어 발음 적합 판정을 만들지 않는다. 최종 음성 인수 조건 충족 여부는 메인이 이 제한을 포함해 판단한다.

이번 작업은 새 음성 생성·녹화·기존 파일 덮어쓰기·배포·시스템 변경을 하지 않았다.

## 추가 승인된 격리 로컬 ASR 준비 (2026-09-21 18:44 UTC)

위 초기 검색 이후 메인 승인을 받아 공식 소스/도구/모델만 `artifacts/private/audio-asr-20260921`에 다운로드하고 시스템 설치 없이 전사 CLI를 빌드했다. 앞 절의 ‘다운로드·전사하지 않았다’는 초기 조사 시점 기록이며, 이 추가 작업 이후 ASR 상태는 true다. 직접 청취는 여전히 false다.

whisper.cpp v1.9.4는 commit927cfce34f31707e17f2bff35c349632fb9e2c3a, 공식 CMake4.4.3 아카이브는 공개 SHA256 표와 일치했다. 공식 모델 링크의 HF revision5359861c739e955e79d9a303bcbc70fb988958b1 / multilingual small LFS SHA2561be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b를 전체 대조했다. 소스/모델 MIT와 CMake 배포 라이선스·의존 고지를 보존했다. 모델/바이너리/원본 PCM은 Git 대상이 아니다. 보안 범위와 잔여 모델 파서 취약점은 `docs/security/AUDIO-ASR-TOOLS-REVIEW.md`에 별도 관리한다.

기존1.7 영상에서 새16kHz mono PCM을 생성해20초 구간을 먼저 확인하고 255.33초 영상의 전체 오디오 스트림(추출PCM246.7816875초)을 `ko`, CPU4threads, 원고prompt 없이 전사했다. 각각1.71초/15.21초, exit0·새 출력·nonempty·33segment 범위 검증을 통과했다. 최종 영상이나 최종 음성 인수 판정이 아니다.

`artifacts/checkpoints/audio-asr-preparation`에 정확 해시·실제 옵션·빌드 로그·입출력 근거·원본 전사·장면별 대조를 남겼다. accepted/completed 차이,125kW,60초,별도 재시작 증거와 외부 미검증 경계는 전사에서 확인했으나 JSON→‘직선’, 계측값·난수 시드·복원 등 인식 불일치는 발음 오류인지 ASR 오류인지 구분할 수 없다. 음성 자연스러움/전문용어 발음은 미검수이며 직접 청취 완료라고 표현하지 않는다.

최종 창에는 위 절차3을 이 로컬 전사로 보완할 수 있다. 원래 마감 감독 아래 새 최종 PCM/새 output을 생성하고 해시·원고 대조를 다시 남긴다. 실패 시 ASR:false로 명시하며 이번 리허설 전사를 최종 근거로 재사용하지 않는다. ASR타임스탬프는 침묵을 포함할 수 있으므로 기존 문장별 AIFF/SRT 동기 검증을 대체하지 않는다. 상세 실행·검토 순서는 `artifacts/checkpoints/audio-asr-preparation/comparison.md`를 따른다.

## 최종 파일용 재사용 전사기

`scripts/media/transcribe-audio.py`는 검토한 CLI·모델·FFmpeg 전체 해시를 실행 전후에 확인한다. 새 private 디렉터리에 실제 입력에서16kHz mono PCM을 추출하고 PCM 프레임 수로10~600초 범위를 확인한다. 한국어·번역 없음·원고 prompt 없음으로 실행하고, 실제 오디오 길이 내의 유한·순서 있는 구간과 비어 있지 않은 전사 결과를 검사한다. 원래 run 마감과180초 상한을 적용한다.

최종 MP4 생성이 정상 종료한 뒤 원래 마감 안에서 아래 명령을 한 번 실행한다. 출력 경로가 존재하면 먼저 이전 실행 결과를 확인하며 같은 경로를 덮어쓰거나 응답 손실만으로 다시 실행하지 않는다.

```sh
python3 scripts/deadline-command.py --timeout-seconds 180 -- python3 scripts/media/transcribe-audio.py --input artifacts/video/GRID-VPP-demo-ko.mp4 --output-dir artifacts/private/final-audio-asr-20260921
```

성공 증거는 **원래 실행의 종료0·stdout의 receipt SHA·저장 receipt의 실제 SHA** 세 가지다. 중단 후 남은 파일이나 `TECHNICAL_ASR_RECORDED` 문자열만으로 성공을 인정하지 않는다. 원본 WAV·도구·모델은 private에 두고 전사와 영수증만 소형 검수 묶음으로 보존한다. 이어 최종 원고와 의미를 직접 대조한다. 전사기의 성공은 문장 뜻·한국어 자연스러움·음성 인수 완료를 뜻하지 않는다.

실제 기존1.7 MP4로 실행한 root2205는 종료0, PCM246.7816875초/33구간이었다. `artifacts/checkpoints/audio-final-helper-preparation`에 원래 stdout 영수증과 결과 해시를 남겼다. 이 자료도 준비 검증이며 새 최종 MP4를 대신하지 않는다. 기존 원회성 `audio-asr-preparation/transcribe.py`의 고정255.33초 한계를 최종 파일에 재사용하지 않는다.
# 최신 원고 revision3 준비 후속

기상 조작을 추가한 revision2의 실제 집중3장면 MP4 및 두 문장 전사는 [media-weather-r2](../../artifacts/checkpoints/media-weather-r2/README.md)에 보존한다. 그다음 revision3은 장면6의 재시작 후 재전송·브로커 확인을 별도 실행 근거로 명시했다. [REVIEW054](../product/REVIEW-054.md)는 같은1.7.1 manifest의 실제 outbox 근거와 의미를 대조했다.

[revision3 준비](../../artifacts/checkpoints/audio-narration-r3-preparation/review.json)는 현재1.7.1 기능별 문구를 포함한8장면34문장의 실제 Yuna170 음성을 새로 합성했다. 음성161.637초, 장면 하한 포함계획290초다. [메인 검사](../../artifacts/checkpoints/audio-narration-r3-root-review/checks.json)에서22파일·소스4개·34문장의 AIFF/PCM 해시·길이·계획SRT 일치를 확인했다. 전체ASR40659 및 변경장면58340 종료0/영수증/출력SHA를 대조했다. 긴 무음의 ASR 중복·환각과 전문용어 인식 차이는 그대로 보존한다. 계획 자막을 실제 영상 자막으로 취급하지 않으며 ASR를 원고의 정답이나 발음 적합 판정에 사용하지 않는다. 직접청취false, 최종 MP4 새 전사·시각/주장 검수 필요라는 경계는 유지한다. 이전 revision1/2 기록은 당시 소스의 이력이며 변경하지 않았다.
