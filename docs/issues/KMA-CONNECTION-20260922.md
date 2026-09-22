# KMA 실제 관측 연결

상태: 해결. 사용자 화면의 `KMA_AUTH_KEY 미설정` 오류를 실제1.7.2 Pod에서 재현했다. 앱 환경변수·Deployment 연결·기존 Secret에 KMA 인증키가 없어 외부 요청 전에 중단되는 상태였다.

사용자가 제공한 키로 기상청 API허브 ASOS 시간자료를 검증한 후 전용 `grid-kma/auth-key` Secret과 Deployment 환경변수 참조를 추가했다. 배포 템플릿에도 같은 참조를 보존한다. 새 설치에서 키가 없더라도 CSV/수동 입력은 사용할 수 있도록 참조는 optional이며 실제 KMA 조회는 구성 오류를 표시한다.

동일 이미지 재시작 후 실제 대관령 RTU의 KMA 조회 버튼 HTTP200, 출처kma, 오류없음, 2026-09-22 13:00KST 관측을 확인했다. 풍속2.8m/s·풍향90도·기온19.1도다. 일사650W/m²는 기존 입력값이다. 관련13시험 및 기존6RTU 설정·run ID 보존을 확인했다. [검증 근거](../../deploy/verification/kma-20260922/summary.json).
