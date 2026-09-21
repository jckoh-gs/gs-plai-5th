# GRID — VPP SCADA·RTU 에뮬레이터

실제 발전설비 없이 외부 VPP 예측·입찰·제어 시스템을 연결하고 시험하는 한국어 가상 현장입니다. 이 저장소는 기존 구현을 재사용하지 않고 새로 작성했습니다. 발전량 예측·시장 입찰 알고리즘 및 실물 SCADA 통신은 포함하지 않습니다.

**데이터:** CSV/기상 → 1초 SCADA → 독립 RTU → SQLite outbox → MQTT → 외부 VPP.

**제어:** 외부 VPP MQTT 목표값 → RTU 검증·영속 접수 → SCADA 전달 → 발전기 모델 출력 → 완료/실패 결과.

## 로컬 실행

Node.js 24 이상과 Docker Compose가 필요합니다. 예제 환경은 다른 프로젝트와 충돌하지 않도록 HTTP 3101 / MQTT 18883을 사용합니다. 환경변수를 생략한 런타임 기본값은 PRD의 3001 / 1883입니다.

```sh
npm ci
cp .env.example .env  # 기존 .env가 없을 때만 실행
npm run broker
npm run build
npm start
```

[로컬 화면](http://127.0.0.1:3101). 빈 DB에는 풍력·태양광·복합 단지와 **합성 CSV** 데모가 생성됩니다. 기존 DB에서는 중복 생성하지 않습니다. `SEED_DEMO=false`로 빈 상태에서 시작할 수 있습니다. 개발 UI는 `npm run web`; 서버는 별도로 실행합니다.

로컬 브로커는 루프백에만 열며 익명 연결을 허용합니다. 원격 배포에서는 서로 다른 앱/VPP 계정과 ACL, 관리 API Bearer 인증 및 암호화된 Kubernetes 터널을 사용합니다. `.env`, `certs`, `data`, `artifacts/private`는 Git에서 제외됩니다.

## 화면과 동작

- **통합 대시보드:** 총 출력·정격, 단지별 3D, 기상, 출력 제한·기동·정지, 실제/가용 출력 차트, 원본 전류와 추정 전류.
- **RTU 디바이스:** 단말별 연결·수집·PUBACK·전송 실패·디스크 대기·명령 이력. 공용 프로세스 메모리는 RTU 하드웨어 값과 구분합니다.
- **시험 시나리오:** 배속·시드·일시정지, 6종 장애, 발전기 모델, 목표 kW 명령, 시나리오 저장·복원·내보내기.
- **이벤트 로그:** 영속 운영 이벤트.
- **연동 가이드:** 선택 RTU의 실제 토픽과 계약·설정·시험 절차 및 Markdown 다운로드.

CSV의 시간대 생략은 KST입니다. 10분 간격을 검증하며 시점 kW는 선형 보간, 평균 kW는 유지, 구간 kWh는 ×6 kW로 해석합니다. 원본과 모델 결과의 에너지는 램프·기동·제어로 달라질 수 있습니다. 기본 CSV 모드에서 기상 입력만 변경해도 CSV 발전량이 바뀌지 않습니다. 기상에 따른 출력을 시험하려면 weather 모드를 선택합니다.

`KMA_AUTH_KEY`가 없으면 기상청 실제 관측은 미연결 상태이며 수동 기상·CSV와 fixture 시험을 사용할 수 있습니다. 누적 일사는 순간 일사로 변환하지 않습니다.

## MQTT 시험

RTU UUID는 화면 또는 `/api/state`의 `plants[].id`에서 확인합니다.

```sh
RTU_ID=YOUR_RTU_UUID npm run vpp:monitor
RTU_ID=YOUR_RTU_UUID TARGET_KW=125 npm run vpp:dispatch
RTU_ID=YOUR_RTU_UUID TARGET_KW=125 VPP_REPORT_FILE=/existing/directory/result.json npm run vpp:dispatch
```

보고서 옵션은 dispatch 전용입니다. 실제 해당 명령의 완료와 파일 저장까지 성공해야 exit 0입니다. 미도달·연결 실패·저장 실패는 exit 1이며 미관측 결과는 null입니다. 파일 저장 실패로 명령을 자동 재발행하지 않습니다. 클라이언트 연결 제한 `VPP_CONNECT_TIMEOUT_MS`와 명령 실행 제한 `COMMAND_TIMEOUT_SECONDS`는 서로 다른 시간입니다.

QoS1은 적어도 한 번 전달이며 PUBACK은 브로커 수신 확인입니다. VPP 업무 완료가 아닙니다. 수신 측에서 `messageId`를 중복 제거해야 합니다. 명령은 retain=false로 발행하며 같은 ID 재시도에는 **같은 본문**을 사용합니다. 유효기간 변경은 새로운 명령입니다. 상세 계약은 [docs/protocol.md](docs/protocol.md)를 확인합니다.

## 검증

아래 통합시험은 실제 로컬 Mosquitto를 사용합니다. 시험 DB·prefix·clientId·HTTP 포트는 격리하며 사용자 DB를 사용하지 않습니다. 기본 시험 브로커는 18883입니다.

```sh
npm test
npm run test:integration
npm run test:advanced
npm run build
node scripts/report-integration.js
node scripts/crash-integration.js
node scripts/sixty-second-integration.js  # 실제 2분 이상 필요
node scripts/client-security-integration.js
```

강제 종료 시험은 로컬 TCP 프록시로 PUBACK만 차단하고 서버를 SIGKILL한 뒤 같은 메시지 재전송을 확인합니다. 이 방식은 실제 장애 fixture이며 제품의 영구 기능이 아닙니다. 60초 시험은 첫 불완전 구간과 이후 완전한 60샘플 구간을 구분합니다.

선택적 브라우저 검증은 Playwright와 Chrome 설치가 필요합니다. `scripts/browser-check.cjs`에 `GRID_URL`, `API_TOKEN_FILE`, `PLAYWRIGHT_NODE_MODULES`를 지정할 수 있습니다. 토큰을 URL에 넣지 않습니다.

## k3s 배포와 복구

대상은 `charles-k3s` / `gs-plai-5h`입니다. 구체적인 이미지 빌드·배포·접근 명령은 [deploy/README.md](deploy/README.md)에 있습니다. 앱은 1개 인스턴스와 Recreate 교체를 사용하며 SQLite 및 MQTT 데이터는 PVC에 저장합니다. 기본 context를 변경하지 않습니다.

현재 원격은1.6.0 후보(runtime331ab9a/image4af)이며 전체 복원 인수 전이다. 검증된 복구 기준은1.5.0/ad34 백업이고 이벤트 시각 누락 ISSUE023 한계를 포함한다. 현재 선택은 [실행 원장](docs/operations/run.json)과 [다음 작업](docs/operations/NEXT-ACTIONS.md)을 먼저 확인한다. 이전 릴리스 설명을 현재 배포·백업 선택으로 사용하지 않는다.

독립 로컬 SQLite 백업 CLI:

```sh
node scripts/backup.js data/lab.sqlite artifacts/private/backups/checkpoint.sqlite
```

이 로컬 CLI는 backup API와 integrity_check를 사용하는 기본 도구이며 원격 운영 helper의 worker/watchdog·재접속 보장을 제공한다고 해석하지 않습니다. 이번 자율 실행의 원격 백업·정확한 격리복원은 [최종 복원 계획](docs/operations/FINAL-RESTORE-PLAN.md)의 `remote-backup.mjs`와 선택 이미지/스냅샷/SHA 기록을 따릅니다. WAL이 열린 상태의 DB 본 파일만 복사하지 않습니다. 복원은 별도 DB 경로에서 검사하거나 앱을 정상 종료한 뒤 호환 백업으로 교체합니다. 소스/이미지 롤백과 DB 복원은 별도 절차입니다. 단일 노드 local-path는 노드 자체 손실에 대한 고가용성을 제공하지 않습니다.

네트워크 중단 후 작업 재개는 [복구 절차](docs/operations/NETWORK-RECOVERY.md)와 [미완료 단계 기록](docs/operations/resume.json)을 사용합니다. `node scripts/resume-status.mjs`는 실제 Git·배포 이미지·API 상태를 읽기 전용으로 확인합니다. 실행 중인 자동 연결 감독기가 있으면 같은 포트로 별도 터널을 중복 시작하지 않습니다. 원격 앱은 로컬 연결과 별도로 동작합니다.

## 요구·버전·검토 기록

- [PRD](docs/PRD-VPP-SCADA-RTU.md), [목표 운영 명세](docs/GOAL-VPP-AUTONOMOUS.md), [현재 실행 기록](docs/operations/run.json)
- [아이디어](docs/product/IDEAS.md), [PRD 변경](docs/product/PRD-CHANGELOG.md), [인수 증거 목록](docs/product/acceptance.json)
- [취약점 관리](docs/security/VULNERABILITY-MANAGEMENT.md), [이슈·해결 기록](docs/issues/ISSUES.md)

현재 결과물의 시험·배포·복원·영상/PPT 상태는 증거 기록으로 판단합니다. 과거 문서의 성공 기록이나 파일 존재만으로 이번 실행의 완료를 주장하지 않습니다. 실제 외부 VPP/AWS, 실물 설비, 제조사 동특성 인증과 대규모 장기 운영은 별도 검증 범위입니다.
