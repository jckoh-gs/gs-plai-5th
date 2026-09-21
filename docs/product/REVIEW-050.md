# REVIEW-050 — 한국어 원고 후보 및 최종입력 준비 검토

이번 검토는 텍스트·기록·해시 읽기이며 직접 청취·음성 재합성·원격조작·코드 수정은 하지 않았다. 비교의 Yuna170/whisper small 한국어 CPU 전사는7후보42.8465초이며 prompt없음/directListening=false/finalAudio=false다. 실제 전사에서 쉬운 표현이 나타나지만 발음 자연스러움이나 최종 영상 청취를 증명하지 않는다.

## 7개 표현 제안

1. “측정한 값은 현재 선택한 단지와 발전기 상태를 보여줍니다.”는 계측값의 쉬운 표현으로 채택 가능하다. 앞 장면의 가상현장/에뮬레이터 설명과 원본·추정전류 구분을 유지하여 실물 센서 측정으로 오해시키지 않는다.
2. “접수 패널은 마지막으로 받은 결과를 보여주며, 저장 상태 확인으로 서버 상태를 다시 조회합니다.”를 권고한다. 접수≠완료와 마지막 관측이라는 시간범위를 유지하며 현재상태 자동보장을 덧붙이지 않는다.
3. “큐오에스 일은 전달 과정에서 중복이 생길 수 있으므로 메시지 아이디로 중복을 처리합니다.”를 권고한다. 중복 가능성·식별자 기반처리를 유지하며 exactly-once 의미를 추가하지 않는다. ‘전달 과정에서’는 이번 후보 ASR 원문과 다른 최종 문구이므로 다시 검수해야 한다.
4. “최근 저장 상태를 최대 스무 개까지 제이슨 파일로 내보냅니다.”를 권고한다. 화면 버튼/형식은 JSON을 그대로 유지한다. ‘구조화된 파일’만으로는 형식을 특정하지 못하므로 제이슨이 더 정확하다. 외부VPP 수신/전체감사이력이 아니라는 다음 문장은 유지한다. 제이슨 발음은 이번 ASR에서 시험하지 않았다.
5. “배속과 일시정지, 난수 생성에 쓰는 초기값으로 시험 조건을 조절합니다.”를 권고한다. ‘재현에 쓰는 초기값’만으로 난수의 의미를 없애지 않는다. UI 난수시드 및 문서 정의를 유지하고 과거 출력궤적의 완전재현을 약속하지 않는다. 이 문구도 후보와 달라 최종음성 검수가 필요하다.
6. “선택한 RTU에 저장된 시나리오를 다시 불러오면 새 실행 아이디가 생깁니다.”를 권고한다. 원후보 ‘RTU의 저장한’ 문법을 바로잡으며 선택RTU 귀속/새run을 유지한다. 이후 런아이디로 과거실행 구분·기존outbox유지 문장은 생략하지 않는다.
7. “가이드에서 이 RTU의 토픽과 메시지 형식을 확인합니다.”를 권고한다. 이 장면의 확인대상 설명으로 적절하나 전체연동규격을 메시지형식만으로 축소하지 않는다. QoS/인증/접속절차 등 문서계약은 그대로다.

위7개는 제품 의미 검토 제안이며 코드 채택은 메인 담당이다. 자막과 음성의 뜻을 맞추되 UI의 정확한 JSON/RTU 라벨을 바꾸라는 제안은 아니다.

## 최종입력 준비 사실

final-input 준비보고서의3개 파일 해시가 일치하고, 기록된14개 source 해시를 현재파일에 대조했다(아래 비교 결과). audio inventory7파일도 모두 일치했다. input.unbound는 운영3104/MQTT18884와 비밀파일 경로만 참조하고 미래 final-20260921 manifest 및 POPULATE_AT_FREEZE commit/image를 유지한다. preparationTemplate=true이며 최종결합/녹화는 아니다. 비밀내용은 읽거나 복사하지 않았다.0600/비어있지않음은 기존summary의 당시 관측으로만 인용한다.

CSV는 hybrid/kw/sample/linear,2행·600초·각500kW,00:00~00:10UTC/09:00~09:10KST의 실제 parser 기록이다. synthetic 입력이며 실제발전관측이나 새RTU등록이 아니다. 현재 CSV 바이트와 recordedSHA를 대조했지만 parser를 다시 실행하지 않았다. 새API GET·journal·소유RTU 등록·최종이미지 결합/복구·영상검수는 최종창에 남는다.

원래freeze21:37:33Z/deadline22:07:33Z는 불변이다.18:59:55Z 첫1시간 관찰은 이 준비검토와 별개이며 미리 완료로 표현하지 않는다.

## 읽은 파일 SHA256

- artifacts/checkpoints/audio-narration-clarity/review.md: `45253249d2675f8cc6c2edb9d0972e740ba89627d9d7f6293d38c3aca27b3873`
- artifacts/checkpoints/audio-narration-clarity/comparison.json: `66756c5928ce2252e322d226dd8a83da0586635d78cb18700ba41b05184cbadb`
- artifacts/checkpoints/audio-narration-clarity/candidate-asr.txt: `cbd0ac4afb0c00315dabe62d2e2c34b36523ffb9f869199d1394635927b91006`
- artifacts/checkpoints/audio-narration-clarity/inventory.json: `d1f9e16478bdd65467285e23e9239b9b53d0ac6f8dcf3e7527a85f3adf997339`
- artifacts/checkpoints/final-input-1.7.1-preparation/summary.json: `77c0cf78163ef51b81d0a466981554306d76f4d1b9ab31f4126767727e2d015c`
- artifacts/checkpoints/final-input-1.7.1-preparation/input.unbound.json: `796f9e7eed8952526a2ad430e159f9ce5b45a84b031b8f3985efa1db7053952d`
- artifacts/checkpoints/final-input-1.7.1-preparation/csv-preview.json: `1e5a5d446b1ee83bad54186a8710e667af8e0e909f2734aa67b6a7ddfb8f2490`
- artifacts/checkpoints/final-input-1.7.1-preparation/sha256.json: `115583eb78a43c6ede1b7e9c70e78ff75e5e174a8b1f7c3f47f2f1758e08784d`
- scripts/media/scenes-template.json: `24ec0d1d972f200767b0d2c4d7b2cf65db11ffbb1efd8d80e00409158a263ddd`
- scripts/media/scene-plan.cjs: `9d338fed29d964d845f16d4bc07b18a12a895f41bc984a4ad2058be2183a7887`
- artifacts/media-preparation/demo-synthetic.csv: `29d7e51313cefb4bdeef718f355fac4bb1b8eb17fb746a10b537f5ad990d1266`

준비 source 대조: 14개 일치, 변경된 파일: []. 제작 소스 후속편집은 기존 준비해시를 소급 변경하지 않고 새 근거로 남겨야 한다.
