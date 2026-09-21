# REVIEW-057 — 최종 선택과 기존 안정 체크포인트 분리

FINAL-RESTORE-PLAN의 수정된 ‘매니페스트와 새 미디어 결합’ 문단, release-manifest.js/verify-release.mjs/release-binding.cjs 및 현재run의backup/stableCheckpoint를 읽었다. 계획문서 외 현재선택객체·백업·manifest·runtime·태그 변경은 없다.

판정: 정정은 구현과 정합적이다. release-manifest는 run.backup을 복사하며 stableCheckpoint를 소비하지 않는다. 따라서 실제 검증된 최종 선택만 run.backup에 연결하고 stableCheckpoint의 기존b6c manifest/c9b tag/5ff복원 연결을 보존하는 것이 맞다. 현재run.backup은5ff이고 finalReleaseSelection은없다. 계획상 새로운선택을미리완료로만들지않았다.

별도 finalReleaseSelection은 메인의 추적기록이며 현재코드가 자동으로검증/사용하는객체라고주장하지않는다. verifier는선택backup의실제파일SHA와deployment이미지를대조하고 기능복원판정은별도증거로남는다. media binding은 manifest.source.commit과approvedReleaseCommit, runtime/image/runId/실제접속경로를대조하므로새최종manifest의source와옛stable tag를혼합하지않아야한다. 문서에이순서가명시되어있다.

복원증거/현재판정을먼저commit한뒤manifest를생성하고, 이후최종미디어판정은별도로기록하며과거검증에 --at-commit을쓰는순서도맞다. manifest의source는그당시판정이며미래미디어완료를소급하여담지않는다. 기존final-observer-closeout-preparation-review의8fff961 plan hash는당시종료절차스냅샷으로보존하고이번선택문단정정과분리한다.

차단문제없음. 실제선택·백업·복원·manifest생성·프로세스조작·인수승격을수행하지않았다.21:27역할검토/21:37동결/22:07종료는불변이다.

검토파일SHA256:
- docs/operations/FINAL-RESTORE-PLAN.md: `232f159bba11ec533322c7f7fc8b88a1d3ea96da3e9adfbc387a944c28cec715`
- scripts/release-manifest.js: `58f642e69b7dd3048f731d27d78e9a5584e64c71579114f9da802e07463b9f72`
- scripts/verify-release.mjs: `a8e0cd4ac4db8989e544236602d0be7fa8fd0c2e6524ef905eab6840cff195f5`
- scripts/media/release-binding.cjs: `46fd7620f0bbc0890bd40b98b68093ccdedb0c24c77e9f2be3bb75402cf8f656`
