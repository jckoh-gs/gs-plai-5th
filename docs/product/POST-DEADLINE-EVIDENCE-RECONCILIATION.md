# 마감 후 증거 참조 정합성 보완

사용자의 최종 전달 승인 범위에서 읽기 검토했다. 원래 마감과198개 감사·불변manifest·태그는 변경하지 않았다. 재시험/배포/기능 수정은 없다.

10개 현재 경로와 과거 인수SHA의 차이 중7경로는 모든 과거 버전을 정확한 Git commit:path/blob에서 복원해 SHA256 일치를 확인했다. JSON의 각 recordedVersions.gitSource가 재현 가능한 원문 위치다. server/model.js의 현재 내용은 선택runtime40b 및 최종manifest runtime hash와 일치한다. 다른 문서/시험 스크립트는 이후 보강된 현재 파일을 과거 원문으로 대체해서는 안 된다.

3개 과거SHA는 reachable Git 경로 이력에서 복원되지 않았다. mqtt-access.json 초기5c94는 덮어쓴 실행 보고서 참조, browser-check.cjs 초기c06은 초기 작업트리 참조, final-role-closeout.json의0310은 최종22:05 갱신 전 중간 문서를 인수에서 해시한 기록 결함이다. 이를 모두 단순 정상 역사참조나 해시검증PASS로 처리하지 않는다. 초기 원문 바이트의 동일성은 미확인으로 남긴다.

기능적 대조는 별도 최신 근거로 명시했다: 정확1.7.1 main-regression(auth/SSE·served source9844), post-rollout 실제234이미지, main MQTT125/error0, 동일5ff 현재/하위복원26보고서+2Pod 식별, 최종same75f4 Ready 증거다. 최종역할은c9fe786에 저장된 실제22:05 문서 및22:03 소유정리/22:01 재개 증거와 새SHA로 결합했다. 이는 과거 누락SHA 복원이 아니라 현재 검증 범위를 뒷받침하는 명시적 정정 참조다.

따라서 현재 기능 결함을 보여주는 해시 차이는 발견하지 않았지만, 원래 감사의 세 참조 무결성 결함은 실제로 존재한다. 원래198개 상태를 소급 수정하거나 세 과거SHA에 거짓PASS를 주지 않는다. 상세 버전 수는 기계판독 JSON의 historicalVersions/gitRecoveredVersions를 기준으로 하며, 모든 정확SHA·commit·영향 요구ID·후속근거를 그 파일에 기록했다.
