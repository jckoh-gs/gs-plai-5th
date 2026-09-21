# REVIEW-046 — 제품1.7.1 불변 체크포인트 독립 출처 검증

`python3 scripts/deadline-command.py --timeout-seconds 65 -- node scripts/verify-release.mjs artifacts/releases/checkpoint-1.7.1.json --at-commit --remote`를 읽기 전용으로 실행하여 terminal0/PASS,2033개 해시 및 실제원격 이미지 일치를 확인했다. 출력은 review-046-manifest.log다. 기능/복원 시험을 반복하지 않았다.

manifest SHA256은0c9e5bec0a0ef506884b70374aae791e2cb2e38321dcdcd841c10a02c6962ebf이다. 운영·근거 source.commit은b6c3cbc5742b095bedb32b5f4dea598e685412f5, 정확 runtime은40b9ed898f32037e7a87259d12d145457575a4a8, app은234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876이다. verifier는 실제deployment Ready1 및 app/broker 실제Ready image를 대조했고 별도15초 제한 읽기에서 현재Pod UID75f4bc7a-0c4d-4cff-8ce2-cea68fd43cbc를 확인했다.

선택백업1075081216B/SHA5ff34f3e5dbc52f07b899f0c8013db130e5fd13c3d315e92aa512d474ea1f782는 verifier가 실제 로컬파일 전체를 streaming hash하여 일치시켰으며 backup/app image도 일치한다. 동일 snapshot 양버전26보고서+2Pod와 정리는 REVIEW045의 독립 기능인수 근거다.2033개 파일해시는 이 기능 판정을 대신하지 않는다.

PRD1.15 SHA9aab4e968467f626af2a323e6d6a61abf00d09200547dc808f9c3e0cb022cb26, acceptance SHA0c5692fe8761399ef9a3e6fd969d5aa78aa047977491486064b2b39dfcc7fd93를 manifest.source의 git바이트로 별도 대조했다. 그 당시 AT04는 manifest 생성 전이므로 partial이다. 이번 출처검증을 완료한 뒤 현재 acceptance의 AT04를 verified_functional로 갱신하는 시간적 순서가 정상이다. 과거manifest/근거를 덮어쓰지 않고 이후 검증은 --at-commit으로 당시판정을 읽는다.

AT04의 기능·배포·복원·불변checkpoint 범위는 완료다. 태그/원격전달 최종기록은 메인 담당이며 전체목표·최종미디어·시간 인수를 뜻하지 않는다. 기존1.7/1cab 및 불변manifest는 보존한다.
