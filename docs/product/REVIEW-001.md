# 제품 검토 001

기준: HEAD a59646b032baf362802b7c7307fc762357b22367 위 미커밋 구현 작업 중. 검토 파일: docs/operations/run.json, CONTRACTS.md, PRD, server/index.js, web/src.jsx. 코드는 계속 변경 중이며 이 검토는 실행 성공 증거가 아니다.

발견/조치:
- 취소된 일정·원격 인증 불가 설명·향후 배포 표현·과거 영상 성공 표현: PRD1.6 정정.
- 서버와 계약은 mutation 공개 plant를 반환하나 PRD 일부만 좁은 응답: PRD 정합화.
- weather() 비동기 결과가 명시적 refresh 중 수동 변경이나 관측소 변경을 덮어쓸 가능성: 메인에 전달. 요청 시 모델/관측소 revision을 기억하고 변경 후 늦게 도착한 결과를 무시하는 수정 및 지연 fixture 검증 필요. 후속 확인: 메인이 signature(runId, station, mode, weather, weatherSource, freezeLiveWeather) 비교를 추가한 소스를 확인했으며 지연 fixture 검증은 대기.
- UI 토큰·fetch SSE 구현 확인. 실제 인증/다운로드/재연결 검증 아직 없음.
- 기존 FR/AT 항목별 pending ledger 생성. 단위·실제 MQTT·브라우저·배포·복원·영상/PPT 증거를 각각 연결하기 전 pass로 바꾸지 않음.

다음 회차: 구현 완료 후 acceptance.json 항목별 정확한 시험명/로그 및 미검증 경계 대조. IDEA-003/004 메인 채택 결정 확인. 실제 k3s+브라우저 인증을 우선 확인.

후속 채택: 메인이 IDEA-003/004를 승인하여 PRD1.7에 UI-07/OPS-05 및 AT-FRESH-01/AT-RELEASE-01 추가. acceptance.json에 검토 시 소스 commit과 작업본 파일 SHA-256 기록. 구현·시험은 대기이며 기록된 파일 해시는 해당 순간의 식별 용도다. T0는 변경하지 않음. 다음 회차 실제 구현/시험을 확인.
