# 제품 검토 027 — 1.5 운영·복원 인수 대조

검토 진행 기록: 현재 main1.5의 완료 근거와 로컬 인수를 읽었다. 최종 현재/하위 복원 summary 및 두 rig 정리 전에는 aggregate 인수를 승격하지 않는다. 현재 기준은 runtime6d165d1e8f3214a50ee66d2b13947f64d86658f5/image2fd3f21cd4f49702079a7a0ba7c2d40420a38db1bfd7b9e2744ad8e4cb8d5a0f이며 검증된 fallback1.4를 보존한다.

main-browser/main-export/preview/readonly-form PASS, 실제 인증 MQTT125kW/error0/accepted→executing→completed/동일ID중복/60샘플을 직접 확인했다. outbox 증거는 Pod UID47851d37→62d0d7fd 교체, 같은 persisted body SHA ca91838f…d7807와 실제MQTT본문 일치·PUBACK를 기록한다. 후속 normal은 원래5RTU 설정복구/모든장애false/HEALTHY/pending0이다. 소스/이미지18파일 대조·정확image77앱검사 및 실제broker 통합/고급은 pre-deployment-review와 연결한다. 운영 도구 후속 전체267PASS는 현재 workstation 범위이며 image77과 합산하지 않는다.

백업 메타데이터는719527936바이트/SHA ad34a074276243fb1b83d7fe081aa7631c9d2d51d0697e9d0dca5d7e5f349b24, source6d165d1/image2fd를 가리킨다. fresh1.5 init에서 source/destination/expectedSHA 일치·existingDestination=false·integrityok를 확인했다. 복원본 receipt round2는14case, 실제 served JS b6c12889…e1dda와 원래RTU 설정불변 cleanup을 기록한다. 명령폼44검사와 실제broker 수명주기도 PASS다. 첫 receipt 실행은 필수 EXPECTED_WEB_SHA 누락으로 fixture 생성 전 실패한 이력이며 삭제하지 않았다. 재실행은 별도round2 증거다.

미디어는 별도 준비 검토다. compact inventory28개와 원래 source-snapshot41개 해시를 직접 대조했다. receipt 상세 및 encoded scene4 두 이미지를 직접 보고 리허설 표기·RTU/ID/상태·포인터와 오른쪽metrics 전체·한글 자막을 확인했다. 전체8프레임 검토는 미디어 담당 기록이며 여기서 전 프레임 재검수나 청취를 했다고 주장하지 않는다.249.33초/제작272.706초/31개SRT/전체디코딩은 보존된 준비 영수증 범위다. REST set_limit의 저장상태조회와 별도MQTT125 결과를 구분하고 stop은 superseded이지 완료라고 쓰지 않는다. 기존12RTU 설정불변 복구와 seed 재설정의 궤적 한계도 유지한다. 최종 영상/PPT 또는 발음·음질 청취 인수는 아니다.

## 최종 기능 판정 — 15:01:22Z terminal summary 이후

restore-summary의19개 참조 JSON을 각각 열어 모두 PASS임을 확인했다. fresh1.5와 backward1.4 init의 source/destination SHA가 같은 ad34 스냅샷이며 existingDestination=false다. 각 final-pods.items가 비어 있고 scaled-zero.spec.replicas=0을 직접 대조했다. summary는4PVC 보존·소유터널종료·운영DB 미변경을 기록한다. 원래5plants/1scenario 비교는 fixture 변경 전에 수행됐다. 각 실제HTTP served-assets가 해당 버전의 이미지와 연결되므로 scenario harness의 로컬dist 메타데이터만으로 원격 실행을 추론하지 않았다.

판정: 신규 receipt8개 요구의 기능·배포·복원 범위는 verified_functional로 승격 가능하다. receipt14case는1.5 복원본에서만 검증했고 하위1.4에 새 기능이 있다고 주장하지 않는다.1.5와1.4의 기존form44 및 UI/preview/export/scenario/MQTT는 별도19개 범위다. 로컬263/후속ops267/정확image77은 서로 다른 범위이며 더하지 않는다. 런타임 stable 태그·새 불변manifest의 출처 검증은 메인 후속 단계로 남는다. 최종 미디어·동결·종료·인도 및 전체 목표 완료는 미완료다.
