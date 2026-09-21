# 제품 검토 022 — 1.4.0 체크포인트 출처 독립 대조

판정: 1.4.0 체크포인트의 기록 무결성과 현재 배포 이미지 일치를 확인했다. 원래 실행 종료 시각을 읽는 `deadline-command.py --timeout-seconds 75` 안에서 `verify-release.mjs artifacts/releases/checkpoint-1.4.0.json --at-commit --remote`를 직접 실행했다. 종료 코드 0, **962개 해시 PASS**, `remoteImageMatched=true`다. 별도 원문은 [review-022-manifest.log](review-022-manifest.log)에 보존했다.

기록 출처 커밋은 `bcc010c677196c1010b5e5a6c9b9bb1a8362bcdb`, 실제 런타임은 `fdd0491a5c08901962f46ac845f8582921150d45`로 구분했다. 두 로컬 태그 `stable-v1.4.0`, `stable-runtime-v1.4.0-fdd0491`을 commit으로 직접 peel한 결과 모두 해당 런타임과 같다. 원격 Git push 완료 여부는 이 검증에 포함하지 않는다.

검증기는 기록 커밋의 소스·증거·PRD·인수 목록 해시를 대조하고 로컬 백업을 스트리밍 SHA로 다시 검사했다. 백업은 594,944,000바이트, SHA256 `be09a5f5e1721970ec7f25197fcf4f3db504f6f6ad4765080ba301a0c7fd760a`다. 배포 `charles-k3s/gs-plai-5h/grid`의 Ready replica와 실제 app/broker 이미지 ID를 대조했으며 app은 `sha256:c19d550f0cfabbeb1e5f637f3c38a1daee1c2c44222b68dd088ae1875cd4b4f4`와 일치했다.

기존 `checkpoint-1.3.0.json`은 현재 파일 바이트와 위 기록 출처 커밋의 파일을 직접 비교해 동일함을 확인했다. SHA256은 `18c80c0828852d8661be42edc7db69a176949574e6e88ec060cb5f720e607715`다. 기존 688개 해시 체크포인트를 새 962개 해시 manifest로 덮어쓰지 않았다.

파일 존재나 해시 일치만으로 기능 인수를 판정하지 않는다. 실제 1.4 및 역방향 1.3 복원, 원래 RTU 설정 보존, 제공된 번들 일치, 복원 rig 정리는 [REVIEW-021.md](REVIEW-021.md)의 독립 기능 검토에 근거한다. 이번에는 기능 시험을 반복하지 않았다. 최종 영상·PPT·동결·시간 게이트와 최종 인도는 별도 미완료이며, 전체 목표 완료 판정이 아니다. 이번 변경은 이 문서와 별도 검증 로그뿐이다.
