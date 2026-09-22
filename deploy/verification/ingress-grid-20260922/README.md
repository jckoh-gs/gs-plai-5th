# HTTP Ingress / 제품1.7.2 검증

최종 판정은 [summary.json](summary.json), 실제 런타임·도메인 검증은 [release-verification.json](release-verification.json)을 참조한다. `verification.json`은 Ingress만 적용한 직후1.7.1의 점검이며 이후 HTTP 브라우저 제약을 보완한1.7.2를 별도로 배포했다.

359개 회귀와 실제 Chrome HTTP fixture, 배포된 UI·인증·실시간 연결·복사, 기존6개 RTU 설정/run ID 보존을 확인했다. 최초 전체 시험 실패와 원인을 지우지 않고 별도 최종 실행 로그를 보존했다. 취약점4매치/2CVE는 이전과 같고 미해결 관리 대상이다. 인증 토큰은 공개 HTTP로 전송하지 않고 인증된 Kubernetes 터널을 통해 Ingress를 검증했다.

원래14시간 실행의1.7.1 영상·발표자료·백업·불변 릴리스 증거는 이번 추가 배포와 구분한다. 새 백업 또는 DB 복원은 수행하지 않았다. 새 TLS 인증서·HTTPS 리다이렉트는 없으며 공유 컨트롤러의 기존443 리스너는 변경하지 않았다.
