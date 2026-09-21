# 기상 시연 복원 도구 독립 보안 검토

REVIEW052/ISSUE031 운영 도구 delta를 읽었다. 제품 runtime/OSS/API 변경 검토가 아니며 보안 담당은 실제 녹화·복구·원격 쓰기나 코드 수정을 수행하지 않았다. 첫 리허설77008/exit1은 public effective weather와 CSV에 가려진 manual 입력 설정의 차이로 복원 검증이 실패한 이력이며, 이 기록을 성공으로 바꾸지 않는다. 기존2RTU 불변/새 실행 결과는 해당 담당의 별도 영수증 범위다.

## 현재 소스 판정

새 차단 결함을 발견하지 않았다. record-demo는 실제 등록 response의 status와 request.postDataJSON을 함께 전달한다. lifecycle은 actual201/new ID/run/createdAt 및 사전 fingerprint 경계를 유지한다. 제출 CSV는 명시 timestamp와 power/electrical 열만 허용하고 중복·알 수 없는·weather 열을 거부한다. mode=csv, 별도 irradianceDataset 없음,4개 유한 weather 값을 함께 요구한다. server effectiveWeather는 CSV weather 및 별도 일사 overlay를 적용하므로 이를 제외한 제한적 등록에서는 public 값을 숨은 수동 입력과 혼동하지 않도록 하는 조건이 부합한다. createPlant 초기 풍향240은 public modulo360에 의해 변하지 않는다.

검증된 basis와 weatherConfigurationBaseline만 recovery target으로 선택한다. 과거2인자 capture 또는 basis 없는 journal은 weather 복원/일치 주장을 null로 남긴다. 이런 과거 journal의 전체 PASS는 기존 projection 설정 범위이며 weather까지 복원했다는 뜻이 아니다. 이 basis는 신뢰된 private journal 작성 경로를 나타내며 암호학적 서명이나 악의적 로컬 journal 위조 방어가 아니다.

PATCH는 매번 소유 id/run/createdAt/name/type 및 기존 RTU 아님을 다시 확인한 뒤 그 owned endpoint에만 수행한다. mode와 수치만 복구하고 역사적 default/KMA 출처를 작성하지 않는다. API가 manual로 표시한 출처 변화는 weatherSourceLabelUnchanged로 별도 보고한다. 숫자 복구를 과거 기상 관측 출처나 RNG 전체 궤적 복원으로 부풀리지 않는다. scene-plan의 기상 적용은 requiresOwned이며 recorder가 선택 RTU와 journal 소유권을 확인한다.

등록 응답 유실로 actual201 baseline이 없으면 unique candidate를 찾아도 자동 쓰기를 거부한다. scenario restore 응답 미확정도 별도 reconciliation이 필요하다. 일반 PATCH 응답 유실은 다음 읽기와 delta 비교 전 재전송하지 않으며 GET과 PATCH 사이 외부 동시 변경을 원자적으로 잠그는 기능은 아니다. 원래 deadline 및 회차60초/요청5초 제한, redirect:error, API 오류 고정 메시지를 유지한다.

## 잔여 및 증거 경계

CSV header whitelist는 이 시연 도구의 숨은 설정 검증을 위한 보수적 제한이며 제품의 기존 CSV 별칭/quoted header/기상열 지원을 제거한 것이 아니다. 전용500샘플 파일의 실제 등록·기상 조작·복구 검증은 새 media 실행 결과가 있어야 완료라 할 수 있다. 제한조건을 만족하지 못하면 이미 등록된 RTU가 있을 수 있으므로 자동 재등록하지 말고 private intent와 실제 ID를 먼저 대조한다.

기존 RTU 불변 비교는 projection에 포함된 설정·dataset·generator·replay·fault 범위이며 실시간 telemetry와 기존 RTU의 숨은 weather 입력 전체를 검증하는 것은 아니다. trusted private journal 경로, 현재 단일 운영자, UI 선택 확인과 API 쓰기 사이 경쟁 및 호스트 강제 종료/동기 I/O 시간 한계는 남는다. 이번 소스 판단은 issues 경계시험·새 실제 리허설 성공이나 최종 영상 인수를 대체하지 않는다.

## 검토 소스

UTC 2026-09-21T19:10:37.807304+00:00

- `scripts/media/demo-lifecycle.cjs`: `7674e060ea3cc85805100060810904ac6b29de1d99b8936e7dd6c9103a1a625c`
- `scripts/media/recover-demo.cjs`: `803558acb145447b45c1ff9e4c98178c130a4120d9d398fda16e6568c0c02762`
- `scripts/media/record-demo.cjs`: `dc01e9f9a4337b3de81842e2fd322a5c5bcf11fc834a44002874c1cb9d9794b0`
- `scripts/media/scene-plan.cjs`: `d69f58893e36ed3c2bae1402a1b919ef983afa62cecc62d2a6e414465b46eb7e`
- `server/model.js`: `875d936b0038ef5a9bd3c678a50dafdd8d33c7c0f8c60eba0316def51e95ba67`
