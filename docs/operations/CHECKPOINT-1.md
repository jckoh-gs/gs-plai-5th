# 안정 실행 체크포인트 1

제품1.0.0 / PRD1.7 / 런타임 소스af7f223. 이 체크포인트는 기능과 복원 가능성을 검증한 실행 기준이며 전체14시간 목표나 최종 영상/PPT 완료를 뜻하지 않는다.

앱13da26c8…1792ba, MQTT a75b5708…2b179c, registry404bd3e2…f9b56c. 전체 digest와 source label은 deploy/verification/deployed-candidate.json 및 image-af7f223.json에 있다. 원격 charles-k3s/gs-plai-5h, UI3104/MQTT18884 인증 터널, 단일SQLite writer와 분리된 brokerPVC를 사용한다.

최종 이미지59단위 시험, MQTT통합/장애 시험, 실제 원격125kW(accepted/executing/completed·오차0) 및60샘플 패킷, 인증 UI/5탭 가이드/이벤트 로그, 실제Pod교체 후 미전송메시지 동일본문·ID·순서·PUBACK 복구가 통과했다. 이전 정상 이미지와 같은DB를 패치 이미지로 실행하는 별도 복구도 확인했다. 세부 판정은 product/acceptance.json과 REVIEW-006을 참조한다.

현재 backup은 deploy/verification/stable-backup-af7f223.json이 지정한다. 56594432bytes, SHA256 `7f98602386dc80a7ddfb2a138b81b81f6c0a894439ddfddba37fddb673965a7a`. 원격onlinebackup과 로컬0600 사본이 일치하며 이 정확한 snapshot을 새PVC와 최종af7f223 이미지로 실행해 UI·실제MQTT125kW·기존5단지/시나리오를 검증했다. 복구 시험용 배포는0replicas로 내리고 PVC/backup은 보존했다.

잔여 알려진 취약점 매칭은 앱4, broker10이며 수정 버전이 없는 항목의 경로·영향·완화책을 docs/security에 관리한다. Registry는 패치된Go/의존성으로 현재DB 검사0건이며 이를 미래 안전 보장으로 표현하지 않는다. 실제 KMA키·AWS·운영VPP 자격정보는 제공되지 않았으므로 해당 외부 연결 성공을 주장하지 않는다.

안정 태그는 `stable-runtime-v1.0.0-af7f223`이다. immutable manifest는 artifacts/releases/checkpoint-1.0.0.json에 저장하고 생성 당시 소스/문서/시험은 manifest.source.commit으로 검증한다. 향후 PRD·코드 변경 후 과거 기록 검사에는 `node scripts/verify-release.mjs artifacts/releases/checkpoint-1.0.0.json --at-commit`을 사용한다. `--remote`는 현재 배포가 그 체크포인트 이미지인지도 검사한다.

이후 개선은 새PRD/제품 버전으로 진행하며 이 복원 지점을 덮어쓰지 않는다. run.json의 동결·마감 시각은 유지한다.
