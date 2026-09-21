# 최종 동결 전 선택 버전 보안 판정

2026-09-21T21:28Z에 시작한 한정 재검토다. 선택 제품1.7.1/runtime40b9ed898f32037e7a87259d12d145457575a4a8/app234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876의 유지에 새 차단 근거를 발견하지 않았다. 알려진 잔여 위험을 가진 기능 안정 선택이며 무취약·전체목표 완료 판정이 아니다.

현재 HEAD d7ae0981ce4e1fde88e310b8434d25275ddbd5ff에서 불변1.7.1 매니페스트의 runtime28파일 전체 SHA가 일치했다. package/package-lock도 exact40b Git 바이트와 일치했다. readonly observer7f9e3656, ASR helper7077f080, weather lifecycle7674e060은 기존 독립 검토 해시와 동일하다. 새 runtime/OSS graph 변경을 발견하지 않아 이미지·npm·broker·registry 재스캔을 반복하지 않았다.

정확 앱의 기존 Syft/Grype 기록은2026-09-21T17:26:28.419994Z, SBOM130,4패키지/advisory매치·2CVE다. DB v6.1.9 built06:39:24Z/검사당시valid=true라는 나이를 유지한다. zlib1.3.2-r0/CVE-2026-85091 High1 및 busybox/busybox-binsh/ssl_client1.37.0-r31/CVE-2025-60876 Medium3를 계속 관리한다. 전체npm audit0은17:25:31.659469Z 당시 결과다.

이번 공식 Alpine3.24 main feed를 새로 수집했으며 SHA18af63e6013a0c89ba82fba49dd748b6870f413fb997a8ab78bef7587ccedae1로 이전과 같았다. 두 대상 CVE의 fixed-version 항목은 여전히 없다. GHSA CVE별 공식 API도 새로 읽었으며 패키지 fixed version을 제공하지 않았다. 이 범위에서 적용가능한 새 배포판 패치를 확인하지 못했으므로 기존 pinned 이미지를 임의 수정하지 않는다. 모든 upstream 미공개 수정이나 미탐지 취약점의 부재를 의미하지 않는다. broker a75의 과거10매치/registry404의 과거0매치는 새 검사로 표시하지 않는다.

별도 ASR 운영도구는 exact927cfce 및 hash-pinned HF 모델/CLI/FFmpeg 경계를 유지한다. 기존 short-audio 대체 clamp와 decoder/CMake 수정 포함 판단을 유지하나4/200/201sample runtime/sanitizer 시험은 하지 않았다. CVE-2026-17513/10298의 공식 issue3924/3807은 여전히 not_planned, n_vocab OOB issue4059는open이다. 공식 모델 fullSHA·불신 모델 금지·자체 PCM/유한 실행으로 완화하며 수정 완료라고 표시하지 않는다. 본문/출력 확인은 ASR 의미·발음·직접청취 검증을 대신하지 않는다.

ISSUE033의21:08 재연결과 수신 미관측300위치는 별도 영속 증거에서 저장생성 및 broker ACK로 대조됐다. 근본원인unknown, subscriber 관측공백·누적오류를 유지한다. 이 보안 검토는 해당 원격조회나 강제단절을 다시 수행하지 않았다. 외부 VPP 실제 서비스 검증과 직접 청취 미검증도 그대로 남는다.

원래 freeze21:37:33.079009Z/deadline22:07:33.079009Z를 유지한다. 최종 미디어의 비밀 비노출·소유 RTU cleanup·실제 성공 영수증과 인도 검증은 다음 실제 결과로 확인해야 한다. 원장/acceptance/배포/관측기 변경은 하지 않았다.

## 실행 근거

두 유한 읽기 수집 명령은 실제 exit0으로 끝났으며 네트워크 요청마다10~15초 timeout을 사용했다. source28파일 해시 비교와 공식 feed/advisory 결과는 [수집 JSON](evidence/final-selection-20260921T2128.json)에 있다. 새 scanner execution 또는 적용하지 않은 패치를 완료로 표시하지 않는다.

수집 JSON SHA256 `82e99ae61a388778847fcfd6ee191353e981eb0be0206a5c0d6ec2f1d644e9c5`
