## 1. GRID

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
발표는 VPP 연동 시험을 위한 가상 발전 현장을 소개합니다. 데이터는 가상 SCADA에서 출발해 RTU와 MQTT를 거쳐 외부 클라이언트로 전달됩니다. 목표 출력은 반대 방향으로 전달되고 실제 센서 피드백으로 종료 상태를 판단합니다. 이 자료의 커밋과 영상의 커밋이 같은지 확인한 뒤 시연을 연결합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (00:00–00:25)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 2. 배경과 시험 목표

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
외부 VPP 개발에서는 정상 발전 데이터뿐 아니라 출력 제한과 통신 장애 같은 조건을 반복해 확인해야 합니다. 실물 발전설비를 대체하는 인증 모델을 만드는 것이 아니라 연동 경로와 데이터 계약을 시험하는 것이 목적입니다. 요구사항은 구현 중 검토를 통해 갱신하며 채택한 개선과 제안 상태를 구분합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (00:00–00:25)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 3. 시스템 경계

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
애플리케이션 안에는 발전 모델, 가상 SCADA, 독립 RTU 연결, 영속 큐와 제어 검증이 있습니다. 외부 VPP의 예측·입찰 알고리즘과 실제 시장 제출은 범위에 포함하지 않습니다. AWS 또는 실제 운영 VPP에 접속하지 않았다면 MQTT 로컬 시험만으로 연동 성공을 주장하지 않습니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (00:00–00:25)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 4. 양방향 MQTT 아키텍처

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
위쪽 흐름은 전체 발전기 샘플과 실제 제어 결과가 SCADA에서 외부 클라이언트로 전달되는 경로입니다. 반대 흐름은 목표값을 검증하고 SCADA에 전달하는 제어 경로입니다. QoS 1의 PUBACK는 브로커 접수를 뜻하며 외부 업무 처리 완료와 다릅니다. 데이터 메시지 식별자로 중복을 제거해야 합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (01:35–02:03)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 5. CSV에서 일 초 SCADA 데이터까지

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
입력 CSV와 TSV는 십 분 간격 원본입니다. 시점 출력은 보간하고 구간 평균 및 에너지 값은 각각의 의미에 맞춰 처리합니다. 수집 시각, 원본 시각과 가상 시각을 구분하며 전압과 원본 전류, 추정 전류의 출처도 구분합니다. 시연에서 실제 파일 등록과 등록한 단지의 수집 시작을 확인합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (00:25–00:59)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 6. 목표 출력 제어와 피드백

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
목표값은 정격과 유효기간, 중복 명령 및 우선순위 검증을 거칩니다. accepted는 영속 접수, executing은 SCADA 전달, completed는 허용 오차 내 실제 출력 관측입니다. 실패와 만료, 시간 초과의 의미를 구분합니다. 영상에 보이는 값을 같은 commandId의 외부 클라이언트 결과와 대조합니다. 일반 REST 목표 폼의 입력 범위와 날짜 오류는 별도 실제 브라우저 시험으로 확인한 개선입니다. 이 영상 장면에서는 해당 폼을 제출하지 않으며 별도 MQTT 클라이언트의 출력 제어를 보여줍니다. 대시보드의 REST 접수 패널은 마지막 관측 상태입니다. 저장 상태 확인은 서버에 저장된 상태를 다시 읽습니다. 접수 안내만으로 완료를 판단하지 않습니다. 명령 목록의 조회 성공·마지막 확인 시각은 브라우저의 응답 관측이며 명령 완료 시각이나 전체 실시간 연결 상태가 아닙니다. 영상에서는 정상 조회를 보여주며 조회 실패 경계는 별도 시험 근거입니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (02:03–02:49)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md, deploy/verification/candidate-d98d3c4/restore-current-form/result.json, deploy/verification/candidate-d98d3c4/restore-current-receipts/result.json, deploy/verification/candidate-d98d3c4/main-command-list/result.json, deploy/verification/candidate-d98d3c4/restore-current-list/result.json

## 7. 대시보드와 삼차원 현장

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
대시보드는 현재 단지의 가용 출력과 실제 출력, 기상 조건, 발전기 상태를 보여줍니다. 삼차원 장면은 가상 현장 표현이며 실측 지형이나 제조사 인증 모델이 아닙니다. 단지를 선택하고 드래그와 휠로 시점을 바꾸며 상한 및 기동·정지를 조작합니다. 기상 입력 모드와 원본 CSV 모드의 차이도 설명합니다. 기동·정지 버튼 조작은 모든 명령의 완료를 뜻하지 않습니다. 뒤의 기동 명령이 앞의 정지를 대체하면 superseded로 설명하고 정지 완료로 표현하지 않습니다. 상한 명령 후 접수 확인에서 대상 RTU와 명령 ID를 확인하고 저장 상태를 조회합니다. 최종 캡처와 명령 상태가 일치하는지 검수합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (00:59–01:35)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 8. 독립 RTU와 전송 메트릭

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
RTU마다 수집과 전송 상태를 독립적으로 확인합니다. 연결 상태와 건강 상태, 수집 샘플, 발행 시도와 PUBACK 완료, 디스크 큐를 구분합니다. 프로세스 메모리는 공용 프로세스 수치입니다. 기본 육십 초 배치 안에는 전체 발전기 샘플이 들어가며 크기 제한에 따라 여러 메시지로 나눌 수 있습니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (01:35–02:03)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 9. 장애 주입과 재시작 복구

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
통신 장애와 센서 중지는 실제 최종 장면에서 구분해 보여줍니다. 서버 재시작과 미확인 배치 재전송, 독립 저장소 백업 복구는 선택 매니페스트의 별도 실행 근거로 설명하며 영상에서 수행했다고 주장하지 않습니다. 시연 종료 설정 복원은 최종 demo-recovery 기록에서 확인합니다. 무작위 궤적의 완전한 원상 재현은 보장하지 않습니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (02:49–03:21)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md, deploy/verification/candidate-d98d3c4/outbox-restart.json, deploy/verification/candidate-d98d3c4/restore-summary.json

## 10. 시나리오와 외부 연동

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
재생 배속, 일시정지와 난수 시드로 실험 입력을 관리합니다. 시나리오를 저장하고 복원하면 새로운 runId가 생기며 이전 실행의 샘플과 구분합니다. 저장한 모델과 상태를 재현하는 기능이지 외부 네트워크 지연을 동일하게 보장하는 기능은 아닙니다. RTU별 토픽과 연동 규격을 가이드에서 확인합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (03:21–03:51)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md

## 11. k3s 배포와 운영

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
최종 선택 릴리스의 charles-k3s 배포 이미지와 접속 절차를 안내합니다. 준비 기준은 제품1.7.0의 d98d3c4 앱과 검증된 안정 백업 및 독립 저장소 복구 기록입니다. 동결 때 선택한 매니페스트의 정확한 근거 해시를 다시 확인합니다. 운영 소스 커밋과 앱 runtime 커밋을 구분하고 자격증명은 화면이나 자료에 넣지 않습니다. 같은 불변 백업으로 현재1.7과 하위호환1.6를 별도 저장소에 복원한 근거를 구분합니다.1.6 복원본에는1.7의 명령 목록 조회 상태 안내가 없으므로 해당 개선은 현재1.7과 구분합니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (03:51–04:15)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md, deploy/verification/stable-backup-d98d3c4.json, deploy/verification/candidate-d98d3c4/restore-summary.json

## 12. 검증 결과

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
검증 결과는 인수 조건과 실행 로그에 연결합니다. 로컬 브로커, 실제 k3s 배포, 외부 VPP 또는 클라우드 검증 상태를 서로 구분합니다. 한 종류의 시험 통과로 전체 완료를 추정하지 않습니다. 영상의 목표 출력과 외부 클라이언트의 관측 전이를 비교하고 한계가 남아 있으면 함께 제시합니다. 이벤트 시각 표시는 메인1.7 실제66개 이벤트와 현재1.7·하위호환1.6 복원본 각각 실제80개 이벤트를 별도 읽기 전용 UI 근거에서 대조했습니다. 기존8장면 영상은 이벤트 로그 페이지를 방문하지 않습니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (02:03–02:49)
근거: docs/PRD-VPP-SCADA-RTU.md, docs/protocol.md, deploy/verification/candidate-d98d3c4/main-event-time/result.json, deploy/verification/candidate-d98d3c4/restore-current-event/result.json, deploy/verification/candidate-d98d3c4/restore-back-event/result.json

## 13. 보안과 미해결 이슈

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
의존성 취약점은 검사 날짜와 데이터베이스 버전, 실제 이미지와 연결해 기록합니다. 적용 가능한 패치는 회귀시험 후 반영하고 적용하지 못한 항목은 이유와 대응 방법을 남깁니다. 이슈도 재현 조건과 해결 과정, 수정 커밋 및 독립 검증 근거를 연결합니다. 검토 보고만으로 해결 상태를 만들지 않습니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (03:51–04:15)
근거: docs/security/VULNERABILITY-MANAGEMENT.md, docs/issues/ISSUES.md

## 14. 버전별 개선과 다음 과제

준비용1.7 원고·기존 로컬 리허설 화면. 최종 발표자료가 아닙니다.
1.1은 CSV 해석 미리보기,1.2는 최근 최대20개 명령 상태 JSON,1.3은 선택 RTU 시나리오와 대상이 명확한 결과 안내를 추가했습니다.1.4는 기존 서버 범위와 날짜 오류를 입력 단계에서 안내합니다. 소수와0초 의미를 유지하고 조용히 값을 보정하지 않습니다. 새 폼의 오류·수정·키보드 경로는 별도 실제 브라우저 근거로 확인했으며 본 영상에서는 제출하지 않았습니다. 명령 내보내기는 저장 상태이며 전체 감사 이력이나 외부 업무 수신 증명이 아닙니다. KMA 요청 완료는 새 관측 적용 증거가 아닙니다. 1.5는 REST 명령의 대상·명령 ID·마지막 관측 상태와 저장 상태 재조회 안내를 추가했습니다. 접수와 실행 완료를 구분합니다. 응답 유실 등 경계 경로는 별도 브라우저 시험 근거이며 모든 경로를 영상에서 시연한 것은 아닙니다. 1.6은 이벤트의 실제 발생 시각을 표시하도록 수정합니다. 이 수정은 별도 실제 UI 검증 근거로 설명하며 영상에서 이벤트 로그를 시연했다고 주장하지 않습니다.현재 하위호환1.6 복원본의 이벤트 시각은 별도 실제 근거로 확인했습니다. 1.7은 명령 목록 조회 상태와 마지막 성공 확인 시각을 구분합니다. 정상 조회는 MQTT 장면에서 소개하고 실패·지연·취소 경계는 별도 브라우저 응답 시험입니다. 실제 원격 네트워크 장애를 시연했다는 뜻이 아닙니다.

영상: ../../../../full-candidate17-20260921/GRID-VPP-demo-ko.mp4 (03:51–04:15)
근거: docs/product/PRD-CHANGELOG.md, docs/product/IDEAS.md, artifacts/checkpoints/candidate-1.7-command-list-round1/result.json, artifacts/checkpoints/candidate-1.7-command-list-round1/supplement-result.json, deploy/verification/candidate-d98d3c4/restore-current-form/result.json, deploy/verification/candidate-d98d3c4/restore-current-receipts/result.json, deploy/verification/candidate-d98d3c4/main-event-time/result.json, deploy/verification/candidate-d98d3c4/restore-current-event/result.json, deploy/verification/candidate-d98d3c4/main-command-list/result.json, deploy/verification/candidate-d98d3c4/restore-current-list/result.json