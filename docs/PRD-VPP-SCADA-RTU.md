# GRID — VPP·SCADA·RTU 통합 에뮬레이터 PRD

문서 버전: 1.12 · 기준일: 2026-09-21 · 제품 기준: SCADA Emulation Engine v2 / MQTT 계약 v2

## 문서의 목적과 사용법

이 문서는 이전 대화나 기존 저장소가 없는 개발팀이 제품을 처음부터 구현하고, 로컬에서 실행하고, 외부 VPP 연동 시험까지 준비할 수 있는 독립적인 제품 요구사항 명세다. 요구사항, 기본 정책, 계산식, 화면, 데이터 계약, 저장 구조, 개발 순서, 인수 시험과 소개·시연 영상 및 발표자료 PPT 산출물을 포함한다. 뒤의 부록에 설정 파일·실행 클라이언트·샘플 데이터·상세 프로토콜을 본문으로 포함하므로 외부 파일이 있어야만 내용을 이해할 수 있는 구조가 아니다.

본문에서 **필수**는 이번 버전 완료 조건, **기준 구현**은 현재 선택한 구현 방법, **후속 범위**는 이번 버전의 완료 조건이 아닌 확장 항목을 뜻한다. 기존 구현에서 검증한 사실은 23장에 구분한다. 검증 기록은 새 구현의 시험을 면제하지 않는다. 스크린샷·영상·기존 코드의 우연한 동작보다 본 문서에 명시한 데이터 의미와 인수 조건을 우선한다. 실제 외부 시스템의 주소·자격증명·제조사 곡선은 프로젝트마다 공급받는다.

### 목차

1. 제품 배경과 목표
2. 사용자와 핵심 사용 흐름
3. 범위·용어·시스템 경계
4. 아키텍처와 모듈 책임
5. RTU·단지·발전기 등록
6. CSV 정규화와 시간 처리
7. 시뮬레이션 엔진과 발전 모델
8. 기상청·수동 기상·일사 데이터
9. 제어 처리와 명령 수명주기
10. MQTT 데이터·제어 계약
11. 영속 저장과 복구
12. RTU 메트릭과 상태 판정
13. 장애 주입
14. 시나리오 저장·재현
15. 화면별 상세 요구사항
16. HTTP 관리 API
17. 설정·보안·외부 VPP 연결
18. 개발환경과 실행
19. 비기능 요구사항과 제한
20. 인수 시험
21. 구현 순서와 완료 정의
22. 소개·시연 영상 및 발표자료
23. 과거 구현 기록과 신규 검증 경계
24. 외부 연동 전 필요한 입력
25. 변경 관리와 후속 범위
부록 A. 완전한 MQTT 계약 및 연동 절차
부록 B. 파일별 실행 설정과 MQTT 시험 클라이언트
부록 C. 사용자 풍력 원본 예시와 재생 샘플 생성
부록 D. SQLite 기준 스키마

## 1. 제품 배경과 목표

VPP의 예측 시스템과 입찰·제어 시스템은 별도로 존재한다고 가정한다. 현장 발전기나 실제 RTU를 확보하지 않고도 이 시스템들의 데이터 수신 및 제어 연동을 개발·시험할 수 있어야 한다. 프로젝트는 가상 SCADA 서버와 가상 RTU, 발전기 모델, 로컬 MQTT 브로커 및 운영 화면을 제공한다.

### 목표

- G-01: 10분 발전 이력을 1초 SCADA 상태로 변환해 외부 시스템이 반복적으로 사용할 수 있게 한다.
- G-02: VPP가 MQTT로 전달한 목표 kW를 RTU가 검증하고 SCADA 제어로 변환하며, 실제 모델 출력으로 도달 여부를 판단한다.
- G-03: 풍력·태양광·복합 발전단지와 발전기 상태를 화면 및 3D로 관찰한다.
- G-04: 통신 단절, 지연, 센서 중단, 제어 거절, 목표 미도달 같은 실패 조건을 재현한다.
- G-05: 데이터·명령·상태를 보존하고 재시작 후 시험을 계속한다.
- G-06: 문서와 실행 가능한 MQTT 클라이언트만으로 실제 VPP 팀이 연결을 시작할 수 있게 한다.

성공은 화면이 그려지는 것만으로 판단하지 않는다. 실제 로컬 브로커를 통해 전체 SCADA 수신, 목표값 발행, RTU 접수, SCADA 전달, 출력 피드백, 완료 결과까지 왕복해야 한다. 외부 VPP가 아직 제공되지 않아도 MQTT 시험 클라이언트로 이 경로를 검증해야 한다.

## 2. 사용자와 핵심 사용 흐름

**VPP 개발자:** telemetry를 구독하고 자신의 제어 알고리즘으로 setpoint를 발행한다. 데이터 최신성, 중복, 명령 결과를 해석한다.

**에뮬레이터 운영자:** RTU와 CSV를 등록하고 기상·모델·재생·출력 제한을 조정한다. 발전 상태와 RTU 상태를 각각 확인한다.

**통합시험 담당자:** 알려진 입력으로 시나리오를 저장하고 장애를 주입하며, 재시작 및 재전송을 검증한다.

**검토자:** 대시보드와 소개 영상을 통해 목적, 구현 범위, 실제 연결 단계와 제한을 이해한다.

### 기본 사용자 여정

1. 프로젝트 의존성 설치 → 로컬 Mosquitto 기동 → 앱 빌드 및 서버 실행.
2. 데모 단지를 확인하거나 RTU 추가에서 단지·CSV 등록.
3. CSV 또는 기상 모드로 1초 출력을 생성하고 3D·발전기 상태를 확인.
4. RTU 페이지에서 독립 연결, 최근 수집, PUBACK, 버퍼를 확인.
5. 외부 시험 클라이언트로 telemetry·ack·command-status 구독.
6. 낮은 목표값을 발행하고 accepted → executing → completed 확인.
7. 장애 주입 및 미도달 조건을 만들어 정상/실패 결과의 차이를 확인.
8. 시나리오 저장·복원, 서버 재시작, 중복 제거 검증.
9. 연동 가이드의 브로커·토픽·인증 설정을 실제 VPP 환경에 맞게 적용.

## 3. 범위·용어·시스템 경계

### 필수 범위

CSV/TSV 입력, 정규화, 1초 엔진, 발전 모델, 출력 제한·기동·정지·목표 kW, 전체 SCADA 배치, 독립 RTU MQTT 연결, 디스크 outbox, 명령 수명주기, 메트릭, 장애, 재현 가능한 모델 시나리오, 기상청 연동, 3D, 이벤트 로그, 연동 문서 페이지, 샘플과 자동 시험, 소개 영상.

### 이번 버전에서 구현하지 않는 업무

발전량 예측 알고리즘, 시장 가격 예측, 입찰 최적화, 실제 시장 입찰 제출·정산, 실물 발전기 제어, 실제 Modbus/OPC UA/IEC 통신, 제조사 인증 디지털 트윈, 실제 지형·후류·음영·전력조류 해석, 운영 SCADA 고가용성, 사용자·조직 권한 관리, 외부 VPP의 미래 명령 전체 타임라인 녹화·재생, 시나리오 JSON 가져오기, 단지 삭제 워크플로는 후속 범위다. AWS IoT 인증 설정을 지원하되 자격증명 없이 실연결 완료로 취급하지 않는다.

### 용어와 관계

- **Plant / 발전단지:** 지리·유형·CSV·기상·발전기 집합을 가진 단위.
- **RTU:** 해당 단지의 전체 SCADA를 수집하고 MQTT로 전송하며 제어 요청을 검증하는 논리 단말.
- **SCADA:** 기상·CSV·모델을 계산하고 발전기에 제어를 적용하는 가상 현장 계층.
- **Generator:** 풍력 WT 또는 태양광 PV 모델 1기.
- **1:1 관계:** 이번 버전에서 RTU 1개는 Plant 1개이며 동일 UUID를 사용한다. RTU 하나에 여러 단지를 연결하는 구조는 만들지 않는다.
- **실제 시간:** 운영체제 현재 UTC 시각. 연결·유효기간·timeout·수집시각의 기준.
- **가상 시간:** 시뮬레이션이 진행한 초 수. 배속과 일시정지의 영향을 받는다.
- **원본 시간:** CSV에서 재생 중인 시각. 과거 날짜여도 현재 수집시각과 구분한다.
- **가용 출력:** 제어 상한 전, 정격과 모델에 의해 가능한 출력.
- **목표값:** VPP가 요청한 출력. 가용량이 부족하면 목표를 채운 것으로 처리하지 않는다.
- **PUBACK:** MQTT 브로커의 QoS 1 수신 확인. VPP 업무처리 완료 확인이 아니다.

## 4. 아키텍처와 모듈 책임

```text
CSV/TSV ─┐
KMA ─────┼─> 가상 SCADA 엔진 ─> 전체 1초 SCADA ─> RTU 수집 ─> SQLite
수동기상 ┘          ↑                                         │
                    │                                         v
              가상 제어 어댑터                          영속 outbox
                    ↑                                         │
                 RTU 검증 <── setpoint ─── MQTT 브로커 <── telemetry
                    │                         ↑   │
                    └─ ack / command-status ──┘   v
                                          외부 VPP 시스템

브라우저 UI ── REST 설정·시험 / SSE 상태 ── 서버
```

기준 구현은 Node.js 단일 서버 프로세스 안에 논리 SCADA와 RTU를 나누는 구조다. RTU마다 MQTT 연결은 분리한다. UI에서 직접 발전기 객체를 고쳐 제어 경로를 우회하지 않는다. UI 시험 제어와 MQTT 제어는 동일 Controller를 사용한다.

### 책임 분리

- `model`: CSV 파서, 단지 생성, 모델 계산, 제어 적용, 공개 상태 직렬화.
- `control`: 요청 검증, 중복 방지, 우선순위, 영속 명령, SCADA 전달, 도달/실패 판정.
- `store`: SQLite 트랜잭션, 전체 샘플, 분할 배치, outbox, 시퀀스, 정리.
- `transport`: RTU별 연결, 토픽 구독, 발행·PUBACK, 재시도, 인증·LWT.
- `metrics`: 수집·통신·명령 수신 지표 및 상태 판정.
- `weather`: 서버 측 KMA 조회·파싱·유효성 검사.
- `API/engine`: 초기화, REST, SSE, 주기 실행, 종료 처리.
- `web`: 대시보드, RTU, 시험실, 로그, 가이드, 3D.

### 실행 주기

실제 약 1초마다 Controller 진행 → 단지별 speed 횟수의 1초 모델 step → 센서 정상 시 전체 frame 저장 → 상태 저장 → Controller 진행 → SSE 전송. 배치 주기는 기본 실제 60초다. 100ms 주기의 전송 펌프로 준비된 프레임을 패키징하고 미전송 메시지를 순차 발행한다. 이는 하드 실시간 스케줄러가 아니며 OS 정지·부하 시 실제 정확한 1Hz를 보장하지 않는다.

## 5. RTU·단지·발전기 등록

### FR-REG-01 등록 입력

- name: 공백 제거 후 1~80자, 필수.
- type: wind / solar / hybrid, 필수. CSV 모양으로 유형을 자동 변경하지 않는다.
- csv: UTF-8 CSV 또는 TSV 본문, 필수.
- count: 1~100 정수, 기본 6. hybrid는 최소 2.
- ratedKw: 발전기 1기 정격, 1~1,000,000 kW, 기본 3,000.
- rampKwPerSec: 0.01~정격 kW/s, 기본 정격/20.
- unit: kw 또는 kwh, 기본 kw.
- semantics: sample 또는 mean, 기본 sample.
- lat/lon: 함께 입력하거나 둘 다 생략. 각각 -90~90, -180~180.
- station: KMA 관측소 정수 1~9999, 생략 시 등록 위치와 가까운 후보 관측소.

입력 전체를 검증한 뒤 생성한다. 실패 시 행 번호·필드·허용 범위를 표시하고 RTU나 발전기를 부분 생성하지 않는다. 요청 본문 상한은 파일 포함 JSON 20MB다.

### FR-REG-02 좌표 미입력

대관령(37.69,128.75,100), 영덕(36.42,129.37,277), 제주(33.36,126.26,185), 신안(34.83,126.10,165) 중 한 곳을 선택하고 위·경도 각각 ±0.025도 범위의 가상 좌표를 부여한다. 좌표는 실제 발전소 위치로 표시하지 않고 “지역 인근 가상 좌표”로 표시한다. 임의 좌표 생성은 시뮬레이션 출력 난수 시드와 별개다. 관측소 자동 선택은 이 후보군 중 거리 제곱 최소값 기준이며 전국 관측소 검색 기능이 아니다.

### FR-REG-03 발전기 구성

순수 풍력은 WT-01…; 순수 태양광은 PV-01…을 만든다. hybrid는 앞 ceil(count/2)기를 풍력, 나머지를 태양광으로 한다. ID의 숫자는 전체 배열 순번이다. 생성 직후 on=true, limitPct=100, powerKw=0이며 램프에 따라 변한다. 등록 시 기기 정격은 동일하고 이후 개별 모델 화면에서 변경 가능하다.

빈 DB에서는 대관령 풍력 6×3,000kW, 신안 태양광 8×500kW, 제주 복합 8×1,500kW의 데모를 생성한다. 기존 데이터가 있으면 데모를 중복 생성하지 않는다. SEED_DEMO=false면 자동 생성을 하지 않는다. 사용자 제공 풍력 예시는 기상 열이 없는 유효한 입력이며 야간 0출력 형태만 보고 태양광으로 간주하지 않는다.

## 6. CSV 정규화와 시간 처리

### FR-DATA-01 형식과 열

UTF-8, BOM, 쉼표 CSV 및 탭 TSV를 지원하고 빈 줄과 값 주변 공백을 제거한다. 헤더 제외 2~100,000행. 첫 줄에 탭이 있으면 TSV로 처리한다.

필수는 timestamp와 power_kw다. hybrid에서 power_kw가 없으면 wind_power_kw와 solar_power_kw를 모두 요구한다. 선택 열은 wind_speed_ms, wind_direction_deg, irradiance_wm2, voltage, current_a다. 선택 기상 열이 없어도 정상 등록한다. 원본 발전 CSV에 temperature 열을 넣어 온도를 재생하는 기능은 현재 계약에 포함하지 않는다.

호환 별칭: timestamp=datetime/시간/일시, power_kw=발전량/출력, wind_power_kw=풍력출력, solar_power_kw=태양광출력, wind_speed_ms=풍속, wind_direction_deg=풍향, irradiance_wm2=일사량, voltage=전압, current_a=전류. 다른 열은 계측 필드로 자동 추가하지 않는다.

### FR-DATA-02 검증

ISO형 YYYY-MM-DD HH:mm[:ss] 또는 T 구분자를 허용한다. 시간대 생략은 KST(+09:00), Z/명시 오프셋은 해당 시각을 사용한다. 실제 달력에 없는 날짜, 파싱 불가, 중복, 역순, 정확히 600초가 아닌 간격을 거절한다. 누락 시간을 자동 보충하거나 정렬해 숨기지 않는다.

출력·전압·전류는 유한한 0~1e9, 풍속 0~100m/s, 일사 0~2,000W/㎡, 풍향 0~360도. 필수 값의 빈 문자열과 NaN/Infinity를 거절한다. 선택 값이 비면 결측으로 취급한다. 원본 출력이 설비 정격을 넘는 경우 원본은 보존하고 모델 가용 출력을 정격으로 제한한다.

### FR-DATA-03 출력 의미와 보간

`kw + sample`: 각 행이 시점 출력이다. 구간의 f=(경과초 mod 600)/600에 대해 P=P_i+(P_(i+1)-P_i)×f로 선형 보간한다.

`kw + mean`: 각 행이 이후 10분의 평균 출력이다. 해당 600초 동안 값을 유지한다.

`kwh`: 각 행이 이후 10분 구간 발전 에너지다. 평균 kW=6×입력 kWh로 변환하고 구간 동안 유지한다. kwh의 경우 semantics가 sample이어도 hold를 사용한다.

예: 10kWh 입력은 60kW를 600초 유지해 제어 전 에너지 10kWh가 된다. 선형 보간 모드에는 원본 구간 평균 에너지 보존을 주장하지 않는다. 제어·램프·기동 지연·정격 제한을 적용한 최종 출력 에너지는 원본과 달라질 수 있다.

마지막 행은 다음 600초 동안 유지하고 전체 rows×600초가 지나면 첫 행으로 반복한다. 마지막 값에서 첫 값으로 연결 보간하지 않는다. 풍향은 350→10도를 0도 경유 최단 각도로 보간한다. 그 외 수치 열은 선택된 linear/hold 의미에 따른다. 현재 행에서 없는 선택 값은 다음 행의 값만으로 역추정하지 않는다.

### FR-DATA-04 분배와 전기 계측

CSV 출력은 단지 총출력이다. 총 power_kw가 있으면 발전기 수로 균등 배분한다. hybrid 분리 출력만 있으면 각 유형 기기 수로 나눈다. 이는 VPP 목표값의 정격 비례 분배와 별개 정책이다. 발전기 1기 데이터면 count=1로 등록한다.

전압과 원본 전류는 보간한 값을 원본 계측으로 표시한다. 제어 후 전류는 sourceCurrentA×actualPlantKw/sourcePowerKw로만 추정한다. sourcePowerKw≤0이거나 원본 전류가 없으면 null이다. 임의 역률·상수로 전류를 새 계측값처럼 만들지 않는다. 원본/추정 라벨을 UI와 payload 양쪽에 유지한다.

## 7. 시뮬레이션 엔진과 발전 모델

### FR-SIM-01 두 모드

csv 모드는 입력 출력 재생이 발전량의 기준이다. weather 모드는 풍력·태양광 수식으로 발전량을 계산한다. 두 모드 모두 정격, 가동 여부, 출력 상한, kW 목표, 램프, 기동 지연, 출력 고정 장애를 적용한다. 수동 기상을 바꿔 실제 발전량을 변화시키려면 weather 모드를 사용한다.

### FR-SIM-02 시간과 난수

speed=1~60 정수, 기본 1; paused 기본 false; seed와 rngState 기본 42; noisePct 기본 0, 범위 0~50%; freezeLiveWeather 기본 false. 일시정지는 모델·새 샘플 생성을 멈추지만 네트워크와 기존 명령 timeout은 진행한다. 재생 위치 seconds는 0~rows×600-1 정수다. 위치 이동은 모델 출력·명령 전체를 초기화하는 기능이 아니다.

LCG 기준: state=(1664525×state+1013904223) mod 2^32, random=state/2^32. 한 step의 단지 공통 계수 n=1+(2×random-1)×noisePct/100를 사용한다. 같은 시작 모델·입력·제어 순서·시드이면 같은 출력을 만든다. 전송 실패 난수는 별도 faultRngState(기본 12345)를 사용한다.

### FR-SIM-03 풍력

기본 cut-in=3m/s, rated wind=12m/s, cut-out=25m/s.

```text
v < cutIn 또는 v >= cutOut: factor=0
ratedWind <= v < cutOut: factor=1
그 외: factor=(v³-cutIn³)/(ratedWind³-cutIn³)
rawPower=ratedKw×factor
```

개별 windCurve는 [풍속, 정격비율] 2~100개 지점이다. 풍속 0~60, 비율 0~1, 풍속 중복 없이 오름차순. cut-in/out을 먼저 적용하고 곡선 내부는 선형 보간한다. 곡선 범위 밖의 유효 운전 풍속에서는 양 끝 비율을 유지한다. null로 기본 3차 곡선 복귀.

### FR-SIM-04 태양광

```text
factor=clamp((irradianceWm2/1000)
             ×(1+temperatureCoefficient×(temperature-25))
             ×solarEfficiency, 0, 1)
rawPower=ratedKw×factor
```

temperatureCoefficient 기본 -0.004/℃, 범위 -0.02~0.01. solarEfficiency는 이번 모델의 출력 보정계수이며 기본 1, 범위 0.01~1이다. 기상 온도를 단순 온도 보정 입력으로 사용하며 셀 온도 열역학 모델이 아니다. 수동 야간 일사 시나리오를 허용하고 천문 일출·일몰로 강제 0을 만들지 않는다.

### FR-SIM-05 제한과 응답

```text
availableKw=clamp(rawPower×noise,0,ratedKw)
targetKw=on ? min(availableKw,ratedKw×limitPct/100,targetLimitKw 또는 ∞) : 0
기동 지연 진행 중이면 targetKw=0
powerKw_next=max(0,powerKw+clamp(targetKw-powerKw,-rampKwPerSec,+rampKwPerSec))
```

actuatorStuck이면 실제 powerKw는 유지한다. 정지도 램프로 0에 도달한다. 기동 지연은 0~3600 가상 초, 기본 0이며 on:false→true 전환 때 시작한다. 소수 지연도 허용하되 1초 step마다 감소하고 그 step에는 0출력을 지시한다.

개별 설정: ratedKw 1~1e6, ramp 0.01~ratedKw, cutIn 0~40, ratedWind 0.1~50, cutOut 0.2~60이고 cutIn<ratedWind<cutOut. 정격 축소 시 현재 출력은 새 정격 이하로 제한한다. 모델 변경 시 해당 단지 활성 명령 추적을 cancelled로 종료한다.

발전기 상태: STOPPING, OFF, STARTING, RAMPING, CURTAILED, IDLE, RUNNING. 정지 지시 후 잔여 출력, 기동 잔여시간, 목표와 실제 차이, 제한과 가용 차이를 순서대로 판단한다. 상태 비교 허용차 기본 0.01kW이며 명령 완료 허용차와 별개다.

## 8. 기상청·수동 기상·일사 데이터

### FR-WTH-01 KMA 조회

서버에서 `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php`를 호출한다. stn=관측소, help=0, authKey=환경변수. 현재 관측 조회에는 과거 예시 tm을 고정하지 않는다. 키는 브라우저 코드·문서·로그·영상에 포함하지 않는다. 네트워크 timeout은 12초. 시작 시 조회하고 기본 30분마다 갱신한다.

관측 행의 일시·관측소·풍향·풍속·기온을 해석한다. 기준 파서 열은 시간 0, 관측소 1, 풍향 2, 풍속 3, 기온 11이다. 유효 풍향 1~36은 10도 단위로 변환하고 360은 0으로 정규화한다. 결측 풍향은 기존값을 보존한다. 풍속 0~100, 기온 -60~60 범위. 관측이 3시간보다 오래됐거나 현재보다 10분 이상 미래이면 실패로 표시한다. 외부 API 형식 변경은 fixture 시험으로 감지한다.

### FR-WTH-02 덮어쓰기 정책

기본값 또는 기존 KMA 기반 상태일 때 자동 조회 결과를 기본 기상에 적용한다. 사용자가 수동 시나리오를 설정한 경우 자동 조회가 이를 덮어쓰지 않는다. “현재 관측 불러오기”는 명시적으로 weather 모드를 활성화하고 live weather 동결을 해제한다. 오류 시 직전 유효값/기본값을 유지하고 오류와 출처·관측시각을 표시한다. 실패값을 0으로 덮어쓰지 않는다.

수동 입력 범위는 풍속 0~40m/s, 풍향 0~360도, 일사 0~2000W/㎡, 온도 -40~60℃. 기본값은 8m/s, 240도, 650W/㎡, 22℃.

### FR-WTH-03 일사

KMA SI 누적 일사(MJ/㎡)를 순간 W/㎡로 직접 대입하지 않는다. 이번 버전은 CSV 또는 수동 일사로 태양광 모델을 구동한다. 별도 timestamp,irradiance_wm2 10분 CSV/TSV를 등록할 수 있고 동일 시간·범위 검증을 적용한다. SCADA의 sourceTimestamp와 정렬하여 선형 보간하며 범위 안에서 최우선 사용한다. 범위 밖은 기존 CSV/수동 일사를 유지한다. csv:null로 별도 일사 입력을 해제한다. 출처는 irradiance_csv / scada_csv / manual을 구분한다.

## 9. 제어 처리와 명령 수명주기

### FR-CTRL-01 지원 명령

- set_target: 목표 kW. 기본 대상은 전체 단지; generatorId가 있으면 1기. 대상 정격 합계의 0~100% 범위. 정격 비례로 기기별 targetLimitKw를 배분하고 limitPct=100 및 on=true. 실제 가용량에 따라 재배분하지 않는다.
- set_limit: 정격 대비 0~100% 상한. 기존 targetLimitKw를 해제하며 on/off는 바꾸지 않는다.
- start: 기존 상한을 유지하고 기동한다.
- stop: 정지 지시 후 램프로 0에 접근한다.

제어는 물리 안전 인터록이 아니다. 0kW 목표는 기동 상태에서 0출력 목표이며 stop과 같은 on/off 의미가 아니다.

### FR-CTRL-02 수신 검증과 중복

commandId는 비어 있지 않은 1~128자 문자열이며 모든 RTU에 걸쳐 고유하다. JSON 객체 키를 재귀 정렬해 요청을 canonical 직렬화하고 원 요청과 함께 저장한다. 같은 ID·같은 요청·같은 RTU이면 재실행하지 않고 최신 상태 + duplicate:true를 반환한다. 같은 ID에 다른 필드/RTU이면 rejected. 재시도에서 expiresAt만 새로 바꿔도 다른 본문이므로 새 ID를 사용해야 한다.

선택 schemaVersion은 2만 허용한다. MQTT 제어 payload 상한은 8192 bytes. setpoint 토픽은 action=set_target만 허용한다. malformed JSON, 없는 발전기, 잘못된 수치, retained 재전달은 거절한다. 검증은 모델 복제본에서 수행하여 accepted 이전에 실제 제어 상태가 바뀌지 않게 한다.

### FR-CTRL-03 시간·우선순위

expiresAt 기본 접수+30초, 명시 권장. 이미 지난 유효기간은 expired로 보존하며 SCADA에 전달하지 않는다. timeoutSeconds 기본 120, 범위 1~3600, SCADA 전달 후 실제 시간 기준. toleranceKw 기본 1, 범위 0.01~10000. priority 기본 50, 범위 0~100.

대상 발전기가 겹치는 활성 명령만 충돌한다. 더 높은 우선순위가 실행 중이면 신규 요청을 거절한다. 같거나 더 높은 신규 요청이 유효하면 기존 추적을 superseded로 바꾼다. 전체 단지와 개별 발전기 명령도 대상 교집합으로 충돌한다. 오래된 목표를 자동 재개하는 스케줄러는 없다.

### FR-CTRL-04 상태 전이

```text
검증 실패 -> rejected
이미 만료 -> expired
검증 성공 -> accepted
accepted -> executing | expired | failed | superseded | cancelled
executing -> completed | timed_out | superseded | cancelled
```

accepted는 영속 접수, executing은 SCADA 실제 전달, completed는 센서 피드백 기준 목표 도달이다. scadaReject는 failed. sensorFreeze 동안 completed로 판정하지 않는다. offline 상태에서는 accepted 명령의 SCADA 전달을 대기하고 유효기간은 계속 흐른다.

완료 조건: 모든 기동 지연 종료, 합계 출력 오차≤toleranceKw, 각 기기 배정 목표와 실제 출력 오차≤toleranceKw. set_target은 요청 kW 자체와 비교한다. stop은 0과 비교한다. start/set_limit은 가용량과 적용 상한을 반영한 출력과 비교한다. 유효한 도달 피드백이 없으면 timed_out이다. 실제 합계 errorKw는 actual-target 부호를 유지한다.

결과에는 commandId, plantId, action, source(REST/MQTT), targets, acceptedAt, expiresAt, updatedAt, dispatchedAt, deadlineAt, actualKw, errorKw, reason 및 scadaSignal을 해당 상태에 맞게 넣는다. scadaSignal은 operation, 대상별 id/on/limitPct/targetLimitKw, adapter=in-process-virtual-scada를 포함한다.

timeout·취소·대체는 추적의 종료이며 이미 전달된 발전기 설정을 자동 원복하지 않는다. 후속 stop이나 새 목표가 실제 설정을 변경한다. 서버 중단 시간도 실제 유효기간과 실행 제한시간에 포함한다.

## 10. MQTT 데이터·제어 계약

상세 메시지 의미와 예제는 본 문서 부록 A를 구현 계약으로 사용한다.

### FR-MQTT-01 연결과 토픽

기본 URL mqtt://127.0.0.1:1883, prefix=vpp. RTU별 clientId는 vpp-scada-lab-{UUID}, 관리 연결은 vpp-scada-lab. 재연결 1500ms, 연결 timeout 10000ms, clean=true. 단말 연결별 독립 구독·LWT·오류 상태를 유지한다.

RTU는 telemetry, ack, command-status, status 발행 및 setpoint, command 구독. VPP는 반대로 동작한다. telemetry/제어/결과는 QoS1, retain=false. status만 retain=true와 LWT. gateway 상태와 각 RTU 상태를 혼동하지 않는다. 공통 prefix 외부 wildcard 입력은 허용하지 않는다.

### FR-MQTT-02 전체 SCADA

모든 모델 발전기의 현재 출력·가용량·제어 상태·모델 설정, 단지 식별/위치, 기상/출처, 전기값, 장애, 원본/실제/가상 시각을 전송한다. 모르는 실측 센서를 만들어 채우지 않는다. quality는 SIMULATED다.

telemetry의 scada는 배치 마지막 전체 snapshot, samples는 각 1초 전체 snapshot 배열이다. 발전기 원문 custom curve는 관리 API로 조회하고 MQTT에는 customWindCurve 여부를 전송해 payload를 제한한다. sampleCount=samples.length. 이전 요약필드 powerKw/availableKw/electrical/weather는 최상위 호환 필드로 유지한다.

기본 실제 60초마다 수집분을 배치한다. 최대 60 samples/메시지, UTF-8 JSON 전체 120,000 bytes 이하로 분할한다. 많은 발전기·배속에서는 한 주기에 여러 메시지가 생긴다. 서로 다른 runId는 한 메시지에 섞지 않는다. 초기·일시정지·센서 중단에서는 60개를 보장하지 않는다.

messageId는 불변 UUID, sequence는 RTU의 telemetry와 명령 결과에 공통인 단조 증가번호다. telemetry만 구독할 때 sequence가 건너뛰는 것은 곧 유실을 뜻하지 않는다. 재전송은 ID·sequence·본문·관측시각을 변경하지 않는다.

### FR-MQTT-03 전달 보장 경계

outbox는 RTU가 수집/접수한 데이터의 적어도 한 번 전달을 지원한다. 브로커 PUBACK 이전에는 완료 처리하지 않는다. PUBACK 직후 DB 기록 전 중단 시 중복 전송될 수 있으므로 VPP가 messageId 중복 제거를 한다. 업무처리 완료 ACK는 별도 제공하지 않는다.

clean session이므로 RTU 오프라인 중 외부 발행 제어의 브로커 보관을 보장하지 않는다. VPP는 online 확인, 결과 토픽 선구독, 유효기간 내 같은 ID·본문 재시도를 수행한다. 송신자는 반드시 retain=false로 발행한다. 브로커가 기존 구독자에게 retain bit 없이 retained 발행을 전달할 수 있으므로 수신 측 검사만으로 모든 retained 발행을 차단한다고 주장하지 않는다.

## 11. 영속 저장과 복구

### FR-STORE-01 데이터와 식별

SQLite WAL을 사용한다. 기준 파일 data/lab.sqlite. DB_PATH로 시험용 경로를 분리한다. Plant JSON에는 dataset, generators, replay, runId, simulationSeconds, elapsed, weather, faults, 난수 상태를 보관한다. 식별자는 새 구현에서 생성하며 기존 시연 UUID를 하드코딩하지 않는다.

전체 테이블과 열은 부록 D에 포함한다. 명령 원본문은 canonical 비교용으로 보존한다. 스키마 변경 시 기존 단지·CSV·명령 ID의 재실행 방지 정보가 사라지지 않게 마이그레이션한다. 변경 전 SQLite 일관성 있는 백업을 만든다.

### FR-STORE-02 트랜잭션과 발행

한 step 묶음의 모델 상태와 새 SCADA frame은 같은 트랜잭션에 저장한다. 배치 생성 시 outbox 생성과 frame→messageId 연결도 원자적으로 반영한다. outbox는 RTU별 seq순, 연결당 1개 inflight를 기본으로 한다. 실패 후 1초 뒤 재시도하며 장애 지연을 적용한다. 한 RTU의 실패가 다른 RTU의 발행을 차단하지 않는다.

재시작 시 단지, 난수·모델 상태, 누적 메트릭, 활성 명령, outbox, 미배치 frame을 읽는다. telemetryPending 같은 진행 중 메모리 수치는 0으로 초기화하고 영속 항목에서 재시작한다. 명령 접수·SCADA 전달 상태도 복원한다.

### FR-STORE-03 보존과 이력

RETENTION_DAYS 기본 30, 범위 1~3650. 매시간 오래된 완료 outbox, 그 메시지의 full frame, 감사/명령 전이, 요약 샘플을 정리한다. 미전송 메시지·미배치 frame·명령 ID 본 기록·시나리오는 자동 삭제하지 않는다. 무제한 오프라인 보관에 필요한 디스크 용량을 보장하지 않는다.

화면 최근 발전 이력은 180점, 출력 이력 API는 최근 3600개, 전체 frame API는 최근 120개, 명령 API는 최근 200개, 감사 이벤트 최근 80개, 단말 수신 이력 최근 20개가 기준이다. 전체 장기 이력 조회·페이지네이션·데이터웨어하우스는 후속 범위다.

## 12. RTU 메트릭과 상태 판정

### FR-METRIC-01 단말별 필수 지표

generatedSamples, firstSampleAt, lastSampleAt, sampleAgeSeconds; telemetryAttempts, telemetryConfirmed, telemetryFailed, telemetryPending, skippedPublications; confirmedBytes, lastConfirmedAt, pubackAgeSeconds, lastPubackMs, lastPayloadBytes, lastBatchSamples, lastError; commandsReceived/Accepted/Rejected/Duplicate, lastCommandMs, recentCommands; 디스크 pendingMessages/unbatchedSamples/oldestPendingAt.

PUBACK 지연은 발행 요청부터 callback 확인까지의 시간이며 제어 목표 도달 시간도 전체 VPP 처리시간도 아니다. 완료율은 성공/(성공+실패)이며 시도 전 대기는 분모에 섞지 않는다. 실패 주입은 전송 시도 실패로 집계하고 샘플 삭제 수로 표시하지 않는다. 명령 수신 메트릭의 accepted는 접수 분류이며 completed 개수로 해석하지 않는다.

카운터는 SQLite에서 재시작 복원한다. 공용 Node 프로세스의 RSS와 가동시간은 gateway/session 지표로 분리한다. 가상 RTU별 CPU·메모리·온도·배터리 등 실제로 계측하지 않은 하드웨어 값은 생성하지 않는다.

### FR-METRIC-02 health 우선순위

1. 연결 끊김 → DISCONNECTED.
2. 재생 일시정지 → PAUSED.
3. 첫 샘플 전 → STARTING.
4. 마지막 샘플이 3초 초과 경과 → STALE.
5. PUBACK가 아직 없고 첫 샘플 후 2×전송주기+5초 이내 → WAITING, 이후 → DELAYED.
6. 최근 PUBACK 경과가 2×전송주기+5초 초과 → DELAYED.
7. 나머지 → HEALTHY.

관측시각 기반 경과시간은 실제 시간으로 계산한다. 화면은 정상/지연/단절을 텍스트와 색상으로 함께 표현한다.

## 13. 장애 주입

### FR-FAULT-01 지원 장애

- offline:boolean=false — 해당 RTU 연결 종료. 나머지 RTU는 계속 연결. 센서 정상이라면 로컬 수집·디스크 저장은 계속한다.
- latencyMs:0~30000, 기본 0 — outbox 발행과 RTU→SCADA 전달 지연.
- dropPct:0~100, 기본 0 — 발행 시도 실패 확률. 실제 네트워크 패킷 손실 도구가 아니다.
- sensorFreeze:boolean=false — 신규 RTU frame 수집 중지. 모델은 계속 움직인다.
- scadaReject:boolean=false — 접수 명령의 SCADA 전달 단계에서 failed.
- actuatorStuck:boolean=false — 계산 목표와 무관하게 현재 실제 발전 출력 고정.

필드는 RTU별로 저장한다. 부분 PATCH는 지정 필드만 바꾸고 전체 검증 실패 시 부분 적용하지 않는다. “모든 장애 해제”는 해당 RTU의 모든 장애를 기본값으로 되돌린다. 센서 수집 중단 기간은 데이터가 없는 구간이며 복구 뒤 보간해 실제 측정인 것처럼 채우지 않는다.

### FR-FAULT-02 UI 피드백

현재 연결·장애와 디스크 대기수를 표시한다. 장애 적용/해제는 감사 이벤트를 남긴다. 시연이나 자동 시험 종료 시 변경 전 모델·제어 설정을 복원하고 주입 장애를 해제한다. 실제 사용자 데이터에서 시험할 때 테스트 RTU를 명확히 선택한다.

## 14. 시나리오 저장·재현

### FR-SCENE-01 저장 범위

이름 1~80자, plantId 필수. CSV 원본 정규화 dataset, 일사 dataset, 발전기 모델/실제 출력/제어 상태, 기상, 장애, 재생 위치, 배속/일시정지, rngState와 faultRngState를 복제한다. UI 단기 history와 임시 telemetryBuffer는 비운다. 생성시각과 고유 시나리오 ID를 저장한다.

### FR-SCENE-02 복원

기존 단지 ID에 저장 snapshot을 복원하고 새로운 runId를 생성한다. 기존 활성 명령을 cancelled로 종료하고 단기 차트를 초기화한다. 라이브 기상 자동 갱신은 중지하여 저장 조건이 외부 조회로 바뀌지 않게 한다. 저장된 paused 상태는 유지하므로 “재실행”이 반드시 자동 재생을 뜻하지 않는다.

기존 미전송 outbox와 frame을 지우지 않는다. 이전·새 runId를 섞지 않고 각각 전송한다. 동일한 모델 입력과 제어 순서로 출력 재현을 검증한다. MQTT 지연이나 외부 시스템 처리시간까지 동일하게 만드는 기능은 아니다.

시나리오 목록·저장·복원·JSON 내보내기를 제공한다. export는 schemaVersion:1, name, snapshot을 포함한다. MQTT schemaVersion:2와 구분한다.

## 15. 화면별 상세 요구사항

공통 UI는 한국어, 어두운 녹색 배경과 라임 계열 상태 강조를 기준으로 한다. 명확한 단위, 카드 제목, 버튼 라벨, 로딩·오류·빈 상태를 제공한다. 화면 폭이 좁으면 사이드바를 아이콘 중심으로 줄이고 내용은 스크롤로 접근한다. 데이터 표를 숨기거나 모바일에서 제어 기능을 잃지 않게 한다. 입력에는 연결된 label, 버튼에는 접근 가능한 이름, 슬라이더에는 키보드 조작을 제공한다.

### UI-01 통합 대시보드 / #dashboard

전체 총 출력(MW), 총 정격, 가동 지시 발전기 수/전체 수, 이용률, MQTT 상태를 표시한다. 가동 지시 수는 on=true 기준으로 출력>0인 기기 수와 구분한다. 단지 카드에는 유형, 이름, 기기 수, 정격과 현재 출력. 카드 선택은 아래 3D·기상·제어·차트·발전기 표의 대상을 바꾼다.

3D는 선택 단지의 풍력 터빈과 태양광 패널, 개념 지형을 표시한다. 풍향에 맞는 터빈 방향, 운전/풍속에 따른 회전, 선택 기상과 출력 상태를 관찰할 수 있어야 한다. 드래그 회전·스크롤 확대를 지원하고 “가상 지형·개념 모델”을 명시한다. 실패 시 다른 운영 기능은 계속 사용할 수 있게 3D를 지연 로딩한다.

기상 카드: CSV/기상 모드, 풍속·풍향·일사·온도, 적용 버튼, KMA 수동 조회, 관측소·출처·시각·오류. 차트는 최근 180점의 실제/가용 출력을 비교하고 CSV 원본 재생 위치, 행 수, 보간법, 반복 횟수를 표시한다. 위치 슬라이더와 이동 버튼 제공.

발전기 표: ID, 상태, 현재 kW, 제한 %, 기동/정지. 전기값은 전압·원본 전류·제어 후 추정 전류를 분리. 출력 제어는 단지/발전기 선택, 정격 대비 % 슬라이더, 적용, 기동, 정지로 구성한다. UI 명령은 UUID를 생성하고 동일 Controller로 전달한다.

### UI-02 RTU 디바이스 / #devices

목적은 단말 데이터 수집·전송·명령 처리 상태 확인이며 발전량 대시보드 복제가 아니다. 전체 등록/정상 RTU, 수집 샘플, PUBACK 완료, 명령 접수 요약과 공용 gateway 지표를 표시한다. 단말 이름/ID 검색, 단말별 상태 표, 선택 단말 상세를 제공한다.

상세에는 CSV 정규화·최근 수집·전기값, outbox·미배치 샘플, 연결 clientId, 발행 시도·완료·실패·바이트·PUBACK·오류, 명령 수신 이력과 telemetry 토픽을 포함한다. “발전 제어 화면”은 선택 RTU를 유지하며 대시보드로 이동한다.

### UI-03 시험 시나리오 / #lab

상단 RTU 선택, online/offline, runId, simulationSeconds. 4개 탭을 제공한다.

- 재생·장애 시험: 배속(1/2/5/10/30/60), 시드, 변동률, 재생/일시정지, live weather 동결, 적용; 6종 장애와 해제; 대기 메시지·미배치 샘플.
- 발전기·기상 모델: 발전기 선택, 정격/램프/기동 지연/풍력 임계값/곡선/태양광 계수, 관측소, 일사 CSV 등록/해제. 변경 영향 안내.
- 목표값·처리 결과: 제어 대상, kW, 허용 오차, timeout, 유효기간, 우선순위, 전송. UI는 REST 시험이고 외부 VPP는 MQTT임을 표시. 제어 경로와 최근 20개 수명주기 상태·목표/실제·SCADA 전달시각·원인.
- 저장 시나리오: 이름 입력, 저장, 목록, 복원·재실행, JSON 내보내기. 새 runId와 명령 취소·기상 동결 의미 안내.

### UI-04 이벤트 로그 / #logs

영속 최근 감사 이벤트를 시간·유형·메시지로 표시한다. 오류, 장애 변경, 시나리오 실행 등을 확인한다. API 키/비밀번호/개인키를 기록하지 않는다.

### UI-05 연동 가이드 / #api

브라우저 안에서 외부 팀이 읽을 수 있는 문서 페이지다. RTU 선택 시 실제 선택 ID로 토픽과 예제가 변경된다. 5개 탭: 연결 준비, SCADA 데이터, 목표값·결과, 시험 절차, 운영 설정. 코드 복사 버튼과 전체 규격 Markdown 다운로드를 제공한다.

반드시 포함: 데이터/제어 방향, 로컬과 원격 localhost 차이, QoS/retain, payload 필드, 시간 의미, null/추정/가상 표시, 중복 방지, 상태 수명주기, offline 범위, 단순 PUBACK와 VPP 처리 차이, MQTT 클라이언트 실행, 인증/TLS/AWS 설정, 한계.

### UI-06 RTU 추가

공통 헤더에서 접근하는 등록 폼. 유형/단지명/기기 수/1기 정격/램프/위경도/관측소/단위/값 의미/파일 입력. 누락 좌표 정책과 파일 헤더 설명, 샘플 다운로드를 제공한다. 등록 성공 후 새 단지를 선택해 상태를 확인할 수 있어야 한다. 오류는 필드/원본 행에 연결해 표시한다.

## 16. HTTP 관리 API

기본 /api, JSON. 관리 API는 VPP MQTT 연동의 필수 경로가 아니다. API_TOKEN 사용 시 `/api/health`와 `/api/config` 외에 Authorization: Bearer가 필요하다. 공통 검증 오류는 기준 구현에서 400과 {error:string}; 인증 실패 401. 자원별 정상 응답은 아래를 따른다. 새 구현은 오류 코드 세분화를 별도 버전 변경 없이 클라이언트와 합의한다.

- POST /datasets/preview: FR-PREVIEW-01의 읽기 전용 CSV 검증/정규화 요약.
- GET /config: 인증 불필요. `{authRequired:boolean,version:string}`만 제공하며 토큰·설정 비밀을 반환하지 않는다.
- GET /health: 프로세스와 브로커 상태를 확인하는 경량 응답. 브로커 단절이 곧 HTTP 서버 중단은 아니다.
- GET /state: mqtt, gateway, plants[], events 등 화면 상태. plants에는 dataset 원문 대신 행 수·보간법·단위·시작/끝을 제공. 각 plant에는 공개 모델, connection, rtuMetrics, outbox, controlRuns 포함.
- GET /events: text/event-stream, 연결 초기 및 약 1초마다 `data: <state JSON>\n\n`. 끊어진 클라이언트 정리. 느린 클라이언트에는 화면 스냅샷을 건너뛰되 데이터 엔진을 멈추지 않는다.
- POST /plants: 5장 등록 JSON, 성공 201과 공개 plant.
- POST /plants/{id}/commands: 9장 명령 JSON, 접수 결과. 동일 제어 처리기 사용.
- GET /plants/{id}/commands/export: FR-COMMAND-EXPORT-01의최신20개명령상태JSON.
- GET /plants/{id}/commands: 최근 200개 명령 배열.
- PATCH /plants/{id}/weather: {mode:"csv"|"weather", wind_speed_ms?, wind_direction_deg?, irradiance_wm2?, temperature?}; 공개 plant 반환.
- POST /plants/{id}/weather/refresh: KMA 수동 조회 및 weather 모드 활성화; 관측 결과 반환.
- POST /plants/{id}/replay: {seconds?,paused?,speed?,seed?,noisePct?,freezeLiveWeather?}; 공개 plant 반환.
- PATCH /plants/{id}/faults: 13장 부분 장애 JSON; 공개 plant 반환.
- PATCH /plants/{id}/generators/{generatorId}: 7장 모델 부분 JSON; 공개 plant 반환, 활성 명령 추적 취소.
- PATCH /plants/{id}/station: {station:정수}; 공개 plant 반환 및 이전 관측 캐시 제거.
- POST /plants/{id}/irradiance: {csv:문자열|null}; {rows:개수}.
- GET /plants/{id}/samples: 최근 출력 샘플 3600개.
- GET /plants/{id}/scada: 최근 전체 frame 120개.
- GET /scenarios: id/name/plant/created 목록, 최신 우선.
- POST /scenarios: {plantId,name}; 201 {id,name}.
- POST /scenarios/{id}/run: 복원한 공개 plant.
- GET /scenarios/{id}/export: 다운로드 JSON; 없는 ID는 404.
- GET /samples/{type}: wind/solar/hybrid 샘플 CSV 다운로드.
- GET /guide: 전체 MQTT 연동 규격 Markdown 다운로드.

### 독립 실행 가능한 등록 요청 예시

```json
{
  "name":"시험 풍력 1호",
  "type":"wind",
  "count":1,
  "ratedKw":1000,
  "rampKwPerSec":50,
  "unit":"kw",
  "semantics":"sample",
  "csv":"timestamp,power_kw,voltage,current_a\n2026-01-01 06:10:00,34.9,380,30.61\n2026-01-01 06:20:00,69.72,380,61.16"
}
```

기본 모드는 CSV이므로 1000kW 정격이라고 곧 1000kW 가용 출력을 갖는 것은 아니다. 첫 성공 제어 시험에서는 CSV 재생 구간을 충분한 출력 구간으로 이동하거나 명시적으로 기상 모드 조건을 준비한다.

## 17. 설정·보안·외부 VPP 연결

설정 생략 시 런타임 기본은 앱 3001 / MQTT 1883이다. 신규 작업 폴더의 `.env.example`과 로컬 Compose는 기존 서비스 충돌을 피하기 위한 예제 포트 3101 / 18883을 사용한다. 실제 실행에서는 적용한 환경변수와 주소를 기록하고 아래 기본 포트 예제도 함께 치환한다.

필수 설정은 부록 B .env.example에 포함한다. PORT=3001, HOST=127.0.0.1, MQTT_URL, MQTT_PREFIX, TELEMETRY_SECONDS=60, KMA_AUTH_KEY, RETENTION_DAYS=30. 선택은 DB_PATH, SEED_DEMO, API_TOKEN, MQTT_CLIENT_ID, MQTT_USERNAME/PASSWORD, MQTT_CA/CERT/KEY, MQTT_DEVICE_CONFIG다.

로컬 브로커는 루프백 바인딩·anonymous를 사용한다. 이는 외부 운영 브로커 설정이 아니다. 외부 통신은 접근 가능한 공통 브로커와 TLS 인증을 설정한다. TLS 검증을 끄지 않는다. RTU별 인증 JSON은 공통 설정 위에 clientId/인증서 값을 덮어쓰되 MQTT 브로커 주소는 현재 버전에서 공통이다.

AWS는 ATS endpoint:8883, CA, 디바이스 인증서, 개인키와 clientId·토픽 권한을 공급받는다. RTU의 publish/subscribe/receive뿐 아니라 gateway 상태 연결도 허용하거나 환경에 맞게 설계한다. 실제 계정의 권한 정책과 인증서를 검증하기 전 AWS 연결 완료라고 표시하지 않는다.

API 기본은 로컬 접근이다. 토큰 설정 시 내장 UI는 401에 토큰 입력을 표시하고 sessionStorage에 탭 세션 동안만 저장한다. REST·SSE·다운로드 모두 Authorization 헤더를 사용하며 URL query나 로그로 토큰을 전달하지 않는다. SSE는 fetch 스트림으로 수신하고 인증 실패 시 재로그인을 안내한다. 다중 사용자 원격 운영은 후속 인증·인가 설계가 필요하다. .env, certs/, data/와 백업 DB는 저장소에 올리지 않는다. 개발 편의를 위해 인증서를 프런트엔드 번들에 포함하지 않는다.

### 실제 VPP 연결 순서

1. 접근 가능한 MQTT 주소, 포트, 인증, prefix, 대상 RTU를 확정한다.
2. VPP clientId와 모든 RTU clientId 충돌 여부를 확인한다.
3. VPP가 status/telemetry/ack/command-status를 먼저 구독한다.
4. 관측 sourceTimestamp와 실제 timestamp, runId, 발전기 배열, quality를 검증한다.
5. expiresAt을 발행 직전 생성해 낮은 목표를 전송한다.
6. 접수/SCADA 전달/출력 도달을 동일 commandId로 추적한다.
7. 중복, offline, timeout, 늦은 과거 배치와 run 전환을 시험한다.
8. 실제 VPP가 다른 필드/단위/토픽이면 양쪽 계약 또는 명시적 변환 어댑터를 정한다.

## 18. 개발환경과 실행

### 소스 저장소 및 원격 배포 대상 — 확정 정보

- Git 저장소(SSH): `git@github.com:jckoh-gs/gs-plai-5th.git`
- GitHub 저장소: <https://github.com/jckoh-gs/gs-plai-5th>
- 원격 배포 플랫폼: k3s.
- 배포 namespace: `gs-plai-5h` (사용자 확정). 네임스페이스의 존재·생성 및 접근 권한은 아직 검증하지 않았다.
- kubectl context: `charles-k3s`. 원격 명령은 이 context를 명시하고 사용자의 기본 context를 임의 변경하지 않는다.
- API 서버가 보고한 버전: `v1.33.4+k3s1`, API 서버 플랫폼: `linux/amd64`. 이는 연결 시험 당시의 값이며 전체 노드 아키텍처를 확인한 결과는 아니다.
- 계정 권한: 사용자는 admin 계정이라고 제공했다. 배포 권한이 있을 것으로 예상하지만 실제 RBAC/리소스 생성 권한을 검증한 사실과 구분한다.

현재 실행은 사용자의 신규 개발 시작 및 k3s 배포 완료 지시에 따른다. 기존 구현을 재사용하지 않으며 새 소스·새 시험 증거로 완료를 입증한다. 과거 문서 갱신만 승인했던 시점의 실행 제한은 현재 사용자 지시를 대신하지 않는다.

### DEPLOY-01 — 필수 k3s 배포 수락 기준

실제 배포 작업을 시작할 때 저장소 원격 설정·기준 브랜치·배포 커밋을 확인한다. 배포 context는 `charles-k3s`, namespace는 `gs-plai-5h`로 고정한다. 네임스페이스 범위의 원격 명령에는 `--context=charles-k3s --namespace=gs-plai-5h`를 명시하고 해당 리소스 매니페스트의 `metadata.namespace`도 일치시킨다. 이미지 레지스트리/이미지명, 서비스 공개 방식(Ingress/도메인/TLS), 저장소(StorageClass/PVC), MQTT 브로커 위치·노출·인증 방식은 아직 미정이다. 기존 클러스터 자원과 운영 정책을 확인한 뒤 결정·기록하며 현재 존재하거나 구성 완료된 것으로 가정하지 않는다.

현재 앱은 단일 프로세스·SQLite 기준이므로 최초 배포는 앱 인스턴스 1개를 기준으로 설계한다. SQLite 및 outbox의 영속 저장과 백업·복원을 포함하고, 업데이트 중 두 writer가 같은 DB를 동시에 열지 않도록 교체 전략을 정한다. 단순 replicas 증가로 고가용성이 확보된다고 주장하지 않는다. 이미지 아키텍처는 배포할 노드를 확인한 뒤 정한다.

KMA 키·MQTT 인증서·계정·관리 API 토큰·kubeconfig·SSH 개인키는 저장소나 이미지에 포함하지 않는다. 클러스터 Secret 등 배포 환경의 비밀정보 전달 수단을 사용한다. 컨테이너 내 API 바인딩을 외부 접근 가능한 주소로 설정하는 경우 관리 API 인증 및 프런트엔드 인증 흐름을 함께 검증한다. 로컬 익명 MQTT 구성을 원격 공개용 보안 구성으로 간주하지 않는다.

배포 완료는 Pod 기동만으로 판단하지 않는다. 지정 context/namespace의 실행 버전, readiness, UI 접근, 실제 MQTT 전체 데이터·목표값 왕복, 재시작 후 DB/outbox 복원과 이전 정상 버전 복구를 검증한다. 이미지·매니페스트·커밋·검증 증거를 배포 기록에 연결한다. 이 항목은 이번 실행의 필수 완료 조건이며 배포 완료 기록 자체가 아니다.

### 기준 기술 스택

Node.js 24 이상(기준 검증 24.16.0), ESM, node:sqlite DatabaseSync, Express 5, MQTT.js 5, csv-parse 7. UI는 React 19.2, Vite 7, Three 0.180, React Three Fiber 9, Drei 10, lucide-react. 로컬 브로커는 eclipse-mosquitto:2 / Docker Compose. 정확한 기준 package.json은 부록 B에 포함한다. 새 구현 시 lockfile을 생성·보관한다.

### 권장 디렉터리

```text
server/ index.js model.js control.js store.js transport.js metrics.js weather.js
web/ index.html src.jsx Devices.jsx Lab.jsx Guide.jsx Scene.jsx style.css
tests/ model.test.js metrics.test.js advanced.test.js
scripts/ generate-samples.js integration.js advanced-integration.js vpp-client.js
samples/ wind.csv solar.csv hybrid.csv user-wind.tsv
docs/ protocol.md verification.md PRD-VPP-SCADA-RTU.md
mosquitto/ mosquitto.conf
artifacts/video/ 영상·원고·자막·제작소스
package.json package-lock.json vite.config.js docker-compose.yml .env.example .gitignore
```

처음부터 구현할 경우 위 파일을 먼저 구현하고 다음 명령을 제공해야 한다. 문서만 복사한 빈 폴더에서 npm start만으로 코드가 생성되는 것은 아니다.

```bash
npm install
cp .env.example .env
npm run broker
npm run build
npm start
```

이미 .env가 있으면 복사로 덮어쓰지 않는다. 브라우저는 http://127.0.0.1:3001. 개발은 npm run dev와 별도 터미널의 npm run web; Vite /api 프록시는 서버 3001로 향한다. 개발 프런트엔드 주소와 프로덕션 3001을 혼동하지 않는다. 서버 변경은 재시작, 프로덕션 UI 변경은 build 후 반영한다.

종료는 서버 SIGINT/SIGTERM과 docker compose stop mqtt. 서버는 타이머·SSE를 정리하고 상태·메트릭을 저장한 뒤 MQTT 및 DB를 닫는다. 로컬 Mosquitto persistence=false이므로 복구 보장은 broker 저장이 아닌 RTU SQLite outbox 기준이다.

## 19. 비기능 요구사항과 제한

- NFR-01: 단지 최대 기기 수 100을 입력 검증하고 해당 크기의 전체 SCADA 패킷 상한을 시험한다. 이는 다수 단지×100기×60배속 부하 성능 인증이 아니다.
- NFR-02: 정상 조건에서 모델은 1초 가상 간격, UI는 약 1초 갱신. 브라우저나 SSE의 느린 소비 때문에 수집 데이터를 잃지 않는다.
- NFR-03: 영속 outbox/ID를 사용하고 중복 가능성을 명시한다. exactly-once 보장은 하지 않는다.
- NFR-04: 모든 API 수치를 서버에서 검증한다. 잘못된 요청으로 일부 모델만 변경하지 않는다.
- NFR-05: 키를 소스·로그·문서에 노출하지 않고 TLS 검증을 유지한다.
- NFR-06: 재시작 복원과 기존 DB 호환성을 검증한다. 저장 매체 장애·용량 부족에 대한 HA는 제외한다.
- NFR-07: 외부 KMA 장애로 전체 에뮬레이터가 멈추지 않는다. 기존값과 오류 출처를 유지한다.
- NFR-08: 코드·문서·샘플·자동 시험을 함께 납품하며 토픽과 필드의 문서 불일치를 허용하지 않는다.
- NFR-09: 코드에는 사용자 CSV, API 키와 무관한 재현 fixture가 있어야 한다. 시험은 임시 DB/API 포트/MQTT prefix로 격리한다.
- NFR-10: 3D 번들은 지연 로딩하고 첫 화면의 운영 정보 접근을 막지 않는다. 현재 번들 크기 경고는 성능 제한으로 기록한다.

## 20. 인수 시험

모든 시험은 입력·행동·관측 결과·통과 여부를 남긴다. 미수행 외부 시험은 성공으로 처리하지 않는다.

### AT-DATA 데이터

1. CSV와 TSV, BOM, 한글 별칭을 각각 등록한다. 정규화 결과와 입력 단위를 확인한다.
2. 10분 시점 값 100→200kW에서 300초는 150kW다. 599초와 경계 600초도 검증한다.
3. 10kWh 구간은 60kW×600초로 제어 전 10kWh. mean 모드도 동일 구간 유지 의미를 확인한다.
4. 350→10도 풍향의 중간은 0도다.
5. 중복/누락/역순/잘못된 날짜/빈 필수값/음수/NaN을 거절하고 원본 행을 식별한다.
6. 마지막 600초 유지 후 처음으로 반복한다. 선형 wrap을 하지 않는다.
7. 사용자 풍력 TSV를 wind로 등록하고 380V 원본과 비례 전류 추정, 원본 0일 때 null을 검증한다.
8. hybrid 총출력과 유형별 출력 각각의 배분을 검증한다.

### AT-MODEL 발전 모델

1. 풍속 cut-in 미만 및 cut-out 이상은 0, rated wind는 정격. 중간값은 수식과 일치한다.
2. 사용자 곡선 보간, 중복 풍속 거절, null 복귀를 검증한다.
3. 태양광 1000W/㎡·25℃·보정1은 정격, 일사0은0, 상한 제한과 온도계수 반영 확인.
4. 1000kW·ramp50에서 목표500은 step당 최대50만 변한다.
5. 정지/재시작과 기동 지연, 소수 지연에서 완료 조기 판정이 없음을 검증한다.
6. 20% 제한은 정격1000에서 최대200. set_target은 기존 비율 상한을 교체한다.
7. 동일 시드·snapshot의 첫 10개 출력이 일치한다.
8. CSV 모드에서 기상값만 바꾸어 CSV 발전량을 임의로 바꾸지 않는다.

### AT-CONTROL 명령

1. 실제 MQTT setpoint를 발행하여 accepted→executing→completed와 scadaSignal을 받는다.
2. 125kW 목표, 충분한 가용 출력에서 actual=125, error=0을 확인한다.
3. 정격 이내지만 가용량보다 높은 목표는 completed가 아닌 timed_out.
4. 같은 commandId/본문 재발행은 duplicate:true와 최신 결과이며 재실행하지 않는다.
5. 같은 ID로 값·RTU·expiresAt 변경은 rejected.
6. 잘못된 action/schema/대상/수치/8KB초과/JSON을 거절한다.
7. 이미 만료한 명령, 지연 중 만료한 명령은 SCADA 설정을 바꾸지 않는다.
8. 우선순위 낮은 충돌은 거절, 같거나 높은 충돌은 superseded. 대상이 다른 기기는 독립.
9. scadaReject는 failed, actuatorStuck는 미도달 timeout, sensorFreeze는 도달 판정 중지.
10. 서버 재시작 후 미완료 명령과 실제 시간 deadline을 복원한다.
11. timeout 후 기존 목표 설정을 자동 원복하지 않으며 명시적 stop으로 해제됨을 확인한다.

### AT-MQTT 저장·통신

1. 실제 Mosquitto로 모든 발전기가 samples[] 및 scada에 포함되는지 확인한다.
2. 1배속·60초·작은 단지의 정상 완전 구간은 60샘플, 크기에 따른 분할은 합산으로 비교한다.
3. 100기 snapshot도 메시지 전체 UTF-8 크기≤120000 bytes, sampleCount 일치.
4. 한 RTU 연결 단절 중 다른 RTU가 계속 데이터를 발행한다.
5. 단절 중 수집은 디스크에 남고 복구 뒤 기존 ID/관측시각으로 전송된다.
6. PUBACK 전 프로세스를 종료한 뒤 재시작해 outbox 복원 및 VPP 중복 제거를 검증한다.
7. dropPct=100에서 대기 유지, 0으로 해제 후 전송 완료.
8. 센서 중단 기간은 frame이 생성되지 않고 복구 후 누락 구간을 만들어 채우지 않는다.
9. 이전 run의 대기분과 새 run이 같은 payload에 섞이지 않는다.
10. 오래된 완료 데이터만 보존기간 정리되고 미전송·ID·시나리오는 남는다.

### AT-UI 화면·기상·운영

1. 빈 DB 데모 3개, 재시작 후 중복 생성 없음.
2. 추가 폼에서 사용자 TSV와 좌표 생략 등록, 유형/좌표 출처 확인.
3. 풍력·태양광·복합 3D 렌더링, 단지 변경, 풍향/회전/확대 확인.
4. 출력 제한·정지·기동과 차트·기기 표가 같은 값을 보여준다.
5. RTU 검색·선택·상세와 발전 제어 화면 이동에서 선택이 유지된다.
6. health 임계값, PUBACK 지연, 누적 지표 재시작 복원 및 공용 메모리 라벨 확인.
7. 기상청 정상/키 없음/timeout/오래된 관측/결측 풍향 fixture를 시험한다. 실제 키가 있으면 실제 조회도 별도로 기록한다.
8. 수동 기상이 자동 관측에 덮어써지지 않는다. 일사 CSV 시간 정렬·범위 밖 fallback 확인.
9. 시나리오 저장·복원·JSON 내려받기, 새 runId와 명령 cancelled 확인.
10. 가이드 RTU별 토픽 갱신, 복사와 문서 다운로드, keyboard label 확인.
11. console error 없이 주요 화면 사용 및 긴 SSE payload로 연속 수신 확인.
12. 영상의 파일 디코딩, 1080p, 음성·한글 자막, 실제 시험 주장과 기록 일치 확인.

## 21. 구현 순서와 완료 정의

### 단계 1: 데이터·모델 기반

프로젝트/설정/브로커/DB 초기화 → CSV 파서 및 sampleAt → 단지 생성 → 발전기 step → 단위 시험. 종료 조건은 AT-DATA와 AT-MODEL의 핵심 계산 통과다.

### 단계 2: 제어·영속 통신

Controller와 상태 전이 → full frame/store/outbox → 독립 MQTT 연결 → VPP 클라이언트 → 실제 브로커 통합 시험. UI 없이도 왕복 목표 제어가 완료되어야 한다.

### 단계 3: 운영 화면과 기상

REST/SSE → 대시보드/등록 → 3D → KMA/수동 기상 → 전기값 및 차트 → RTU 메트릭. 화면에서 가짜 고정 메트릭을 만들어 성공처럼 보여주지 않는다.

### 단계 4: 장애·시나리오·복구

RTU별 장애 → 개별 모델 → 시나리오 → 재시작/보존 → 고급 시험. 기존 단지와 CSV를 유지하며 마이그레이션한다.

### 단계 5: 문서와 인도

가이드 페이지·다운로드 규격·README·자동 시험·샘플·영상·발표자료 PPT·PRD를 정합성 확인해 제공한다. 최종 영상 제작 후 PPT를 작성하고 두 산출물을 검수한다.

### Definition of Done

최종 시연 영상과 영상 제작 후 작성한 발표자료 PPT가 22장의 내용·검수·인도 조건을 충족해야 한다. 문서에 요구사항을 추가한 상태와 실제 제작 완료를 구분한다.

필수 FR/UI/NFR가 구현되고 인수 시험을 수행했으며 npm test, test:integration, test:advanced, build가 성공해야 한다. 테스트 실패·미검증 외부 연결·번들 경고·규모 제한은 인도 기록에 남긴다. 기존 데이터를 유지하고 시연 장애를 해제한다. README만으로 실행 가능하고 이 PRD만으로 재구현 범위를 판단할 수 있어야 한다. 외부 VPP가 제공되지 않은 상태에서 로컬 완료와 실제 연동 완료를 분리한다.

## 22. 소개·시연 영상 및 발표자료

### VID-01 산출물

제품 요구사항과 목표를 소개하고 실제 실행 결과를 보여주는 한국어 영상. 기준 결과물은 약 4분 2초, 1920×1080, 약30fps H.264 MP4, AAC 한국어 합성 음성, 화면 자막이다. 별도 SRT, 원고 Markdown, 장면별 JSON, 캡처와 렌더링 소스를 보관한다. 재구현 시 정확한 길이보다 아래 내용과 검증 가능성을 우선한다.

### VID-02 구성

1. 별도 예측·입찰·제어 시스템을 위한 가상 현장이라는 목적.
2. 10분 CSV→1초 SCADA→1분 MQTT.
3. SCADA→RTU→VPP 및 VPP→RTU→SCADA 양방향 구조.
4. 통합 대시보드, 단지 선택, RTU 등록.
5. 실제 3D 실행 및 기상/모델 설명.
6. RTU 메트릭과 발전 대시보드의 차이.
7. 로컬 MQTT 클라이언트의 125kW 요청과 목표 도달 실제 결과.
8. 장애 주입, outbox 보존, 센서 누락 의미.
9. 시나리오 저장과 재현 범위.
10. 연동 가이드와 실제 VPP 연결 순서.
11. 로컬 검증 완료와 실제 운영 연결 미검증 구분.

영상은 연속 전체 화면 녹화일 필요는 없다. 기준 영상은 실제 앱 캡처·짧은 3D 실행 캡처·설명 카드·내레이션을 편집한 형태다. 재현 장면이나 설명 그래픽을 실물 발전소 영상으로 오인시키지 않는다. API 키·개인키·자격증명은 화면에 넣지 않는다. UI 목표값 입력은 REST임을 밝히고 MQTT 시연은 별도 MQTT 클라이언트에서 실행한다. 시연 후 장애·제어 상태를 복원한다.

### PPT-01 제작 순서와 산출물

최종 시연 영상 제작을 완료한 다음, 동일한 최종 정상 버전을 소개하는 한국어 발표자료를 작성한다. 기본 파일은 `artifacts/presentation/GRID-VPP-presentation-ko.pptx`로 제공하며 편집 가능한 16:9 PowerPoint 형식, 12~15장 내외, 약 10~15분 발표를 기준으로 한다. 제목·본문·도형·구조도는 가능한 편집 가능한 요소로 구성하고 전체 슬라이드를 한 장의 이미지로 대체하지 않는다. 실제 UI 캡처는 이미지로 삽입할 수 있다. 발표자 노트, 재생성 소스·사용 자산 및 검수 기록을 함께 제공한다.

슬라이드 개요·템플릿·제작 도구는 사전 준비할 수 있지만 최종 PPT 내용은 영상과 최종 검증 결과가 확정된 뒤 작성한다. 영상 제작 → PPT 작성 → 두 산출물 검수·인도 순서를 지킨다. 이 단계도 목표 문서의 총 14시간 및 마지막 30분 한도 안에 포함한다. 시간 부족은 미완료로 기록하며 자동 연장하거나 제작하지 않은 자료를 완료로 처리하지 않는다.

### PPT-02 필수 발표 내용

1. 개발 배경, 해결할 문제, 프로젝트 목표와 핵심 요구사항.
2. 외부 예측·입찰·제어 시스템과 에뮬레이터의 책임 경계.
3. SCADA→RTU→MQTT→VPP 데이터 및 VPP→RTU→SCADA 제어 아키텍처.
4. CSV 정규화, 10분 입력→1초 생성→기본 1분 전체 SCADA 전송.
5. 목표값 검증·출력 조정·접수/실행/완료·실패 피드백.
6. 최종 UI 캡처로 설명하는 통합 대시보드, RTU 메트릭, 3D·기상 제어.
7. 장애 주입, 영속 버퍼·재전송·복구, 시나리오 재현.
8. 실제 VPP MQTT 연동 절차와 Git 저장소·charles-k3s 배포 구성 및 수행 여부.
9. 실제 시험 결과와 근거, 보안·미해결 취약점 및 이슈·운영 제약.
10. 최종 제품·PRD 버전, 채택한 개선과 후속 과제, 시연 영상 안내.

표지 또는 마지막 장에 제품 버전·소스 커밋·PRD 버전·작성일을 명시한다. 발표자 노트에 설명과 관련 영상 타임코드를 넣는다. 영상 파일을 함께 전달하고 파일명 안내를 포함하며, 링크를 사용하면 배포 폴더의 상대 경로로 검증한다. 제작자 컴퓨터의 절대 경로에 의존하지 않는다. 검증되지 않은 실제 VPP/AWS/k3s 연결이나 성능 수치를 성공 사례로 표시하지 않는다. 키·토큰·개인키 등 비밀정보를 넣지 않는다.

### PPT-03 검수 및 인수 기준

- **AT-PPT-01:** `.pptx` 파일이 열리고 필수 발표 내용과 발표자 노트가 포함된다. 영상·제품·PRD 버전 및 실제 검증 결과가 일치하며 추적할 수 있다.
- **AT-PPT-02:** 모든 슬라이드를 렌더링하고 잘림·겹침·폰트 대체·글자 및 캡처 가독성을 확인한다. 결함 수정 후 영향 슬라이드를 다시 렌더링한다. 검수 이미지 또는 기록을 보관한다.
- **AT-PPT-03:** PPT, 제작 소스·필요 자산·검수 기록과 영상의 전달 경로를 인도 목록에 기록한다. 영상 안내·링크가 제공 파일과 일치한다. 파일 존재만으로 검수 통과를 선언하지 않는다.

## 23. 과거 구현 기록과 신규 검증 경계

v1.1 주의: 아래는 기존 산출물의 과거 검증 기록이다. 이번 14시간 실행의 baseline/stable 검증이나 신규 영상 완료를 뜻하지 않는다. 이번 실행의 실제 단계·stable 커밋은 `docs/operations/run.json`, 새 검증 증거는 메인의 검증 기록으로 판단한다. 문서 버전, npm 버전, 제품 버전, MQTT schemaVersion은 별도로 관리한다.

과거 구현에 대한 2026-09-21 기록에는 서버, UI 5개 메뉴, 로컬 브로커 설정, 샘플, MQTT 계약, 자동 시험, 영상이 구현되어 있다. 프로젝트 npm 메타데이터 버전은 1.0.0이나 제품/프로토콜은 v2이므로 버전 표기의 대상이 다르다.

기존 기록의 최신 결과: 단위 시험 18개 통과, 실제 Mosquitto 기본·고급 통합 시험 통과, 프로덕션 빌드 성공. v1 당시 메트릭이 세션 기준이었다는 기록은 v2에서 누적 영속 복원으로 대체되었다. 초기 텔레메트리의 작은 요약 payload 크기는 v2 전체 SCADA의 크기 기준이 아니다.

실행 중 서버와 MQTT 전용 VPP 클라이언트에서 목표125kW, actualKw=125, errorKw=0을 확인했다. UI에서는 목표100kW, 시나리오 저장, 가이드 렌더링을 확인했다. 별도 촬영에서도 MQTT125kW 결과를 재확인했다. KMA 실제 관측 조회 성공 이력이 있으나 외부 서비스는 일시적으로 timeout이 발생할 수 있다.

과거 구현의 영상 기록은 전체 디코딩 성공, H.264/AAC,1920×1080, 길이242.20초를 확인했다. 영상은 `artifacts/video/GRID-VPP-demo-ko.mp4`, 원고는 `script-ko.md`, 자막은 `narration-ko.srt`다.

미검증: 실제 외부 VPP 운영 브로커, AWS IoT 계정 연결, 실물 SCADA, 제조사 동특성 정확도, 다수 RTU 부하·장기 운영. 3D 번들 크기 경고가 남아 있다. 이번 PRD 작성은 기존 시험 기록과 코드를 대조한 문서화이며 모든 시험을 새로 실행했다는 뜻이 아니다.

### Git 및 k3s 읽기 연결 시험 기록

과거 문서 작성 당시 다음 읽기 전용 연결 시험을 수행했다고 기록했다. 신규 실행의 증거로 재사용하지 않는다.

```bash
git -c core.sshCommand='ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes' ls-remote git@github.com:jckoh-gs/gs-plai-5th.git
kubectl --context=charles-k3s --request-timeout=10s get --raw=/version
```

Git 명령은 종료 코드 0이며 ref 출력이 없었다. SSH를 통한 저장소 읽기 접근은 성공했으며 시험 시점에 브랜치·태그가 없는 빈 저장소로 보인다. 쓰기/push 권한, 로컬 origin 등록 및 코드 업로드는 이 결과만으로 확인하지 않는다.

k3s 명령은 종료 코드 0이고 `gitVersion=v1.33.4+k3s1`, `platform=linux/amd64` 응답을 받았다. 지정 context를 통한 API 서버 접근만 확인했으며 admin 권한·namespace 접근·리소스 생성·이미지 pull·배포 성공을 검증하지 않았다. push나 클러스터 변경은 수행하지 않았다.

## 24. 외부 연동 전 필요한 입력

기본 개발·로컬 검증은 본 문서의 기본값으로 진행한다. Git 저장소와 k3s context·namespace는 18장에 확정했으며 읽기 연결 결과는 23장에 기록했다. 다음 정보는 실제 외부 연동·배포 시 추가로 확정한다.

- 이미지 레지스트리/이름, Ingress·도메인·TLS, StorageClass/PVC, 배포 브랜치·릴리스 방식.
- 실제 VPP의 MQTT URL/포트, 네트워크 경로, TLS/계정 또는 인증서, clientId 정책.
- 허용 토픽, prefix, VPP가 요구하는 메시지 필드·단위·시각·응답 처리 방식.
- 실제 CSV의 단위와 시점/구간 평균 의미, 시간대, 발전기/단지 단위 구분.
- 단지/기기 수, 개별 정격, 제조사 곡선, 램프·기동 지연, 제어 허용오차·만료·우선순위.
- 관측소와 사용 가능한 KMA 키/권한, 실제 일사 데이터 소스.
- 원격 운영 시 인증·권한, 보존기간·디스크 예산, 장애 시 운영 정책.
- AWS 사용 시 endpoint/인증서/정책과 실제 검증할 계정.

초기 사용자 결정은 기본 REST 관리 + MQTT 외부 연동, 발전 설비 규모·정격·응답시간 미정, 제공된 timestamp/power_kw/voltage/current_a 파일을 풍력 입력으로 취급하는 것이다. 과거 대화에 포함된 인증키를 문서에 다시 싣지 않는다.

## 25. 변경 관리와 후속 범위

현재 기능상 안정 기준: **1.5.0 / IDEA-009 개정1 / PRD1.12**. REST 명령의 접수·거절·만료·응답 미확정과 원래 명령 ID의 저장 상태 확인을 구현했다. runtime `6d165d1e8f3214a50ee66d2b13947f64d86658f5`, 이미지 `2fd3f21c…8d5a0f`에서 실제 k3s UI·MQTT·outbox 재시작, 동일 719527936바이트/ad34 백업의 현재1.5 및 하위1.4 복원 19개 근거를 REVIEW-027과 인수 추적에서 확인했다. 태그·불변 매니페스트 검증은 운영 기록에서 별도로 확인한다. 이전1.4 체크포인트도 보존하며 원래 동결·마감과 최종 영상/PPT 조건은 유지한다.

### FR-COMMAND-RECEIPT-01 REST 명령의 접수 결과와 응답 유실 안내 (IDEA-009, 제품1.5.0)

Target의 set_target과 대시보드의 set_limit/start/stop 및 발전기별 start/stop을 같은 REST 명령 제출 경로로 처리한다. 제출 순간 RTU ID/이름·대상 발전기·action·commandId를 고정해 표시한다. 반환 commandId/plantId/action/source와 알려진 상태를 확인하며 accepted는 접수, executing은 전달, completed는 실제 피드백 완료로 구분한다. rejected/expired/failed/timed_out/superseded/cancelled에 접수 성공 문구나 성공 색상을 표시하지 않는다. reason은 텍스트로만 표시하고 raw HTML이나 오류 응답 본문을 삽입하지 않는다.

POST 응답의 유효한 명령 결과는 후속 화면 GET /state와 분리해 보존한다. 화면 갱신 실패는 별도 경고이며 이미 확인한 접수를 실패로 바꾸지 않는다. POST/확인 GET/후속 화면 GET의 각 대기는15초로 제한한다. 응답 유실·timeout·파싱 오류·식별자 불일치·알 수 없는 상태는 원래 ID와 함께 접수 여부 미확정으로 표시하며 자동 재POST나 새 ID의 재시도를 하지 않는다. HTTP 오류는 명령 상태와 구분하고 접수 여부를 임의로 추정하지 않는다. 인증401은 기존 로그인 경로를 유지한다.

App 수명에 RTU별 단일 pending POST guard를 둔다. 동기 guard와 버튼 disabled/진행 안내로 빠른 클릭·Enter·탭 이동·A→B→A 전환의 중복 POST를 막는다. 다른 RTU의 의도적인 명령은 허용한다. POST 대기가 끝나면 guard를 해제하며 실행 완료나 후속 화면 갱신까지 모든 제어를 잠그지 않는다. 기존 명령의 결과를 확인한 뒤 사용자가 명시적으로 새 명령을 보내는 기능은 유지한다.

미확정 또는 이미 관측한 명령을 기존 GET commands에서 원래 RTU/ID로 읽기 확인할 수 있다. 최근200개 목록에서 찾지 못하거나 조회가 실패해도 미접수라고 단정하지 않는다. 이미 확인한 유효한 응답은 이런 조회 실패로 지우지 않는다. 늦은 A 응답은 B 결과를 덮어쓰지 않는다. 확인 중 같은 행의 중복 조회와 늦은 이전 응답에 의한 상태 덮어쓰기를 방지한다.

### UI-12 이 탭의 명령 전송 확인

각 RTU의 앱 메모리에 최근20개 제출 확인을 보관하고 최신 결과를 읽기 쉽게 보여준다. 이전 확인은 접어서 볼 수 있으며 이전 미확정 건수가 있으면 최신 결과와 별개로 알린다. 보존 범위 내 이전 미확정 항목을 다음 성공으로 바꾸거나 덮어쓰지 않는다.20개 초과 시 오래된 표시가 제외될 수 있고 새로고침 후 보존되지 않는다는 범위를 안내한다. 서버 저장 명령 목록과 이 임시 전송 확인은 구분하며 전체 감사로그나 여러 브라우저 간 exactly-once를 주장하지 않는다. 저장소·영속 재전송 큐·새 서버 API·추가 승인 모달을 만들지 않는다.

### AT-COMMAND-RECEIPT-01 인수 (후보, 미검증)

1. 실제 격리 서버의 accepted·0초 expired·정격초과 rejected를 제출해 정확한 상태/대상/ID와 성공·실패 시각 표현을 확인한다. accepted를 completed로 합성하지 않는다. 식별자/알 수 없는 상태 응답은 미확정으로 남긴다.
2. 실제 accepted POST 뒤 브라우저 후속 /state만 실패시켜 원래 접수 응답·단일 저장 명령을 유지하고 화면 갱신 경고만 추가하는지 확인한다. 후속 조회 대기가 새 의도적 명령을 막지 않는다.
3. 서버 저장 후 응답 차단과 서버 미도달 차단을 구분해 재현한다. 미확정/원래ID 보존, 읽기 확인의 정확한 ID 귀속, GET 실패/미발견의 비단정, 자동 재POST 없음,15초 상한을 확인한다.
4. 지연 응답 동안 빠른 클릭·Enter·탭 및 RTU 왕복 전환에도 단일 POST/ID이고 다른 RTU의 명시적 제어는 가능한지 확인한다. 응답 뒤 새 제출은 새 ID이며 늦은 응답/확인 결과의 RTU 또는 명령 혼입이 없다.
5. Target·상한·단지 기동/정지·개별 발전기 기동/정지를 실제 요청과 서버 이력으로 확인한다. 기존0kW/소수/가용초과/만료/범위 오류 의미, 키보드/좁은 화면·메모리 최근20개/이전 미확정 표시를 유지한다.
6. 실제브라우저·관련 단위검사·기존 auth/SSE/preview/export/scenario·MQTT 회귀와 정확한 후보 이미지의 k3s·백업·현재/하위 버전 복원을 거쳐 stable로 승격한다. 신규 외부 연동 성공이나 최종 미디어/전체 목표 완료는 별도 증거를 요구한다.

### FR-CONTROL-FORM-01 일반 목표 입력 검증 (IDEA-008, 제품1.4.0 기능·배포·복원 검증 완료)

일반 목표 폼은 기존 서버 범위인 toleranceKw 0.01~10000, timeoutSeconds 1~3600, priority 0~100에 입력 min/max를 맞추고 단위와 범위를 표시한다. 소수를 허용하며 clamp·반올림·조용한 기본값 대체를 하지 않는다. target0, 정격 이내이지만 가용량을 넘는 목표 및 서버 측 검증은 유지한다. 클라이언트 검증은 편의 기능이며 보안 경계가 아니다.

validSeconds는 제출 시 한 번 읽은 현재 시각으로 만료일을 계산하고 유한 숫자·유효 Date 및 현재 서버의 네 자리 연도 ISO 형식과 호환되는지 확인한다. 변환 불가 또는 확장 연도는 전송 전에 한국어 오류로 안내하고 act/command POST를 실행하지 않는다. 0초와 소수 유효시간을 유지하고 임의의 업무상 만료기간 상한을 추가하지 않는다. 정상 입력도 서버 시각이나 전달 지연에 따라 expired될 수 있다.

### UI-11 목표 입력 오류 안내

날짜 오류를 해당 필드 가까이에 표시하고 접근 가능한 alert·필드 연결·포커스를 제공한다. 잘못된 값을 고친 뒤 버튼 또는 Enter로 다시 제출할 수 있어야 한다. 좁은 화면에서도 범위와 오류를 읽을 수 있고, 선택 RTU 전환 시 이전 폼 오류가 다른 RTU의 결과로 남지 않아야 한다. 다른 폼 전체나 서버/MQTT 계약을 변경하지 않는다.

### AT-CONTROL-FORM-01 인수 (기능 검증 완료, 최종 인도 게이트 별도)

1. 실제 브라우저에서 tolerance0/10001, timeout0/3601, priority−1/101을 버튼과 Enter로 각각 제출한다. command POST0, pageerror0, unhandledrejection0과 해당 입력 안내를 확인한다. native validity 속성만으로 제출 차단을 증명하지 않는다.
2. 각 min/max 및 정상 소수·빈칸·비유한 값을 검사한다. 유효 입력과 실제 요청 숫자를 대조하며 자동 보정이 없어야 한다. 경계 검증과 실제 명령 완료 증거를 구분한다.
3. validSeconds1e20 및 Date는 유효하지만 확장 연도가 되는 값에서 안내/POST0/예외0을 확인한다. 정상30초·소수·0초 경로와 임의 max 부재를 검사한다.
4. 오류 수정 후 키보드 제출·좁은 화면·포커스·RTU 전환 및 명령 목록 불변을 확인한다.
5. 별도 소유 로컬 RTU에서 accepted/executing/completed, target0과stop 구분, 가용량 초과·정격 이내 목표의 timed_out, 소수 요청 보존을 확인한다. 정격 초과 서버 거절과 기존 REST/MQTT 검증도 유지한다.
6. 기존 preview/export/시나리오·전체 시험/빌드·실제 MQTT·정확한 후보 이미지의 k3s 배포·백업/복원을 검증한 뒤 승격한다. 수정 전 증거를 보존하고 새 증거를 소스/번들/환경에 연결한다. 최종 미디어·시간·인도 게이트는 별도다.

현재 상태: 제품 **1.4.0**, runtime `fdd0491a5c08901962f46ac845f8582921150d45`이다. IDEA-001~008의 채택 기능을 검증했다. [검토021](product/REVIEW-021.md), [동일594944000바이트 백업 복원](../deploy/verification/candidate-fdd0491/restore-summary.json), [인수 추적](product/acceptance.json)이 근거다. 이전 [1.3 checkpoint](../artifacts/releases/checkpoint-1.3.0.json) 및1.0~1.2 검증·복원 근거도 보존한다. 아래 과거 후보·승격 표현은 당시 절차의 기준이다. **최종 동결 점검·영상·PPT·운영시간·역할 마감 및 인도는 아직 완료되지 않았다.** 기능 checkpoint를 전체 목표 완료로 해석하지 않는다.

프로토콜 변경 시 schemaVersion, 가이드, 클라이언트, 통합 시험을 함께 변경한다. 등록 시 단위 정책이나 time 의미는 기존 데이터 마이그레이션 계획 없이 바꾸지 않는다. 제조사 모델·실물 프로토콜·대규모 부하·사용자 권한·브로커 업무 ACK·미래 제어 타임라인 재생은 별도 요구사항으로 설계한다.

다음 단계의 권장 순서는 실제 VPP 메시지 계약 합의 → 접근 가능한 테스트 브로커 연결 → 데이터 수신 → 낮은 목표 왕복 → 실패·중복·단절 시험 → 운영 요건 및 실물 어댑터 검토다. 우선순위와 일정·비용은 실제 연동 대상이 확정된 뒤 산정하며 이 문서는 임의 납기나 설비 규모를 약속하지 않는다.


### FR-VPP-REPORT-01 선택적 MQTT 시험 결과 파일 (IDEA-001, 기능 검증 완료)

IDEA-001의 선택적 JSON 결과 파일 요구는 신규 MQTT dispatch 클라이언트에도 유지한다. 과거 구현의 v2.0.1/v2.1.0 개발 순서·검증 상태를 신규 제품의 완료 상태로 승계하지 않는다. 신규 프로젝트는 1.0.0으로 시작했으며 현재 검증 제품은 1.2.0이다. 보고서 기능도 이번 필수 인수 범위다. 선택적이라는 표현은 실행 시 결과 파일 옵션이 선택이라는 뜻이며 기능 구현·인수 자체를 생략할 수 있다는 뜻이 아니다. 신규 릴리스 버전과 stable 승격은 실제 변경 및 검증 기록에서 확정한다. 이 요구의 채택은 구현 완료나 stable 승격을 뜻하지 않는다. MQTT schemaVersion 2와 기존 기본 실행/콘솔 출력을 유지하며 UI·서버 API 변경은 요구하지 않는다. 결과 파일은 dispatch 실행에서 `VPP_REPORT_FILE=/absolute/result.json`으로 지정한다. 미지정 시 기존 콘솔 실행을 유지하며 monitor에서 지정하면 입력 오류로 종료한다. `VPP_CONNECT_TIMEOUT_MS`는 연결 제한시간(ms)이며 기본 10000, 허용 범위 100~60000이다. `COMMAND_TIMEOUT_SECONDS`는 명령 제한시간(기본 120초, 1~3600)이며 클라이언트 결과 대기는 그 값+45초다. 연결 제한시간을 구독 응답이나 전체 시험의 제한시간으로 설명하지 않는다. 실제 옵션·사용 예·실패 의미를 연동 가이드와 클라이언트 사용 설명에 함께 제공한다.

결과 파일은 UTF-8 JSON이며 독립적인 `reportSchemaVersion: 1`을 둔다. 필수 정보는 실행 클라이언트 제품 버전, MQTT 계약 버전, RTU ID, commandId, 시작/종료 UTC, 요청 목표 kW, 실제 수신한 해당 명령의 상태 이벤트 목록(수신 UTC 포함), 마지막 관측 상태, 실제 출력 kW/오차 kW, 종료 원인, exitCode다. 서버 제품 버전과 해당 명령에 연관된 runId는 관측하지 못하면 null로 기록하며 클라이언트 버전이나 무관한 최신 telemetry로 대신하지 않는다. 미관측 출력/오차도 null이고 미수신 accepted/executing 전이를 합성하지 않는다. 결과 파일은 시험 증거이며 새로운 MQTT 메시지 계약이 아니다.

해당 commandId의 completed를 실제 수신하고 요청된 파일 저장까지 성공하면 exit 0이다. 명령 실패·미도달·명령 결과 대기 timeout·연결/구독/발행 실패·파일 저장 실패는 exit 1이다. 명령 결과와 클라이언트 실행 실패를 구분해 기록하며 PUBACK만으로 completed를 생성하지 않는다. 연결 실패도 유한한 시간 안에 종료한다. 파일 저장이 가능한 실패 경로에서는 실패 결과를 남기고, 저장 자체가 실패하면 stderr와 exit 1로 알리며 결과 파일이 있다고 주장하지 않는다. 명령 전송 뒤 파일 저장 실패가 발생해도 같은 시험을 자동 재발행하지 않는다. 자격증명·키·인증서 본문·인증정보 포함 브로커 URL은 결과 파일과 오류 출력에서 제외한다.

### AT-VPP-REPORT 신규 제품 보고서 수락 조건 (기능 수락 완료, 최종 인도 게이트 별도)

1. 격리 DB/포트/MQTT prefix와 실제 로컬 브로커에서 충분한 가용 출력의 목표 요청을 실행한다. JSON의 commandId·실제 관측 전이·최종 출력/오차를 수신 증거와 대조하고 completed 및 exit 0을 확인한다.
2. 가용량보다 높은 목표의 미도달 사례는 관측한 timed_out과 exit 1을 기록한다. 클라이언트 대기 timeout은 명령에서 수신한 timed_out과 다른 종료 원인으로 기록한다.
3. 브로커 불가 사례가 유한한 시간 내 실패 결과와 exit 1로 끝나며, 미관측 상태/출력/runId를 성공값으로 채우지 않는다.
4. 쓰기 불가 결과 경로는 명확한 저장 실패와 exit 1을 반환한다. 파일 저장 실패 때문에 명령을 자동 재전송하지 않는다. JSON/오류 출력에 시험용 자격증명이 노출되지 않는다.
5. 결과 파일 옵션 없이 기존 monitor/dispatch가 동작하고 MQTT schemaVersion 2가 유지된다. 관련 단위 시험, 기본·고급 MQTT 통합 시험, build 및 실행 확인을 통과한 뒤에만 신규 제품 릴리스에 맞는 stable 태그와 증거를 기록한다.

### FR-SCENE-03 선택 RTU별 시나리오 조회 (IDEA-007, 제품1.3.0 기능·배포·복원 검증 완료)

저장 시나리오 화면은 현재 선택 RTU의 `plantId`와 일치하는 행만 제공한다. 서버 `GET /api/scenarios`의 전체목록 계약·저장형식·복원대상 의미는 유지한다. UI 필터는 인증·권한의 보안경계가 아니다. 과거시나리오는 저장된 원래 RTU에만 복원하며, 현재선택에 맞추어 plantId를 재작성하거나 다른단지로 재할당하지 않는다. 다른RTU 시나리오는 기존 RTU 선택을 바꾸어 접근한다.

### UI-10 선택 RTU 시나리오 대상 표시 (IDEA-007, 기능 검증 완료)

목록 제목·범위 안내·빈상태에 현재 RTU 이름을 표시하고 다른단지는 위선택에서 변경함을 설명한다. A→B 빠른전환, 늦은 목록응답·저장응답에도 현재선택에 맞는 행만 렌더링한다. 저장·복원 성공표시는 요청당시 실제대상을 명확히 식별하며 이전단지 응답을 현재단지의 성공으로 표시하지 않는다. 시나리오 JSON 내려받기는 그행의 원래단지 snapshot이며 선택변경 때문에 다른파일로 바뀌지 않는다. 전체목록 탭·삭제·import·재할당·추가확인 modal은 이번개선 범위가 아니다.

### AT-SCENE-SELECT-01 선택 대상 인수 (기능 검증 완료, checkpoint 승격 별도)

1. A/B에 동일이름 시나리오를 저장한 fixture에서 A선택은 A행만, B선택은 B행만 표시한다. 빈단지는 자기이름과 빈상태를 표시한다.
2. A시나리오 복원은 A의 새runId/활성명령취소를 관측하고 B의 runId·모델·명령상태는 변하지 않는다. REST 전체목록과 export JSON 계약은 기존과 동일하다.
3. 빠른 A→B전환과 지연 list/save응답에서도 잘못된행·대상표시가 없다. 저장·복원·export는 실제요청대상과 일치하며 선택이 자동으로 다른단지로 이동하지 않는다.
4. 실제브라우저 새로고침·좁은폭·키보드선택·빈상태·A/B export를 검증한다. 기존시나리오재현·preview·commandexport·MQTT·전체시험/빌드 및 k3s배포·복원을 확인한 뒤1.3.0을승격한다. 그전 stable1.2.0/runtime83d10ce fallback을보존한다. 원래동결·마감과최종영상/PPT는유지한다.

### FR-COMMAND-EXPORT-01 최근 명령 상태 내보내기 (IDEA-006, 제품1.2.0 기능 검증 완료)

인증 `GET /api/plants/:id/commands/export`는 현재 저장된 선택단지 명령의 updatedAt 내림차순 최신 최대20개 스냅샷을 JSON으로 다운로드한다. 없는단지는404, 저장명령없는단지는빈commands와200이다. 루트계약은 `{schemaVersion:1,productVersion,contractVersion:2,exportedAt,plantId,scope:"recent-command-snapshots",limit:20,commands,redaction}`이다. exportedAt은실제UTC이며 현재단지runId를루트나누락된행에 대신넣지 않는다. redaction은 `{policy:"known-secrets-credential-urls-controls-length",redactedCommandIds:정제된commandId행수,identifiersForReplay:false,unknownPersonalDataMayRemain:true}`다.

각행은 commandId/commandIdRedacted/runId/action/source/status/acceptedAt/dispatchedAt/deadlineAt/expiresAt/updatedAt/targetKw/actualKw/errorKw만허용한다. commandId는bounded정제문자열또는null, commandIdRedacted는비밀치환·제어문자제거·길이절단등원본과어떤변경이라도있으면true인boolean이다. runId는유효한UUID만유지하고그외null이다. action은4지원명령enum또는null, source는REST/MQTT또는null, status는정의된명령상태또는null이다. 시각은실제달력에유효한ISO입력만정규UTC ISO로변환하고그외null, 출력은유한수또는null이다. targetKw는비어있지않은targets의모든targetKw가유한수일때만합산하며합산결과도유한해야한다. 미확정start/limit의목표를0으로채우거나현재모델의값으로계산하지않는다.

원본reason/request/canonical/scadaSignal/targets/CSV/plantName/브로커URL/비밀설정은포함하지않는다. ID에서알려진자격증명·URL인증·제어문자를정제하고길이를제한한다. metadata는정제ID가원본과다를수있어재실행용이아님과알수없는개인정보완전제거를보장하지않음을명시한다. 파일명은서버관리단지ID와UTC로만만들고인증/no-store를유지한다. DB쓰기/명령재발행/상태변경/통신생성/외부업로드를하지않는다.

이는수신이벤트타임라인·완전감사로그·실제VPP수신보고서가아니다. earlyreject/중복수신등저장command목록에없는사실을합성하지않는다. 기존CLI단일dispatch보고서와별개기능이다.

### UI-09 최근 명령 상태 다운로드

선택RTU의명령목록에내보내기버튼을제공한다. 최근최대20개저장상태이며전체이력/재실행파일이아님을알린다. 선택변경/오류/인증실패가성공다운로드로표시되지않아야한다. 실제서버응답을기존인증download경로로저장한다.

### AT-COMMAND-EXPORT-01 인수

1.행허용목록·20개updatedAt정렬·다른RTU제외·빈목록200/없는ID404·무인증401을검증한다.
2.서로다른run의원래runId보존/누락null,미확정targets/null/전체유한합/합overflow/null,관측하지않은시각·출력null을검증한다.
3.알려진credential이ID에있을때비노출,원본reason/request/canonical제외,metadata정제한계와재실행금지표시,전후DB/command/outbox불변을검증한다.
4.실제브라우저다운로드파일과선택단지명령을대조하고기존preview/MQTT/단위/통합/고급/빌드회귀,k3s업데이트/1.1.0복원확인후1.2.0stable로승격한다.그전1.1.0정상fallback및최종영상/PPT·시간게이트를유지한다.

### FR-PREVIEW-01 등록 전 CSV 미리보기 (IDEA-005, 제품1.1.0에서 검증 완료·1.2.0에 유지)

인증 관리 API `POST /api/datasets/preview`는 `{csv:string,type:"wind"|"solar"|"hybrid",unit:"kw"|"kwh",semantics:"sample"|"mean"}`을 받는다. type은 필수이며 unit/semantics 생략 기본은 기존 등록과 같은 kw/sample이다. 기존 parseCSV로 검증·정규화하고 등록과 동일20MiB JSON 제한·인증·400 `{error:string}` 행 오류를 적용한다. 발전단지 등록 검증은 이후 기존 경로에서 다시 수행한다. 등록·미리보기 공통 CSV 안전 한도는 헤더 제외 2~100000행, 행당 최대128열이다. 인용부호 내부 쉼표·탭·줄바꿈은 열·행 구분자로 세지 않으며, 구문 오류는 행 위치와 정제한 원인만 반환하고 원문 필드 값을 노출하지 않는다.

성공200 응답은 `{schemaVersion:1,type,unit,semantics,interpolation,rowCount,intervalSeconds:600,start:{utc,kst},end:{utc,kst},powerSource,minPowerKw,maxPowerKw,rows}`이다. start.utc/end.utc는 정규화된 첫/마지막 CSV행의 UTC ISO이며 마지막 유지구간 종료가 아니다. start.kst/end.kst는 같은 순간의 ISO형 `+09:00` 문자열이다. unit/semantics는 선택된 입력값, interpolation은 실제 linear/hold를 뜻한다(kWh는 sample 선택이어도 hold). minPowerKw/maxPowerKw는 정규화된 전체행 power_kw의 최소/최대이며 power_kw가 제공되면 hybrid분리열과 함께 있어도 power_kw를 우선한다. power_kw가 없고 hybrid분리열 입력이면 wind_power_kw+solar_power_kw 합을 사용한다. powerSource는 이에 따라 power_kw 또는 wind_plus_solar다. rows는 정규화된 앞 최대3행에 totalPowerKw와 timestampKst를 추가한 객체를 제공하며(timestamp는 UTC), 전체CSV·원본본문·비밀설정을 반환하지 않는다. 선택필드 생략/null 의미는 기존 parser대로 유지한다.

이 API는 식별자/plant/command/outbox/scenario 생성, DB 쓰기, 기상조회, MQTT연결·발행을 하지 않는다. 입력 유형을 출력 모양에서 추론하지 않는다. preview결과는 계산모델의 실제출력 예측이나 VPP시험 완료증거가 아니다.

### UI-08 등록 미리보기 (IDEA-005, 제품1.1.0에서 검증 완료·1.2.0에 유지)

등록폼에 명시적인 미리보기 버튼과 위 요약을 표시한다. 입력 단위·선택 의미·실제 보간을 구분하고 kWh→평균kW 변환, UTC/KST 및 hybrid합계 의미를 설명한다. 자동입력마다 요청하지 않으며 처리중 중복호출을 막는다. csv/type/unit/semantics 중 하나라도 바뀌면 이전결과를 즉시 무효화한다. 입력revision과 요청순서를 확인하여 늦은 이전응답이 새로운결과나 오류를 덮어쓰지 않게 한다. 미리보기 실패는 기존행 오류를 표시하고 단지를 생성하지 않는다. 미리보기는 등록 전 보조기능이며 기존 등록절차를 불필요하게 차단하지 않는다.

### AT-PREVIEW-01 미리보기 인수

1.10kWh→60kW/hold,100→200kW linear,55행TSV/KST↔UTC,hybrid분리합계와 total 입력을 실제parser결과와 비교한다. 정상응답 필드와 최대3행 제한을 확인한다.
2.잘못된행/유형/단위/의미와20MiB상한 오류가 등록과 일치하고, 인증없는 요청은401이다. 처리전후DB의plant/command/outbox/scenario수 및 MQTT/기상부작용이 없음을 확인한다.
3.실제브라우저에서 미리보기·입력변경 무효화·재요청·오류·등록을 확인한다. 의도적으로 지연한 이전응답이 최신입력 결과를 덮어쓰지 않는 회귀검증을 남긴다.
4.전체기존단위/통합/고급/빌드와 새기능검증, k3s업데이트 후 미리보기·기존MQTT왕복, 이전정상1.0.0복원 가능성을 확인한 뒤1.1.0후보를stable로 승격한다. 미완료 시1.0.0정상checkpoint를 유지한다.

### FR-AUTH-01 원격 관리 UI 인증 (IDEA-002, 기능 검증 완료)

API_TOKEN이 있는 환경에서 UI는 401 후 비밀번호형 토큰 입력을 제공한다. 올바른 토큰으로 상태·SSE·명령·가이드/시나리오 다운로드가 모두 동작해야 한다. 잘못된 토큰은 성공 상태를 만들지 않는다. `/api/config`는 authRequired와 version만 공개한다. URL·내보내기·이벤트 로그·시연 영상에 토큰을 남기지 않는다. 공개 네트워크 접근 시 HTTPS 또는 인증된 터널을 사용한다. 단일 공유 관리 토큰은 사용자별 권한 관리가 아니다.

AT-AUTH-01: 무인증 state 401, config 비밀 없음, 잘못된 토큰 재입력, 올바른 토큰 REST/SSE/다운로드, 새 탭 세션 경계 및 토큰 비노출을 실제 브라우저와 API에서 확인한다.

### UI-07 화면 데이터 최신성 (IDEA-003, 기능 검증 완료)

UI는 마지막으로 정상 상태 스냅샷을 수신한 시각과 연결 상태를 표시한다. 상태를 5초 이상 받지 못하면 “오래된 데이터” 표시로 마지막 관측값과 실시간 상태를 구분한다. 브라우저 로컬 시각 기준 경과시간이며 서버·원본 CSV 시각과 혼동하지 않는다. SSE 연결 자체가 열려 있어도 데이터가 멈추면 오래된 상태가 된다. 정상 상태 스냅샷이 다시 도착하면 표시를 해제한다. 연결 복구나 HTTP 접수만으로 제어 completed를 합성하지 않는다.

AT-FRESH-01: 정상 수신 → 스트림 무수신 5초 → 오래된 데이터 표시 → 정상 스냅샷 수신 → 해제를 실제 UI 또는 브라우저 시험에서 확인한다. 처음 상태를 받기 전에는 수신 대기 상태를 표시하며 기존 관측값을 최신인 것처럼 표시하지 않는다.

### OPS-06 네트워크 단절 후 기존 작업 재개 (사용자 추가 요청, 기능 검증 완료)

기존run을재개하며새run이나14시간일정을시작하지않는다. 로컬 `docs/operations/resume.json`에정상checkpoint/현재후보/완료단계/남은순서/재시도정책을영속기록한다. 재접속시 `scripts/resume-status.mjs` 같은읽기전용검사로실제Git커밋·태그·원격상태,k3s context/namespace의배포digest·Ready pod imageID,API상태와원래run.json의시각을대조한뒤첫미완료작업부터이어간다. 문서/PID파일만으로실행중이나배포성공을가정하지않는다.

터널/연결복구는유한timeout과backoff를사용하고동일supervisor의중복실행을실제process identity로막는다. 기존살아있는정상터널을재사용하며소유하지않은프로세스를종료하지않는다. 연결복구가deploy/rollout/명령재발행을자동유발하면안된다. 응답을잃은제어는기존commandId의영속상태를먼저확인하고새ID로중복실행하지않는다. 부분backup/media는검증전성공으로표시하지않는다.

기존task의native heartbeat를10분주기로재개점검에사용한다. 별도중복task/run을만들지않고변화없음은조용히유지하며유의미한복구·실패·필요조치만알린다. 원래freeze/deadline을변경하지않는다. 동결이되면검증정상버전선택과신규최종영상→PPT로진행하고마감후개발/재배포를계속하지않는다. Mac과앱이실행중이어야하며오프라인중AI작업이나절전/앱종료중자동복구를보장하지않는다. 사용자의중지/취소지시가우선한다.

### AT-RESUME-01 재개 인수

실제 후속 관측: [11:16 재접속 기록](../artifacts/checkpoints/reconnect-20260921T1116/summary.json)에서 로컬 관측 연결 단절 후 재접속과 동일 원격 Pod/Ready 상태를 확인했다. 무중단 운영이나 단절 원인은 입증하지 않는다. [ISSUE-017](issues/ISSUES.md#issue-017--로컬-forward-재생성-시-outagerecovery-시각-갱신-누락)은 복구 시각 기록 누락을 수정했고 격리 회귀 재실행은 9/9 통과했다. [11:19 계획 교체 기록](../artifacts/checkpoints/reconnect-20260921T1116/handoff-result.json)은 수정 supervisor 활성화와 재수신을 보존하며 11:16 사건과 구분한다. 이전 오류 카운터와 원본 증거를 유지했고 원격 배포·제어를 변경하지 않았다. 수정 시각 경로는 격리 시험으로 검증했으며 실제 강제 장애 시험으로 표현하지 않는다.

검증 기록: `artifacts/checkpoints/network-recovery/tests.log` 8/8 통과 및 `live-owned-forward.json`의 실제1.1.0 image/pod/API/MQTT 연결·소유forward 확인. 통제된단절시험과실제정상연결검증을구분한다. 기존grid10분heartbeat 갱신은메인운영기록에따르며최종마감정리는아직미수행이다. 앱/Mac가동전제와오프라인AI무보장조건은유지한다.

1.읽기전용재개검사/정책시험으로정상·연결불가·배포identity불일치·API불가·동결·마감결정을확인한다.원래runId/T0/freeze/deadline은유지한다.
2.통제된터널/네트워크단절후backoff재접속·실제API복구와singleton identity를확인한다.상태조회외deploy/control쓰기없음,다른프로세스보존,재시도유한성을검증한다.
3.응답유실명령은동일commandId를조회해미확정결과를확인하며새명령을자동생성하지않는다.기존heartbeat10분설정과현재task재개경로를확인하고최종마감에정리한다.

### OPS-05 릴리스 증거 manifest (IDEA-004, 선택된 stable checkpoint 기준)

복원 가능한 각 릴리스는 기계 판독 가능한 JSON manifest를 제공한다. runId, 제품 버전, 소스 commit, PRD 버전과 SHA-256, 이미지 참조와 digest, SQLite backup API로 생성한 snapshot 경로·SHA-256, 시험 로그 경로·SHA-256·실행 revision·종료 코드, k3s context/namespace와 배포·복원 증거 경로를 기록한다. source commit이 없는 작업본은 dirty 여부와 관련 파일 해시를 명시하고 commit만으로 재현 가능한 릴리스라고 주장하지 않는다. 아직 생성되지 않거나 검증되지 않은 필드는 null 또는 pending으로 기록한다. 전체 필수 게이트를 통과하기 전에는 stable로 표시하지 않는다. 자격증명·토큰·개인키·DB 본문을 manifest에 포함하지 않는다.

AT-RELEASE-01: manifest가 JSON으로 파싱되고 기록된 파일의 실제 SHA-256 및 배포 이미지 digest가 일치하는지 확인한다. 로그는 해당 릴리스 revision의 실행 결과여야 한다. 기록된 snapshot과 릴리스로 별도 복원 실행하고 UI/실제 MQTT 왕복·DB/outbox 복구 증거를 연결한다. 파일 존재나 과거 시험 로그만으로 복원 통과를 판정하지 않는다.

### OPS-01 시간 제한과 역할 (채택, 실행 검증 대기)

이전 계획(2026-09-21 14:38:52 KST 시작, 2026-09-22 04:38:52 KST 종료)은 취소된 이력이다. 현재 run `grid-new-20260921T080733Z`는 2026-09-21 17:07:33 KST 시작, 2026-09-22 06:37:33 KST 기능 동결, 07:07:33 KST 종료다(UTC: 08:07:33 / 21:37:33 / 22:07:33). 기계 판독 기준은 `docs/operations/run.json`의 UTC 시각이며 재개 시 실제 UTC와 비교한다. 동결 이후 새 기능 개발을 시작하지 않고, 마감 이후에는 상태 보고와 예약 정리만 수행한다. 중단·지연 실행을 정상적인 연속 실행으로 보고하지 않는다.

메인은 소스·시험·커밋·릴리스·run.json·최종 영상을 담당한다. 제품 담당은 PRD와 docs/product, 보안 담당은 docs/security, 이슈 담당은 docs/issues만 수정한다. 모니터는 한 회차 결과를 메인에게 보내고 완료하며 메인이 다음 회차를 호출한다. 별도 무한 대기나 자동화는 만들지 않는다. 메인은 작업 단위 완료 또는 약 10분마다 결과와 질문을 확인한다. 앱/컴퓨터 중단 중 예약 실행을 보장하지 않는다.

### OPS-02 개선·보안·이슈 추적 (채택, 실행 검증 대기)

아이디어는 `docs/product/IDEAS.md`에 IDEA-NNN, 핵심 목표, 우선순위, 수락 조건, 제안/채택/구현/검증/보류 상태를 남긴다. 채택 시 PRD 버전과 `docs/product/PRD-CHANGELOG.md`를 갱신한다. 핵심 범위를 일찍 완료하면 남은 시간 내 유용한 작은 다음 목표를 선택하며 반복 횟수 자체를 목표로 삼지 않는다. 제품 버전과 stable 태그는 검증 뒤 부여한다.

새 의존성 또는 lockfile 변경 시 개발 의존성을 포함한 audit을 수행하고 영향 경로·실행 도달 가능성·공식 권고·패치 유무를 확인한다. 안전한 패치를 시험한 후 적용하며 force 일괄 업그레이드는 하지 않는다. 미해결 보안 항목은 ID/패키지/버전/권고 URL/심각도/영향/미적용 이유/완화/재검토 조건/소유자를 기록한다. 검사 실패를 취약점 0으로 표시하지 않는다.

이슈는 ISSUE-NNN, 발견 버전, 재현 조건, 기대/실제, 심각도, 담당, 상태, 해결 과정, 변경 커밋, 검증 증거, 재발 방지를 기록한다. 해결 증거 없이 닫지 않으며 에이전트의 검토 보고와 실제 시험 결과를 구분한다.

### OPS-03 검증 버전과 비파괴 복원 (선택된 stable checkpoint 기준, 최종 동결 점검 대기)

현재 기준 버전의 단위·통합·고급 시험·빌드 및 실행 확인을 통과하면 stable 커밋/태그, 시험 로그, SQLite backup API로 생성한 호환 snapshot을 기록한다. 이번 실행에서는 정상 종료 여부와 관계없이 단일 DB 파일 복사 대신 backup API를 사용한다. 신규 기능은 계약·기능·시험이 함께 완료되어야 stable로 승격한다.

동결 시 현재 작업이 미완성이면 마지막 검증 커밋으로 별도 릴리스 작업폴더를 만든다. 미완성 소스와 DB를 보존하며 reset/clean 또는 덮어쓰기로 복원하지 않는다. 스키마가 변경되었으면 해당 stable과 호환되는 DB snapshot을 분리 실행한다. 검증 stable이 없으면 없다고 보고하고 미검증 상태를 정상 버전으로 표시하지 않는다.

### OPS-04 최종 시연과 인수 증거 (채택, 실행 검증 대기)

최종 30분은 검증 버전의 신규 영상 제작 → 발표자료 PPT 작성 → 두 산출물 검수·인도 순서로 사용한다. 총 14시간 한도는 유지하며 사전 개요·템플릿 준비와 최종 제작을 구분한다. 22장의 내용과 함께 실제 UI 조작의 마우스 위치·이동·클릭 강조 및 필요한 확대·축소를 담는다. 자막·내레이션은 실제 검증 범위와 일치해야 하며 키·패스워드를 촬영하지 않는다. 기존 영상 복사만으로 이번 실행의 새 시연 완료로 처리하지 않는다.

운영 인수 조건 AT-OPS-01: 시작/동결/마감 UTC와 실제 작업 종료 기록이 일치하고, 중단 또는 초과가 있으면 명시한다. AT-OPS-02: stable 커밋/태그와 시험 로그·backup 경로·호환 DB를 연결하고 별도 복원 앱의 실행을 확인한다. AT-OPS-03: 채택 아이디어·보안·이슈에 담당과 미해결 상태를 남긴다. AT-OPS-04: 신규 영상 전체 디코딩과 대표 프레임에서 UI·포인터·강조·자막을 확인하고 산출물 경로와 실제 검증 범위를 보고한다. AT-OPS-05: 영상 제작 후 최종 버전의 발표자료를 작성하고 AT-PPT-01~03을 충족한다. 이 문서 편집만으로 이 인수 조건이 통과한 것은 아니다.

---

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

신규 제품 1.0.0의 보고서 실행 예(최종 릴리스 검증·stable 승격 대기):

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

HTTP 관리 API는 MQTT 연동에 필수는 아니며 로컬 개발 UI에서 사용합니다. 기본 127.0.0.1 바인딩입니다. API_TOKEN을 설정하면 `/api/health`와 `/api/config` 외 API에 `Authorization: Bearer ...`가 필요합니다. 내장 UI는 401 응답 후 토큰 로그인을 지원합니다. 토큰은 탭 sessionStorage에 보관하며 REST·SSE·다운로드 Authorization 헤더로만 전달합니다.

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


## 부록 B. 파일별 실행 설정과 MQTT 시험 클라이언트

아래 설정과 코드는 재구현 프로젝트에 그대로 저장해 사용할 수 있는 기준이다. 부록 B의 vpp-client.js는 기존 최소 예제로, 신규 제품의 보고서 요구 구현은 포함하지 않는다. 보고서 구현 시 FR-VPP-REPORT-01 및 부록 A-9 옵션을 추가해야 하며 이 예제만으로 해당 기능이 완료되었다고 판단하지 않는다. 서버·UI는 본문의 요구사항에 따라 구현한다. 인증 값은 빈 값 또는 placeholder이며 실제 비밀정보를 포함하지 않는다.

### B. `package.json`

```json
{
  "name": "vpp-scada-lab",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --env-file-if-exists=.env server/index.js",
    "web": "vite --host 127.0.0.1",
    "build": "vite build",
    "test": "node --test tests/*.test.js",
    "test:integration": "node scripts/integration.js",
    "broker": "docker compose up -d mqtt",
    "start": "node --env-file-if-exists=.env server/index.js",
    "test:advanced": "node scripts/advanced-integration.js",
    "vpp:monitor": "node --env-file-if-exists=.env scripts/vpp-client.js",
    "vpp:dispatch": "node --env-file-if-exists=.env scripts/vpp-client.js --dispatch"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.0",
    "@react-three/fiber": "^9.3.0",
    "csv-parse": "^7.0.2",
    "express": "^5.1.0",
    "lucide-react": "^0.468.0",
    "mqtt": "^5.14.0",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "three": "^0.180.0"
  },
  "devDependencies": {
    "prettier": "^3.9.8",
    "vite": "^7.1.0"
  }
}
```

### B. `.env.example`

```dotenv
PORT=3001
HOST=127.0.0.1
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_PREFIX=vpp
TELEMETRY_SECONDS=60
KMA_AUTH_KEY=
# AWS IoT: MQTT_URL=mqtts://YOUR-ENDPOINT-ats.iot.ap-northeast-2.amazonaws.com:8883
# MQTT_CA=certs/AmazonRootCA1.pem
# MQTT_CERT=certs/device.pem.crt
# MQTT_KEY=certs/private.pem.key
# MQTT_CLIENT_ID=vpp-scada-lab
# Remote MQTT credentials (optional; use TLS for remote brokers)
# MQTT_USERNAME=
# MQTT_PASSWORD=
# Optional per-RTU client certificate mapping file (keep under certs/)
# MQTT_DEVICE_CONFIG=certs/rtu-connections.json
RETENTION_DAYS=30
# Management API bearer token; built-in UI supports tab-session token login.
# API_TOKEN=
```

### B. `docker-compose.yml`

```yaml
services:
  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "127.0.0.1:1883:1883"
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    restart: unless-stopped
```

### B. `mosquitto/mosquitto.conf`

```text
listener 1883
allow_anonymous true
persistence false
log_type error
log_type warning
```

### B. `vite.config.js`

```javascript
import { defineConfig } from "vite";
export default defineConfig({
  root: "web",
  build: { outDir: "../dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
});
```

### B. `scripts/vpp-client.js`

```javascript
// Example VPP adapter: MQTT only. Subscribe first, then send one target command.
import mqtt from "mqtt";
import { randomUUID } from "node:crypto";
import { connectionOptions } from "../server/transport.js";
const dispatch = process.argv.includes("--dispatch"),
  id = process.env.RTU_ID,
  prefix = process.env.MQTT_PREFIX || "vpp";
if (dispatch && (!id || !/^[a-zA-Z0-9_-]+$/.test(id)))
  throw Error("정확한 RTU_ID가 필요합니다.");
const target = Number(process.env.TARGET_KW),
  timeout = Number(process.env.COMMAND_TIMEOUT_SECONDS || 120);
if (dispatch && (!Number.isFinite(target) || target < 0))
  throw Error("TARGET_KW에 목표 kW를 지정하세요.");
if (!Number.isFinite(timeout) || timeout < 1 || timeout > 3600)
  throw Error("COMMAND_TIMEOUT_SECONDS는 1~3600초입니다.");
const c = await mqtt.connectAsync(
  process.env.MQTT_URL || "mqtt://127.0.0.1:1883",
  connectionOptions("vpp-test-client-" + randomUUID().slice(0, 8)),
);
const commandId = randomUUID(),
  topics = ["telemetry", "ack", "command-status", "status"].map(
    (t) => `${prefix}/rtu/${id || "+"}/${t}`,
  ),
  seen = new Set();
let guard,
  closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  clearTimeout(guard);
  await c.endAsync();
  process.exitCode = code;
}
c.on("error", (e) => console.error("MQTT:", e.message));
c.on("message", (topic, bytes) => {
  let m;
  try {
    m = JSON.parse(bytes.toString());
  } catch {
    return;
  }
  if (m.messageId) {
    if (seen.has(m.messageId)) return;
    seen.add(m.messageId);
    if (seen.size > 10000) seen.delete(seen.values().next().value);
  }
  if (topic.endsWith("/telemetry"))
    console.log(
      JSON.stringify({
        topic,
        messageId: m.messageId,
        sequence: m.sequence,
        rtuId: m.rtuId,
        timestamp: m.timestamp,
        runId: m.runId,
        powerKw: m.scada?.powerKw,
        samples: m.sampleCount,
        generators: m.scada?.generators.length,
      }),
    );
  else console.log(JSON.stringify({ topic, ...m }));
  if (
    dispatch &&
    m.commandId === commandId &&
    [
      "completed",
      "failed",
      "timed_out",
      "expired",
      "rejected",
      "superseded",
      "cancelled",
    ].includes(m.status)
  )
    close(m.status === "completed" ? 0 : 1);
});
await c.subscribeAsync(topics, { qos: 1 });
if (dispatch) {
  const command = {
    schemaVersion: 2,
    commandId,
    action: "set_target",
    targetKw: target,
    toleranceKw: 1,
    timeoutSeconds: timeout,
    expiresAt: new Date(Date.now() + 30000).toISOString(),
    priority: 50,
  };
  guard = setTimeout(
    () => {
      console.error("VPP 결과 대기시간 초과. 상태/브로커 연결을 확인하세요.");
      close(1);
    },
    (timeout + 45) * 1000,
  );
  await c.publishAsync(
    `${prefix}/rtu/${id}/setpoint`,
    JSON.stringify(command),
    { qos: 1, retain: false },
  );
  console.log("DISPATCHED", JSON.stringify(command));
} else console.log("SCADA 및 제어 결과 모니터링 중. Ctrl+C로 종료.");
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
```

### B. 최소 `.gitignore`

```gitignore
node_modules/
dist/
.env
certs/
data/
.DS_Store
```

### B. 시험 클라이언트의 의존 함수

위 vpp-client.js의 connectionOptions는 server/transport.js에서 export한다. 서버를 아직 구현하지 않았다면 아래 함수를 독립 모듈에 두고 import 경로를 맞춘다. MQTT.js 설치와 .env 로딩이 필요하다.

```javascript
import { readFileSync } from 'node:fs';
export function connectionOptions(clientId, env = process.env) {
  const options = {
    clientId, reconnectPeriod: 1500, clean: true,
    queueQoSZero: false, connectTimeout: 10000
  };
  if (env.MQTT_USERNAME) options.username = env.MQTT_USERNAME;
  if (env.MQTT_PASSWORD) options.password = env.MQTT_PASSWORD;
  for (const [key, field] of [
    ['MQTT_CA','ca'], ['MQTT_CERT','cert'], ['MQTT_KEY','key']
  ]) if (env[key]) options[field] = readFileSync(env[key]);
  return options;
}
```

## 부록 C. 사용자 풍력 원본 예시와 재생 샘플 생성

### C-1. 사용자 제공 55행 풍력 TSV

기상 열이 없어도 wind 유형으로 입력한다. 이 값의 출력 형태만으로 에너지원 유형을 자동 추론하지 않는다. 기본 해석은 KST, kW 시점 출력이다.

```tsv
timestamp	power_kw	voltage	current_a
2026-01-01 00:00:00	0.0	380.0	0.0
2026-01-01 00:10:00	0.0	380.0	0.0
2026-01-01 00:20:00	0.0	380.0	0.0
2026-01-01 00:30:00	0.0	380.0	0.0
2026-01-01 00:40:00	0.0	380.0	0.0
2026-01-01 00:50:00	0.0	380.0	0.0
2026-01-01 01:00:00	0.0	380.0	0.0
2026-01-01 01:10:00	0.0	380.0	0.0
2026-01-01 01:20:00	0.0	380.0	0.0
2026-01-01 01:30:00	0.0	380.0	0.0
2026-01-01 01:40:00	0.0	380.0	0.0
2026-01-01 01:50:00	0.0	380.0	0.0
2026-01-01 02:00:00	0.0	380.0	0.0
2026-01-01 02:10:00	0.0	380.0	0.0
2026-01-01 02:20:00	0.0	380.0	0.0
2026-01-01 02:30:00	0.0	380.0	0.0
2026-01-01 02:40:00	0.0	380.0	0.0
2026-01-01 02:50:00	0.0	380.0	0.0
2026-01-01 03:00:00	0.0	380.0	0.0
2026-01-01 03:10:00	0.0	380.0	0.0
2026-01-01 03:20:00	0.0	380.0	0.0
2026-01-01 03:30:00	0.0	380.0	0.0
2026-01-01 03:40:00	0.0	380.0	0.0
2026-01-01 03:50:00	0.0	380.0	0.0
2026-01-01 04:00:00	0.0	380.0	0.0
2026-01-01 04:10:00	0.0	380.0	0.0
2026-01-01 04:20:00	0.0	380.0	0.0
2026-01-01 04:30:00	0.0	380.0	0.0
2026-01-01 04:40:00	0.0	380.0	0.0
2026-01-01 04:50:00	0.0	380.0	0.0
2026-01-01 05:00:00	0.0	380.0	0.0
2026-01-01 05:10:00	0.0	380.0	0.0
2026-01-01 05:20:00	0.0	380.0	0.0
2026-01-01 05:30:00	0.0	380.0	0.0
2026-01-01 05:40:00	0.0	380.0	0.0
2026-01-01 05:50:00	0.0	380.0	0.0
2026-01-01 06:00:00	0.0	380.0	0.0
2026-01-01 06:10:00	34.9	380.0	30.61
2026-01-01 06:20:00	69.72	380.0	61.16
2026-01-01 06:30:00	104.42	380.0	91.6
2026-01-01 06:40:00	138.92	380.0	121.86
2026-01-01 06:50:00	173.15	380.0	151.89
2026-01-01 07:00:00	207.06	380.0	181.63
2026-01-01 07:10:00	240.56	380.0	211.02
2026-01-01 07:20:00	273.62	380.0	240.01
2026-01-01 07:30:00	306.15	380.0	268.55
2026-01-01 07:40:00	338.09	380.0	296.57
2026-01-01 07:50:00	369.4	380.0	324.03
2026-01-01 08:00:00	400.0	380.0	350.88
2026-01-01 08:10:00	429.84	380.0	377.05
2026-01-01 08:20:00	458.86	380.0	402.51
2026-01-01 08:30:00	487.01	380.0	427.2
2026-01-01 08:40:00	514.23	380.0	451.08
2026-01-01 08:50:00	540.47	380.0	474.1
2026-01-01 09:00:00	565.69	380.0	496.22
```

### C-2. 데모 CSV 생성 스크립트

아래 파일을 scripts/generate-samples.js로 저장하고 samples 디렉터리를 만든 뒤 `node scripts/generate-samples.js`로 실행한다. 데모 수치는 합성 데이터이며 관측 데이터라고 표기하지 않는다.

```javascript
import { writeFileSync } from "node:fs";
for (const type of ["wind", "solar", "hybrid"]) {
  const header =
    type === "hybrid"
      ? "timestamp,wind_power_kw,solar_power_kw,wind_speed_ms,wind_direction_deg,irradiance_wm2"
      : type === "wind"
        ? "timestamp,power_kw,wind_speed_ms,wind_direction_deg"
        : "timestamp,power_kw,irradiance_wm2";
  const rows = Array.from({ length: 144 }, (_, i) => {
    const t = new Date(Date.UTC(2026, 8, 19, 0, i * 10)).toISOString(),
      v = 8 + 2 * Math.sin(i / 12),
      g = Math.max(0, 800 * Math.sin((Math.PI * (9 + i / 6 - 6)) / 12)),
      w = Math.round(10000 + 3500 * Math.sin(i / 12)),
      s = Math.round(g * 4);
    return type === "hybrid"
      ? [t, w * 0.4, s * 0.5, v.toFixed(2), 240, g.toFixed(1)].join(",")
      : type === "wind"
        ? [t, w, v.toFixed(2), 240].join(",")
        : [t, s, g.toFixed(1)].join(",");
  });
  writeFileSync(`samples/${type}.csv`, [header, ...rows].join("\n") + "\n");
}
```

### C-3. 전체 SCADA 메시지 구조 예시

아래는 한 발전기·한 샘플 배치를 만드는 독립 예제다. 런타임에서는 계산 결과를 사용하며 아래 상수를 실제 관측값으로 전송하지 않는다. 최대 크기 조건 때문에 실제 배치는 샘플 수가 달라질 수 있다. 동일 frame을 `scada`와 `samples` 양쪽에 넣는 의도를 명시한다.

```javascript
const frame = {
  timestamp: '2026-09-21T00:44:46.000Z',
  time: '2026-09-21T00:44:46.000Z',
  sourceTimestamp: '2025-12-31T23:00:00.000Z',
  simulationSeconds: 28801,
  runId: 'example-run-uuid', mode: 'csv', quality: 'SIMULATED',
  powerKw: 125, availableKw: 400,
  plant: {id:'example-rtu-uuid',name:'시험 풍력',type:'wind',
          lat:37.69,lon:128.75,station:100},
  weather: {wind_speed_ms:8,wind_direction_deg:240,
            irradiance_wm2:650,temperature:22},
  weatherSource:'시나리오 기본값',weatherObservedAt:null,
  irradianceSource:'manual',
  electrical: {voltage:380,sourceCurrentA:350.88,
    estimatedCurrentA:109.65,
    currentMethod:'원본 전류 × 제어 후 출력 / 원본 출력; 원본 0 kW는 추정 불가'},
  generators: [{id:'WT-01',type:'wind',ratedKw:1000,rampKwPerSec:50,
    on:true,limitPct:100,powerKw:125,availableKw:400,targetKw:125,
    targetLimitKw:125,status:'CURTAILED',startupDelaySeconds:0,
    startupRemaining:0,cutInMs:3,ratedWindMs:12,cutOutMs:25,
    temperatureCoefficient:-0.004,solarEfficiency:1,customWindCurve:false}],
  faults:{offline:false,latencyMs:0,dropPct:0,sensorFreeze:false,
          scadaReject:false,actuatorStuck:false},
  controlPath:'RTU -> virtual SCADA -> generators'
};
const message = {
  schemaVersion:2,messageId:'example-message-uuid',sequence:1,
  rtuId:frame.plant.id,runId:frame.runId,
  timestamp:frame.timestamp,sourceTimestamp:frame.sourceTimestamp,
  mode:frame.mode,quality:frame.quality,
  powerKw:frame.powerKw,availableKw:frame.availableKw,
  electrical:frame.electrical,weather:frame.weather,
  scada:frame,samples:[frame],sampleCount:1,
  batchFirstTimestamp:frame.timestamp,
  createdAt:'2026-09-21T00:45:00.000Z'
};
```

## 부록 D. SQLite 기준 스키마

SQL과 JSON 도메인 모델을 함께 구현한다. 날짜는 UTC ISO 문자열, JSON body는 UTF-8 직렬화 문자열이다. `commands`는 이전 버전 중복 방지 호환용이며 신규 제어는 command_runs/command_events를 사용한다. 새 프로젝트에서도 기존 DB 호환을 요구하는 경우 테이블을 유지한다. JSON 저장 방식은 기준 구현이며 별도 관계형 설계로 바꾸더라도 트랜잭션·중복·복구 의미는 유지해야 한다.

```sql
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS plants(id TEXT PRIMARY KEY,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS commands(id TEXT PRIMARY KEY,plant TEXT,request TEXT,result TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS samples(plant TEXT,time TEXT,power REAL,available REAL);
CREATE INDEX IF NOT EXISTS samples_time ON samples(time);
CREATE TABLE IF NOT EXISTS rtu_metrics(id TEXT PRIMARY KEY,body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS command_runs(id TEXT PRIMARY KEY,plant TEXT NOT NULL,request TEXT NOT NULL,body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS command_events(id INTEGER PRIMARY KEY,plant TEXT,body TEXT,created TEXT);
    CREATE TABLE IF NOT EXISTS scada_frames(id INTEGER PRIMARY KEY AUTOINCREMENT,plant TEXT,body TEXT,created TEXT,message_id TEXT);
    CREATE INDEX IF NOT EXISTS frame_pending ON scada_frames(plant,message_id,id);
    CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,plant TEXT,seq INTEGER,topic TEXT,body TEXT,created TEXT,acked TEXT,attempts INTEGER DEFAULT 0);
    CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(plant,acked,seq);
    CREATE TABLE IF NOT EXISTS sequences(plant TEXT PRIMARY KEY,value INTEGER);
    CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY,name TEXT,plant TEXT,body TEXT,created TEXT);
    CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,created TEXT,level TEXT,message TEXT);
```

### D-1. 원자성 의사코드

```text
한 simulation tick:
  BEGIN IMMEDIATE
  단지 모델과 가상 시각 갱신
  센서가 정상이면 full frame 및 summary 저장
  단지 모델 저장
  COMMIT (실패 시 ROLLBACK)

배치:
  미배치 frame을 ID 순으로 읽기
  같은 runId / 크기 / 개수 범위로 분리
  BEGIN IMMEDIATE
  RTU sequence 증가
  messageId와 최종 payload를 outbox에 저장
  해당 frame.message_id를 연결
  COMMIT

발행:
  RTU별 가장 낮은 seq의 미확인 메시지 선택
  저장된 본문 그대로 QoS1 발행
  실패면 outbox 유지하고 재시도
  PUBACK면 acked 시각 저장
```

### D-2. 장기 운용 시 경계

현재 구조는 로컬 단일 프로세스·단일 SQLite writer 기준이다. 여러 서버를 같은 DB에 붙여 자동으로 고가용성이 되는 구조가 아니다. 백업은 정상 종료 후 파일을 복사하거나 SQLite 일관성 있는 backup을 사용한다. WAL 활성 상태에서 본 DB 파일 하나만 무조건 복사하여 안전한 백업이라고 간주하지 않는다. 운영 부하·디스크 상한·보관 의무가 생기면 별도 용량 산정과 복구 정책을 확정한다.

---

문서 완료 기준: 본문 요구사항, 부록의 계약·설정·샘플·스키마, 인수 시험으로 빈 프로젝트의 구현 범위와 외부 입력 의존성을 모두 판단할 수 있어야 한다. 인증키나 기존 시연의 특정 RTU UUID가 있어야만 재구현할 수 있는 요구사항은 두지 않는다.
