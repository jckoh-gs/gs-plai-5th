# HTTP Ingress 추가 작업

2026-09-22 사용자 요청: `grid.koh.it.kr`를 k3s Ingress로 연결하고 인증서 없이 HTTP로 제공한다. 원래 14시간 실행이 종료된 후의 별도 변경이다.

## HTTP-001 — 일반 HTTP에서 브라우저 제어·복사 실패

기존1.7.1은 명령 전송 시 `crypto.randomUUID()`를 직접 호출하고 연동 가이드에서 `navigator.clipboard.writeText()`를 호출한다. localhost가 아닌 HTTP origin에서는 두 API가 제공되지 않아 제어 전송과 복사가 실패한다.

제품1.7.2에서 Web Crypto `getRandomValues`로 UUIDv4를 생성하는 대체 경로와 선택 텍스트 복사 대체 경로를 추가했다. 난수 생성은 `Math.random`으로 대체하지 않는다. 복사가 거절되면 수동 복사 안내를 표시하고 임시 입력 요소와 포커스를 정리한다. 새 OSS 패키지·서버·DB·MQTT 계약 변경은 없다.

실제 Chrome의 격리 HTTP origin에서 `isSecureContext=false`, 기존 두 API 부재를 확인하고 명령 접수·코드 복사·복사 거절 처리를 검증했다. 실제 클러스터 제어 데이터는 변경하지 않았다. 근거: [브라우저 검증](../../deploy/verification/ingress-grid-20260922/browser-http-compat.json). 배포 후 최종 판정은 같은 디렉터리의 릴리스 검증 기록을 참조한다.

API 제약 근거: [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), [Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
