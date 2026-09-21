# 제품 검토 028 — 1.5 불변 체크포인트 독립 검증

원래 deadline을 읽는75초 wrapper에서 `node scripts/verify-release.mjs artifacts/releases/checkpoint-1.5.0.json --at-commit --remote`를 직접 실행했다. 종료0, **1177개 해시 PASS**, remoteImageMatched=true다. 기록 커밋의 소스/런타임·인수/증거 해시, 실제 로컬 백업 스트리밍 SHA 및 현재 Ready app/broker 이미지 일치를 확인한 범위다. 기능 인수와 미디어 판정의 대체가 아니다.

manifest SHA256: `6b3940ed7190530c046594186febff54d2e0ee93b0a0856e314c5c3ca3762ff7`.

source commit은 `19e0c3a21e49e081be3cc1625fea403890932723`, runtime은 `6d165d1e8f3214a50ee66d2b13947f64d86658f5`로 구분한다. 로컬 `stable-v1.5.0`과 `stable-runtime-v1.5.0-6d165d1`을 commit으로 peel해 둘 다 해당runtime임을 확인했다. 이번 검토에서 원격Git push를 새로 검증한 것은 아니다.

백업은719527936바이트/SHA `ad34a074276243fb1b83d7fe081aa7631c9d2d51d0697e9d0dca5d7e5f349b24`다. REVIEW027에서 직접 대조한19개 복원 근거는 fresh1.5·하위1.4 동일 스냅샷/원래5단지/실제servedasset/기존form44·receipt14·UI/MQTT/양rig정리 범위다. receipt14는1.5에서만 검증했으며1.4 신규기능이라고 주장하지 않는다. 단순 파일 존재로 복원 인수를 추론하지 않았다.

facts.template은1.5.0 준비 기준이며 reviewed=false/preparationTemplate=true가 유지된다. 포함된 고유 배포근거5개(restored-command-form, restored-command-receipts-round2, outbox-restart, restore-summary, stable-backup)의 경로가 manifest evidence에 속하고 현재 파일 SHA도 기록값과 같음을 확인했다. 실제 최종 영상/캡처/시각/선택RTU placeholder는 준비값이며 실제 facts로 승인하지 않는다.

판정: 현재1.5 기능 체크포인트의 독립 출처 검증 PASS. manifest를 수정하지 않았고 REVIEW028만 추가했다. 최종 동결·신규 영상·동일영상PPT·시간·인도와 전체 목표 완료는 아직 미완료다.

직접 실행 결과: `{"result":"PASS","manifest":"artifacts/releases/checkpoint-1.5.0.json","checkedHashes":1177,"remoteImageMatched":true,"scope":"File integrity and optional deployed identity only; acceptance, restore and media verdicts remain independent"}`
