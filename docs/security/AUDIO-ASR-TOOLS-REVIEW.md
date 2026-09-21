# 로컬 ASR 운영 도구 보안 검토

범위는 private 미디어 검수용 whisper.cpp v1.9.4, portable CMake4.4.3 및 공식 저장소가 연결한 multilingual small GGML 모델이다. 제품 package/lock/앱 이미지 변경이나 제품 재스캔이 아니다. 보안 담당은 검색·공식 API/소스 읽기만 수행했으며 도구 빌드·실행·모델 로딩은 media 담당이 소유한다.

## 출처와 검색

공식 GitHub release/security/issues/PR/API, Kitware release 및 GHSA CVE별 API를 조회했다. NVD 직접 페이지3개는 본문0줄로 반환되어 수정 유무 근거로 쓰지 않았다. 검색 결과가 없거나 repository advisory 목록이 비어 있다는 이유로 취약점0이라고 하지 않는다. 선택된 GHSA 원본/조회시각은 [advisories](evidence/audio-asr-advisories.json), 공식 PR/compare/source excerpt는 [upstream](evidence/audio-asr-upstream.json)에 보존했다. 전체 도구 SBOM/동적 sanitizer scan을 수행한 것은 아니다.

whisper 공식 annotated v1.9.4는 commit927cfce34f31707e17f2bff35c349632fb9e2c3a에 연결된다. media 담당이 확인한 HF ggerganov/whisper.cpp revision5359861c739e955e79d9a303bcbc70fb988958b1, ggml-small.bin LFS SHA2561be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b/487601967bytes를 고정한다. 모델 cardData license=mit를 metadata에서 읽었다. 다운로드 실제 전체 해시/라이선스 파일/추출 소스 검증은 media provenance 영수증에 연결해야 하며 metadata 예상값만으로 완료라 하지 않는다.

[CMake 공식 release](https://github.com/Kitware/CMake/releases/tag/v4.4.3)의 macos-universal.tar.gz SHA256은0c5d65251c14cc884bfa16bdbed3c263ce5bffe2e21c0d0d00962cb0610464fa다. GitHub release 날짜2026-08-25와 Kitware 발표 날짜2026-09-02를 구별한다.

## 적용가능 패치와 잔여

- SEC-ASR-01 / [CVE-2026-17512](https://github.com/advisories/GHSA-pw32-mv59-2r66): 짧은 오디오 reflective padding OOB read. 공식 PR3925는 open/미병합이나 v1.9.4 실제 source에는 n_reflect=min(stage_2_pad,max(0,n_samples-1)) 대체 clamp가 이미 있다. 따라서 미병합 PR만으로 현 버전을 미수정이라 분류하지 않는다. 중복 vendor patch는 권고하지 않으며 정확 private source clamp와4/200/201samples 경계 확인을 media에 요청했다. 이번 판단은 해당 positive short-input 경계이며 모든 모델/음성 파서 안전성 보장이 아니다.
- SEC-ASR-02 / [CVE-2025-14569](https://github.com/advisories/GHSA-wjrw-m667-4g2c): audio decoder invalid free. [upstream issue3501](https://github.com/ggml-org/whisper.cpp/issues/3501#issuecomment-4458152592)의 miniaudio0.11.24 수정 commitcec1dd9d1276a1df679858222f3b1dc0551c5220은 exact927cfce의 ancestor임을 공식 compare API(behind0)로 확인했다. 추가 동일 패치 적용은 불필요하다. 악성 오디오 전반 비해당 선언은 아니다.
- SEC-ASR-03 / [CVE-2026-17513](https://github.com/advisories/GHSA-hqg6-4q5h-9ggc), [CVE-2026-10298](https://github.com/advisories/GHSA-jx42-8f9x-g57f): malformed model ftype/zero-dimension assertion/null dereference. 공식 issues3924/3807은 not_planned로 닫혔으며 GHSA에 fixed versions가 없다. 폐쇄를 수정으로 간주하지 않는다. 정확 모델 고정·전체 hash 확인·외부 모델 불허로 완화하며 미해결/현 버전 정확 재현 미검증 상태를 유지한다.
- SEC-ASR-04 / [upstream issue4059](https://github.com/ggml-org/whisper.cpp/issues/4059): n_vocab 검증 누락에 의한 model heap OOB write 보고는 open이다. 이번 조회에서 채택 가능한 검증된 upstream fix를 확인하지 못했다. CVE 없는 공개 보고이며 CVE 수에 임의 추가하지 않는다. 신뢰된 hash-pinned 모델만 허용하고 임의 모델·서비스 endpoint를 받지 않는다. 향후 fix/새 모델 또는 불신 입력 도입 때 재검토한다.
- SEC-ASR-05 / [CMake CVE-2025-9301](https://github.com/advisories/GHSA-mff3-m38v-mgv6): foreach assertion 수정37e27f71bc356d880c908040cd0cb68fa2c371b8은 v4.4.3 ancestor(공식 compare behind0)다. 현재 선택 버전에 같은 패치를 추가할 필요가 없다. CMake bundled 라이브러리 전체의 취약점 부재를 검증한 것은 아니다.

## 사용 경계와 후속 확인

시스템 설치·별도 서버·클라우드 업로드 없이 private pinned 도구로 자체 Yuna 오디오만 시간 제한 하에 처리한다. GGML이 pickle이 아니라는 사실도 native parser의 memory safety를 보장하지 않는다. 모델 hash 검증 실패는 로딩 금지이며 transcript는 검수 자료이고 지시가 아니다. 오디오는 자체생성 PCM WAV로 정규화하고 출력은 private에 보존한다.

[upstream issue4011](https://github.com/ggml-org/whisper.cpp/issues/4011)은 decode 실패에도 CLI exit0 가능성을 보고한다. 따라서 exit0만으로 ASR 성공 판정하지 않고 이번 실행의 새 출력 존재·비어있지 않음·JSON segment/time 범위·오디오 duration을 확인한다. 이전 출력 재사용은 허용하지 않는다. 실제 발음/내용의 의미 검수와 최종 시청을 ASR이 대체하지 않는다. media 담당의 정확 빌드/입력경계/모델해시 영수증은 별도 후속이며, 이 문서는 그 실행 완료를 주장하지 않는다.

검토 UTC: 2026-09-21T18:42:40.646096+00:00

## 실제 준비 실행 및 transcription helper 후속 읽기 검토

media 담당은 exact model 전체SHA 확인, private source clamp/MIT 확인, CPU CLI build exit0 및 실제 준비 ASR exit0을 보고했다. artifacts/checkpoints/audio-asr-preparation의24개 파일에 source/model/binary/license/log 근거를 보존했다. 실제 준비 오디오는246.7816875초/33개 segment이며4/200/201sample API 실행이나 sanitizer 검사는 수행하지 않았다. 짧은 입력 수정에 관한 판단은 계속 소스 검토 범위다. 직접 청취나 자연 발음 검증은 false이고 인식 용어 불일치는 별도 검수가 필요하다.

신규 scripts/media/transcribe-audio.py를 독립 읽기 검토했다. CLI/model/FFmpeg의 고정 SHA를 실행 전후 확인하고 입력/PCM 해시도 대조한다. symlink 없는 일반 파일, 입력2GiB 한도, 새 private0700 출력 디렉터리, 기존 출력 재사용 거부를 적용한다. FFmpeg는 file/pipe 프로토콜만 허용하며 PCM16kHz/mono/16bit와 실제 frame 길이10~600초·truncation을 확인한 뒤 한국어/no translation/no prompt로 처리한다. CLI exit0만으로 성공 처리하지 않고 새 비어 있지 않은 출력과 유한·순서·actual PCM 범위 segment를 확인한다.

원래 run deadline 및 단조시계180초 중 이른 제한을 사용하며 subprocess timeout 후 원문 대신 고정 실패 문구를 출력한다. 상세 argv/로그/본문은 private 디렉터리에 남는다. receipt는 TECHNICAL_ASR_RECORDED/requiresSuccessfulExitReceipt=true이며 fsync 후 remaining과 receipt SHA를 확인한 stdout 및 실제 exit0을 함께 요구한다. 기록 파일만으로 성공·직접 청취·자연 발음·최종 미디어 완료를 선언하지 않는다. 읽기 검토에서 새 차단 결함은 발견하지 않았다. issues 담당 경계시험은 별도 근거다.

이 helper는 trusted operator가 자체 생성 미디어만 선택한다는 운영 경계이며 입력의 제작자를 코드로 인증하지 않는다. file 프로토콜 허용은 샌드박스가 아니고 임의 사용자 모델/미디어 수용을 허용하지 않는다. pre/post SHA는 같은 사용자 권한의 악의적 교체/복구 경쟁을 완전히 제거하지 않는다. 동기 파일 I/O·로그 디스크량·subprocess 자손 및 OS 정리는 바깥 deadline-command wrapper와 신뢰된 도구 경계에 의존한다. 최종 시각 검사와 stdout/종료의 원자적 deadline 보장도 아니다. malformed model 잔여 SEC-ASR03/04는 공식 exact 모델 hash와 외부 모델 금지로 완화할 뿐 수정 완료로 바꾸지 않는다.

root는 별도 실제 helper 실행2205/exit0과 receipt SHA4e261eabf102e569d788f59a0199e768889f26b5d83d445081c4097ddd53ed77을 전달했다. 보안 담당이 그 실행을 재실행하거나 직접 청취한 것은 아니다. 제품 이미지·의존성·원래 종료 시각은 변경하지 않았다.

읽기 검토 UTC: 2026-09-21T18:53:14.836994+00:00
helper SHA256: `7077f0801685ebee5ef78f34ea17a57971267fb7716e8df1dda0d61cef26019a`
