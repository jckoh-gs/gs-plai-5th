# 제품 검토 038 — 1.7 불변 체크포인트 출처 검증

원래deadline을읽는75초wrapper에서명시적 `artifacts/releases/checkpoint-1.7.0.json`을 `verify-release.mjs --at-commit --remote`로독립검증했다. 종료0, **1731개해시PASS**, remoteImageMatched=true다. 원문은 review-038-manifest.log에보존했다. 과거current.json은사용하지않았다.

manifest SHA256 `146d33ee23f426cee4826c1e1f1d569bbad2614051c65efa2f99b865bb08e439`, source `91a23b8d2e620ca9e12d584cf7169627c7e01437`, runtime `d98d3c48d22c54e7fd092ee9e46ca9ab49e4bbf9`다. verifier가기록커밋의소스/runtime·증거·PRD·acceptance를대조하고로컬931876864바이트백업의스트리밍SHA `1cab74e110d172307ffd3605543da2db4261c27f009b97871a21bd1bf665827c`와현재Ready app/broker이미지일치를확인했다. 앱은d1e4b1d8…4c692다.

현재facts.template의고유deploy/verification근거10개(main목록/이벤트,outbox,복원양버전이벤트/현재form/list/receipt,restore-summary,stable-backup)는모두선택manifest.evidence멤버이며실제파일SHA도일치한다. reviewed=false/preparationTemplate=true를유지하므로최종영상사실이나검수완료로표현하지않는다.

기능복원판정은 REVIEW037의23보고서+2Podidentity와동일snapshot 현재1.7/하위1.6범위에근거한다. 이번검증은그시험을재실행한것이아니며단순파일존재로인수를추정하지않는다. runtime/source는별도이며태그생성·원격push·원장변경은메인후속이다. 본검토와로그만추가하고manifest/acceptance/PRD/run/resume를수정하지않았다.

판정: 1.7체크포인트의무결성과실제배포identity PASS. 최종미디어·시간·인도·1시간관찰·전체목표완료를뜻하지않는다.
