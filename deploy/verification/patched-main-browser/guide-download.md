# GRID MQTT 연동 규격 — 새 구현

설정을 생략한 런타임 기본 포트는 앱 3001, MQTT 1883입니다. 이 신규 작업의 `.env.example`과 로컬 Compose 예제는 기존 서비스와 충돌을 피하기 위해 앱 3101, MQTT 18883을 사용합니다. 예제 파일을 `.env`로 적용했다면 아래 3001/1883 주소를 3101/18883으로 바꾸거나 환경변수를 사용하세요. 원격 배포의 관리 API는 Bearer 인증이 필요하며 UI 로그인으로 토큰을 입력합니다. 실제 VPP/AWS 연결 완료를 뜻하지 않습니다.

## 부록 A. 완전한 MQTT 계약 및 연동 절차

다음 규격은 작성 시점의 v2 계약을 문서 안에 포함한 것이다. 외부 파일을 열지 않아도 전체 계약을 사용할 수 있다. 예제의 YOUR_* 값과 발행시각은 환경에 맞게 바꾼다.


### A-1. 경계와 실행

외부 VPP 입찰·제어 시스템은 **MQTT만으로** 연동합니다.

1. 가상 SCADA가 CSV/기상/발전기 모델로 1초 상태를 계산합니다.
2. RTU가 전체 SCADA 상태를 수집하여 SQLite에 기록합니다.
3. RTU가 `telemetry`를 VPP에 전송합니다.
4. VPP가 `setpoint`에 목표 kW를 보냅니다.
5. RTU는 형식·중복·유효기간·우선순위를 확인하고 접수 결과를 보냅니다.
6. RTU는 프로세스 내부 가상 SCADA 어댑터에 기동/정지/기기별 출력 지시를 보냅니다.
7. 측정 출력을 확인해 목표 도달 또는 실패를 VPP에 보고합니다.

현재 RTU→SCADA는 프로세스 내부 어댑터입니다. 실물 Modbus/OPC UA/IEC 프로토콜 연결은 별도 구현 대상입니다. 모델의 모든 발전기 상태와 이용 가능한 계측값을 전송하며, 실제 센서가 없는 값은 임의 계측치로 생성하지 않습니다.

```bash
npm install
npm run broker
npm run build
npm start
```

앱: <http://127.0.0.1:3001> → **연동 가이드**. 시험 시나리오와 RTU 메트릭 메뉴를 함께 사용하세요.

### A-2. 브로커·인증 설정

기본 로컬 Mosquitto는 `mqtt://127.0.0.1:1883`입니다. 외부 컴퓨터는 자신의 localhost로 이 브로커에 접근할 수 없습니다. 실제 VPP와 연결할 때는 양쪽에서 접근 가능한 동일 브로커를 지정하세요.

```dotenv
MQTT_URL=mqtts://YOUR-BROKER:8883
MQTT_PREFIX=vpp
MQTT_CLIENT_ID=vpp-scada-lab
MQTT_USERNAME=YOUR_USER
MQTT_PASSWORD=YOUR_PASSWORD
MQTT_CA=certs/ca.pem
MQTT_CERT=certs/client.crt
MQTT_KEY=certs/client.key
TELEMETRY_SECONDS=60
RETENTION_DAYS=30
```

계정 방식이면 username/password, mTLS 방식이면 인증서 파일을 설정합니다. CA·인증서 검증을 비활성화하지 않습니다. `.env`, `certs/`는 Git 제외 대상입니다.

각 RTU는 `<MQTT_CLIENT_ID>-<RTU_UUID>`로 독립 연결합니다. 관리 게이트웨이 연결은 기본 clientId입니다. VPP는 다른 clientId를 사용해야 합니다. 연결 단절 장애는 해당 RTU 연결만 종료합니다.

AWS IoT Core에서는 ATS endpoint:8883, Amazon Root CA, 디바이스 인증서·개인키, 해당 clientId 및 토픽의 Connect/Publish/Subscribe/Receive 정책이 필요합니다. RTU별 인증서를 쓰려면 `MQTT_DEVICE_CONFIG=certs/rtu-connections.json`을 설정하세요.

```json
{
  "RTU_UUID": {
    "MQTT_CLIENT_ID": "YOUR-THING-ID",
    "MQTT_CA": "certs/AmazonRootCA1.pem",
    "MQTT_CERT": "certs/rtu.crt",
    "MQTT_KEY": "certs/rtu.key"
  }
}
```

이 매핑에 없는 RTU는 공통 인증 설정과 자동 clientId를 사용합니다. 실제 AWS 계정 인증서와 정책은 제공되지 않아 실연결 검증 대상이 아닙니다. [AWS MQTT 문서](https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html), [연결 프로토콜](https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html).

### A-3. 토픽

prefix 기본 `vpp`. 모든 주요 메시지는 QoS 1입니다.

- `vpp/rtu/{rtuId}/telemetry`: RTU → VPP, 전체 SCADA 배치, retain=false.
- `vpp/rtu/{rtuId}/setpoint`: VPP → RTU, action=set_target 목표값, **retain=false**.
- `vpp/rtu/{rtuId}/command`: VPP → RTU, start/stop/set_limit/set_target 호환 명령, **retain=false**.
- `vpp/rtu/{rtuId}/ack`: RTU → VPP, accepted/rejected/중복 응답, retain=false.
- `vpp/rtu/{rtuId}/command-status`: RTU → VPP, executing/completed/failed/timed_out/expired/superseded/cancelled, retain=false.
- `vpp/rtu/{rtuId}/status`: RTU → VPP, 연결 상태, retain=true + Last Will.
- `vpp/gateway/status`: 관리 프로세스의 브로커 연결, retain=true + Last Will.

예: 모든 RTU 데이터는 `vpp/rtu/+/telemetry`로 구독합니다. RTU ID는 RTU 디바이스 화면 또는 `GET /api/state`의 plants[].id에서 확인합니다.

RTU MQTT 연결은 clean session입니다. 단절 중 외부 VPP가 보낸 명령의 브로커 보관을 보장하지 않습니다. VPP는 online 및 ACK를 확인하고 유효기간 내 같은 ID·본문으로 재시도해야 합니다. 오프라인 영속 보장은 RTU가 수집하거나 접수한 데이터/명령에 적용됩니다.

브로커는 기존 구독자에게 retained 발행을 retain 비트 없이 전달할 수 있습니다. RTU가 재구독하면서 받는 retained 제어는 거절하지만, 송신 측에서 **항상 retain=false로 지정**해야 합니다. 오래된 명령 실행 방지는 expiresAt으로 보완합니다.

### A-4. SCADA 전체 데이터

메시지의 `scada`는 배치 마지막 상태, `samples`는 각 **시뮬레이션 1초의 전체 상태** 배열입니다. 원래 v1의 powerKw/availableKw/electrical/weather 요약 필드는 호환용으로 최상위에도 제공합니다. 발전기 배열은 v2에서 `scada.generators` 또는 `samples[].generators`를 사용합니다.

메시지 식별:

- schemaVersion: 2
- messageId: outbox에서 부여한 불변 UUID. 재전송되어도 동일.
- sequence: RTU의 모든 영속 메시지 공통 증가번호. telemetry만 구독하면 번호가 건너뛸 수 있음.
- rtuId, runId: RTU와 시나리오 실행 ID.
- timestamp: 마지막 실제 수집 UTC ISO 8601.
- sourceTimestamp: 마지막 CSV 원본 UTC 시각.
- sampleCount: samples.length와 일치.
- batchFirstTimestamp, createdAt: 배치 첫 수집시각 및 패키징 시각.

각 SCADA 샘플:

- timestamp/time, sourceTimestamp, simulationSeconds, runId, mode(csv/weather), quality(SIMULATED).
- powerKw, availableKw.
- plant: id/name/type/lat/lon/station.
- weather: wind_speed_ms, wind_direction_deg, irradiance_wm2, temperature.
- weatherSource, weatherObservedAt, irradianceSource.
- electrical: voltage, sourceCurrentA, estimatedCurrentA, currentMethod. 측정/추정 불가능하면 null.
- generators: 모든 발전기의 id, type, ratedKw, rampKwPerSec, on, limitPct, powerKw, availableKw, targetKw, status, targetLimitKw, 기동 지연 및 모델 파라미터. 대용량 사용자 곡선 원문 대신 customWindCurve 여부를 전송하며 원문은 관리 API 모델 설정에서 확인.
- faults: 활성 장애 설정.
- controlPath: RTU → virtual SCADA → generators.

기본 60초마다 배치하며 서로 다른 runId의 샘플은 같은 배치에 섞지 않습니다. 단말 수·발전기 수·배속 때문에 메시지가 커지면 여러 패킷으로 나누며 각 payload는 120,000 bytes 이하입니다. 샘플이 준비되지 않은 초기/정지/센서중단 구간에는 sampleCount=60을 보장하지 않습니다. 배속은 1~60이며 배속 60에서는 실제 1초에 가상 60초가 계산됩니다. 실제 timestamp가 유사한 여러 샘플은 simulationSeconds와 runId로 구분합니다.

현재값은 관측시각을 기준으로 판단하세요. 오프라인 복구 데이터는 과거 수집시각을 그대로 유지합니다. messageId로 중복 제거하고 이미 수신한 메시지를 다시 저장하지 마세요. PUBACK는 브로커 수신 확인이며 VPP 애플리케이션의 저장/업무처리 확인은 아닙니다.

### A-5. VPP 목표값

```json
{
  "schemaVersion": 2,
  "commandId": "vpp-dispatch-unique-001",
  "action": "set_target",
  "targetKw": 500,
  "toleranceKw": 1,
  "timeoutSeconds": 120,
  "expiresAt": "발행 직전에 계산한 미래 ISO 시각",
  "priority": 50
}
```

- commandId: 1~128자, 전체 RTU에 걸쳐 고유. 같은 ID+같은 본문은 재실행 없이 최신 상태와 duplicate=true를 반환. ID는 같은데 본문/RTU가 다르면 rejected.
- targetKw: 0~대상 정격 합계. 목표 설정은 기동을 포함하고 기존 비율 제한을 대체.
- generatorId: 선택. 생략하면 단지 전체를 기기 정격에 비례해 분배. 다른 기기에 가용량을 재배분하지 않으므로 실제 VPP의 기기별 배분이 필요하면 generatorId로 발행.
- toleranceKw: 기본 1, 0.01~10000. 합계 및 개별 기기 출력 오차를 검사.
- timeoutSeconds: 기본 120, 1~3600. SCADA 전달 후 실제 시간 제한.
- expiresAt: SCADA 전달 가능한 마지막 실제 UTC 시각. 생략하면 접수 시점+30초. 이미 만료된 요청은 expired로 보존.
- priority: 기본 50, 0~100. 같은 발전기에 더 높은 우선순위의 활성 명령이 있으면 rejected. 같거나 높은 신규 명령은 기존 추적을 superseded로 변경.

실시간 입찰시스템에서는 expiresAt을 항상 명시하세요. 잘못된 retained 메시지의 브로커 저장분은 브로커에서 별도로 제거해야 합니다.

### A-6. 명령 수명주기 및 SCADA 제어 신호

- accepted: RTU 검증·영속 저장 완료. 아직 SCADA/출력 적용 완료가 아님.
- executing: SCADA에 전달. dispatchedAt/deadlineAt, scadaSignal 기록.
- completed: 대상 기동 지연 종료 및 실제 출력이 개별·합계 허용 오차에 도달.
- failed: SCADA 제어 거절.
- timed_out: 실행 제한시간 내 미도달. 가용 출력 부족, 램프 속도, 센서/출력 고정 장애 등이 원인.
- expired: SCADA 전달 전에 유효기간이 지남.
- superseded: 충돌하는 신규 우선 명령으로 추적 대체.
- cancelled: 모델 변경 또는 시나리오 복원으로 추적 종료.
- rejected: 형식·정격 범위·중복 ID 충돌·우선순위 등 검증 실패.

`scadaSignal`에는 operation과 대상별 on/limitPct/targetLimitKw, adapter=in-process-virtual-scada가 들어갑니다. kW 목표는 정격 비례로 각 발전기의 targetLimitKw로 변환됩니다. 램프와 기동 지연은 SCADA 엔진에서 적용합니다.

시간 초과·만료·추적 취소는 이미 전달된 제어값을 자동 원복하지 않습니다. 정지가 필요하면 VPP가 stop을 명시해야 합니다. 현재 시스템은 물리 설비 안전 인터록을 대신하지 않습니다.

기존 제어 예:

```json
{"commandId":"unique-stop-id","action":"stop"}
```

```json
{"commandId":"unique-limit-id","action":"set_limit","limitPct":50,"generatorId":"WT-01"}
```

set_limit은 정격 대비 상한이며 on/off는 변경하지 않습니다. start는 기존 상한을 유지하고 기동합니다. stop은 램프로 0을 향합니다.

재시작 전 실행 중인 명령은 복원합니다. 만료/제한시간은 실제 시간으로 평가하므로 서버가 꺼져 있던 시간도 포함됩니다. v1 명령 ID 기록은 재실행 방지 목적으로 보존하며 중복 응답에는 legacy_accepted가 표시될 수 있습니다.

### A-7. 영속화·장애 시험

SQLite `data/lab.sqlite`:

- scada_frames: 전체 1초 SCADA 샘플.
- outbox: 불변 messageId/sequence/payload/전송 시도/PUBACK 상태.
- command_runs/command_events: 현재 명령 수명주기와 전이 이력.
- rtu_metrics: 누적 메트릭, 재시작 복원.
- scenarios: CSV 및 설정을 포함한 시나리오 스냅샷.
- plants, samples, audit_events: 모델 상태·출력 이력·감사 이벤트.

수집 상태와 샘플은 하나의 트랜잭션으로 저장합니다. PUBACK 전에 중단되면 같은 messageId를 재전송합니다. 브로커 확인 직후 로컬 완료 기록 전에 중단될 수도 있으므로 VPP 중복 제거는 필수입니다.

RETENTION_DAYS 기본 30일. 전송 완료된 오래된 전체 샘플·메시지·감사/전이 이력은 매시간 정리합니다. 미전송 데이터, 명령 ID 기록, 시나리오는 자동 삭제하지 않습니다. 장기간 단절 시 디스크 사용량을 관리하세요. 로컬 디스크 장애나 용량 부족에 대한 HA 보장은 제공하지 않습니다.

시험 시나리오의 장애:

- offline: 특정 RTU MQTT 연결 종료. 나머지 RTU는 계속 동작.
- latencyMs: 발행 및 RTU→SCADA 전달 지연, 최대 30초.
- dropPct: 0~100% 확률로 발행 실패를 주입하고 outbox에서 재시도. 물리 네트워크 패킷 손실을 발생시키는 도구는 아님.
- sensorFreeze: RTU 신규 SCADA 수집 중지. 발전기 내부 시뮬레이션은 계속됨. 중단 구간의 샘플은 복원하지 않음.
- scadaReject: 접수 이후 SCADA 전달 단계 실패.
- actuatorStuck: 실제 출력 고정.

### A-8. 시나리오와 모델

시험 시나리오 페이지에서 재생/일시정지, 1~60배속, 난수 시드, 출력 변동률, 기상 자동 갱신 중지를 설정합니다. 저장 시 CSV·재생 위치·기상·발전기 상태/설정·장애·난수 상태를 함께 보관합니다. 복원은 새로운 runId를 부여하고, 기존 미전송 메시지는 지우지 않습니다. 기존 활성 명령은 cancelled, 라이브 기상 갱신은 중지합니다. 저장 당시의 재생/일시정지 상태도 복원합니다.

동일 입력·제어 순서·난수 상태이면 물리 모델 출력은 동일합니다. 실제 MQTT 네트워크 지연, 외부 VPP 처리시간과 명령 도착 시점은 결정론적으로 재현되지 않습니다. 현재 스냅샷은 미래의 외부 입찰 명령 타임라인을 자동 기록·재생하는 기능은 아닙니다.

발전기별 정격, 램프, 기동 지연, 풍력 cut-in/rated/cut-out, 사용자 `[풍속,정격비율]` 곡선, 태양광 온도계수·출력 보정계수를 설정합니다. 사용자 곡선은 풍속 오름차순, 비율 0~1입니다. 제조사 곡선을 넣을 수 있지만 제품 인증 모델이 자동 제공되는 것은 아닙니다.

태양광 일사는 별도 `timestamp,irradiance_wm2` 10분 CSV/TSV로 입력합니다. SCADA 원본 시각과 정렬하여 보간하고 범위 밖이면 기존 CSV/수동값을 유지합니다. 기상청 관측소 번호는 수정할 수 있습니다. KMA 지상관측의 누적 SI(MJ/㎡)를 순간 W/㎡로 임의 변환하지 않습니다.

### A-9. 실행 가능한 VPP 시험 클라이언트

```bash
# MQTT만으로 관측. RTU_ID를 생략하면 전체 RTU 구독.
RTU_ID=YOUR_RTU_UUID npm run vpp:monitor

# 명령은 명시적 dispatch에서만 전송.
RTU_ID=YOUR_RTU_UUID TARGET_KW=500 npm run vpp:dispatch
```

신규 제품 1.0.0의 보고서 실행 예(릴리스 최종 검증·stable 승격은 별도):

```bash
RTU_ID=YOUR_RTU_UUID TARGET_KW=500 VPP_REPORT_FILE=/absolute/result.json VPP_CONNECT_TIMEOUT_MS=10000 npm run vpp:dispatch
```

부모 디렉터리는 미리 존재해야 한다. UTF-8 JSON을 같은 디렉터리의 임시 파일에 쓴 뒤 rename하며 같은 출력 경로가 있으면 교체하므로 시험별 고유 경로를 권장한다. `VPP_REPORT_FILE`은 dispatch 전용이다. `VPP_CONNECT_TIMEOUT_MS`는 기본 10000ms, 100~60000ms이며 결과 대기시간은 명령 제한시간+45초다. 보고서의 `clientVersion`은 실행 package 버전이고 `serverVersion`은 확인할 수 없으면 null이다. `reportSchemaVersion:1`과 MQTT `contractVersion:2`를 구분한다. completed 수신 후에도 파일 저장이 실패하면 exit 1이며 자동 재발행하지 않는다. 수락 기준의 상세 내용은 FR-VPP-REPORT-01과 AT-VPP-REPORT를 따른다.

클라이언트는 구독을 먼저 완료하고 새 commandId로 목표를 전송합니다. messageId 중복 제거 후 상태를 출력하고 completed이면 exit 0, 실패/시간 초과이면 exit 1입니다. 종료 조건 대기는 기본 명령 제한시간+45초입니다. 소스는 `scripts/vpp-client.js`이며 실제 VPP 어댑터의 최소 예제로 사용할 수 있습니다.

외부 시스템 통합 체크:

1. 브로커 접속 및 subscribe/publish 권한 확인.
2. RTU status와 최신 telemetry 관측시각 확인.
3. 낮은 목표 kW 발행 → accepted/executing/completed 및 실제 출력 확인.
4. 동일 메시지 재전송 → duplicate, 재실행 없음.
5. 실제 가용량보다 높은 목표 → timed_out.
6. scadaReject/actuatorStuck/latency/expired 명령 시험.
7. RTU 단절·복구·프로세스 재시작 → 같은 ID로 전송 재개 및 VPP 중복 제거.
8. VPP의 응답 처리 실패, 늦은 과거 관측, 서로 다른 runId 처리 점검.

### A-10. 관리 API

HTTP 관리 API는 MQTT 연동에 필수는 아니며 로컬 개발 UI에서 사용합니다. 기본 127.0.0.1 바인딩입니다. API_TOKEN을 설정하면 `/api/health` 외 API에 `Authorization: Bearer ...`가 필요합니다. 내장 UI에는 토큰 로그인 기능이 없으므로 원격 관리 시 인증 프록시 또는 별도 클라이언트를 사용합니다.

- GET /api/state, /api/events(SSE), /api/health.
- POST /api/plants: 기존 CSV 등록 규격.
- POST /api/plants/{id}/commands: 동일 RTU 명령 처리기로 시험.
- GET /api/plants/{id}/commands: 최근 200개 명령 추적.
- PATCH /api/plants/{id}/faults: 장애 설정.
- POST /api/plants/{id}/replay: seconds/paused/speed/seed/noisePct/freezeLiveWeather.
- PATCH /api/plants/{id}/generators/{generatorId}: 모델 설정. 활성 명령 추적 취소.
- PATCH /api/plants/{id}/station: `{ "station":100 }`.
- POST /api/plants/{id}/irradiance: `{ "csv":"timestamp,irradiance_wm2..." }`, csv:null 해제.
- PATCH /api/plants/{id}/weather, POST /api/plants/{id}/weather/refresh.
- GET /api/plants/{id}/samples: 최근 3,600개 출력.
- GET /api/plants/{id}/scada: 최근 120개 전체 샘플.
- GET /api/scenarios, POST /api/scenarios `{plantId,name}`.
- POST /api/scenarios/{id}/run, GET /api/scenarios/{id}/export.
- GET /api/guide: 이 문서 다운로드.

```bash
npm test
npm run test:integration
npm run test:advanced
```


