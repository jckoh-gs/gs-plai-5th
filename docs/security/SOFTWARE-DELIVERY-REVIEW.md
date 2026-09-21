# Software delivery helper 독립 보안 검토

범위: scripts/verify-software-delivery.mjs 읽기 검토. 실제 helper 실행, 원격 Git 조회, 배포/원장 수정은 하지 않았다. synthetic Git 음성시험은 issues 담당 소유이며 여기서 중복 실행하지 않았다.

## 최초 검토 당시 확인된 수정 권고 — 아래 최종 판정으로 해결

CLI는 SOFTWARE_GIT_DELIVERY_CHECKS_PASSED 보고서를 wx0600 output에 쓰고 fsync한 다음 원래 deadline을 다시 검사한다. 쓰기 도중 마감이 지나면 exit1/고정 INCOMPLETE stderr를 내지만 이미 PASS JSON 파일은 남는다. 이는 코드 순서로 확인했으며 이번 담당이 시간 주입 실행 재현을 했다는 뜻은 아니다. root와 issues에 전달했다. 권고는 소유 output의 실패 상태를 명시하거나 미완료 예약 후 성공 승격하고, 모든 소비자가 terminal 성공과 결과를 함께 확인하도록 하는 것이다. 비동기 중단/강제종료까지 파일 단독으로 최종 성공을 보장한다고 주장하면 안 된다. 후속 수정·fixture 결과를 별도 기록하기 전에는 이 항목을 해결로 표시하지 않는다.

issues가 전체 tests 트리 부재의 inventory 검사 빈틈을 확인하는 음성 fixture를 소유한다. 단순 prefix 전체성은 존재하지 않는 디렉터리를 요구하지 않으므로 필수 비어 있지 않은 tests/scripts inventory 조건이 필요하다. 해당 담당 결과 및 root 수정 후 최종 해시를 별도로 연결한다.

## 검토한 보호 경계

manifest 경로는 상대경로/부모참조 금지와 경로 구성요소 lstat symlink 거부를 적용한다. Git 파일은 blob 및100644/100755만 허용하므로 symlink/submodule을 일반 소스로 계산하지 않는다. inventory 해시 형식과 실제 Git blob SHA256, 필수 파일 및 prefix 전체성을 검사한다. source와 runtime을 별도로 읽고 동일 runtime 바이트를 source/main에 요구한다. 추가 README/env example/Compose/broker는 immutable hash에 소급 추가하지 않고 별도 supplemental로 표시한다.

고정 approved origin, freshly advertised main 및 annotated tag/peeled commit, 정확 runtime tag, source/runtime ancestry, main/checkpoint의 manifest 바이트를 대조한다. Git은 execFileSync 인자 배열과 timeout/maxBuffer를 사용하며 shell 명령문 보간을 하지 않는다. Git 실패 원문을 CLI에 노출하지 않고 고정 실패 문구만 출력한다. 보고서는 파일명/해시/크기/객체ID와 scope를 저장하며 파일 본문을 출력하지 않는다. 이 기능은 비밀내용 탐지기가 아니며 알려진 credential 부재를 독립 입증하지 않는다.

output 부모의 symlink를 거부하고 wx0600으로 기존 결과/최종 symlink 덮어쓰기를 막는다. 기본 Git 호출은8초, 전체 검증은60초와 원래 deadline 중 이른 값으로 제한되며 명령 후 remaining을 재확인한다. 동기 로컬 파일 I/O와 Git 하위프로세스/SSH 정리는 외부 deadline wrapper의 유한 실행 경계와 함께 사용해야 한다. 악성 로컬 Git config/SSH 환경 또는 검사 후 경로 교체 경쟁을 방어하는 샌드박스로 해석하지 않는다.

검증 PASS는 정확 Git 소프트웨어 인도 관측이다. 실제 runtime 실행, 실제 시험 성공, 최종 영상/PPT, 전체 목표 완료는 result에서 주장하지 않는다(completionClaim=false). 원격 refs는 관측 후 바뀔 수 있으므로 영구불변 서버 상태 보장도 아니다.

## 출처

검토 기록 UTC: 2026-09-21T18:29:41.697690+00:00

초기 검토 helper SHA256: `66121f4193bb8f7ef9046d4913416d4520048dcd4bf588d6e9d864ecfd1c9df7`

이전 network32시험은 별도 원본 로그 파일 없이 도구 세션51233에서 exit0/tests32/pass32/fail0으로 확인했다. NETWORK-RESUME-20260922-REVIEW.md에 당시 범위·소스 해시가 있으며 이 software 검토에서 재실행하지 않았다.

후속 독립 재현: issues 담당이 실제 CLI의 fsyncSync 완료 직후 Date.now+120초를 주입하여 exit1이면서 PASS result 파일이 남는 것을 확인했다. `tests/review-software-delivery.test.js`의18번째 시험 및 `docs/issues/evidence/software-delivery-review/tests-round3.log`에 보존했다. tests/ 트리 전체 부재도 testsAtSource=0으로 PASS하는 반례를 같은 담당이 확인했다. 이는 다른 담당의 실행 근거를 전달받은 것이며 보안 담당 재실행으로 표시하지 않는다. 두 항목은 수정 후 최종검토 전까지 미해결이다.

## 수정본 독립 소스 재확인

두 발견의 코드 수정 경계를 확인했다. completePrefixes의 server/web/samples/scripts/tests 각각에 실제 tree 항목을 요구하므로 전체 tests 부재도 required-tests-inventory-empty로 거부한다. 기존 regular blob 및 hash 전체성 검사와 함께 적용되며 파일이 있다는 것만으로 시험 성공을 주장하지 않는다.

CLI가 저장하는 JSON은 이제 SOFTWARE_GIT_CHECKS_RECORDED 및 requiresSuccessfulExitReceipt=true다. write/fsync/close와 원래 deadline 재검사 후에만 stdout에 PASS 및 exact outputSha256을 출력한다. 소비자는 정상 exit0, stdout 성공 receipt, 저장 파일 해시 일치를 함께 확인해야 한다. 잔존 파일 자체는 성공 증거가 아니므로 late write/중단 파일의 오인 PASS 경계를 수정했다. 함수 반환 PASS는 그 호출의 읽기 검사가 통과했다는 뜻이며 CLI 인도 성공 receipt를 대체하지 않는다.

이 변경은 OS 쓰기·종료·stdout 전송과 마감의 원자적 보장이 아니다. 마지막 시각 검사 직후 스케줄링 지연 또는 강제중단이 가능하며 outer deadline wrapper와 terminal 확인을 유지한다. 기존 파일은 wx로 보존된다. raw 실패 출력은 여전히 고정 문구로 차단한다. issues 담당 최종 fixture 실행은 별도 근거로 추가하며, 보안 담당은 수정 소스만 재확인했다.

재확인 UTC: 2026-09-21T18:30:13.934734+00:00

수정 helper SHA256: `2b13af5bdc2c53d48994984af04490060b74e081a90864b13e59d41c9be617fc`

## 최종 판정 — 두 코드 결함 수정 및 격리 검증 완료

[issues 독립 영수증](../issues/evidence/software-delivery-review.json)과 [round4 원본 로그](../issues/evidence/software-delivery-review/tests-round4.log)를 읽어 최종18/18 PASS, 담당 handle46430/exit0을 확인했다. 기록 시각은2026-09-21T18:30:26.911284Z이며 현재 helper SHA256 `2b13af5bdc2c53d48994984af04490060b74e081a90864b13e59d41c9be617fc`와 일치한다. 필수 tests 전체 부재는 거부되고, 실제 fsync 직후 마감 초과는 exit1이며 잔존 파일은 PASS가 아니다. 정상 CLI는 RECORDED/required exit receipt, stdout PASS/정확 파일 SHA/exit0/0600을 함께 확인했다. 보안 담당의 추가 시험 실행은 없었다.

따라서 위 두 코드 결함은 수정·격리 검증 완료로 종결한다. 최초 미해결 판정과 round2/3 실패는 당시 이력으로 보존한다. 시험은 실제 임시 Git/local bare SSH transport 범위이고 production origin 네트워크나 원격 변경은 없었다. 실제 원격 인도 검증은 메인 담당의 별도 근거가 필요하며, 이것을 비밀 스캔·runtime/백업 검증·최종 미디어·전체 목표 완료로 확대하지 않는다. 위 성공 receipt 소비 계약과 OS 원자적 마감 비보장 한계는 그대로 유지한다.
