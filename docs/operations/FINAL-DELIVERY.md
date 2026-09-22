# GRID 최종 인도

제품 **1.7.1**, PRD **1.15**의 검증된 실행 버전과 최종 시연 자료다. 소스 저장소는 [gs-plai-5th](https://github.com/jckoh-gs/gs-plai-5th)이며 실제 운영 대상은 `charles-k3s` / `gs-plai-5h` / `grid`다.

## 결과물

- [한국어 1080p 시연 영상, 295.03초](../../artifacts/video/GRID-VPP-demo-ko.mp4)
- [편집 가능한 한국어 PPT, 14장](../../artifacts/presentation/GRID-VPP-presentation-ko.pptx)
- [발표자 노트](../../artifacts/presentation/speaker-notes.md), [영상 자막](../../artifacts/video/GRID-VPP-demo-ko.srt), [영상 원고](../../artifacts/video/narration-ko.md)
- [PRD](../PRD-VPP-SCADA-RTU.md), [버전별 아이디어](../product/IDEAS.md), [198개 요구사항별 검증](../product/FINAL-REQUIREMENT-REVIEW.md)
- [취약점 관리](../security/VULNERABILITY-MANAGEMENT.md), [이슈와 해결 기록](../issues/ISSUES.md)
- [API·MQTT 계약](../protocol.md), [배포·접속·복구 안내](../../deploy/README.md)

영상과 PPT의 생성 소스·원본 음성·화면·검수 기록을 각 결과물 폴더에 함께 제공한다. PPT의 상대 영상 링크를 유지하려면 `artifacts/presentation`과 `artifacts/video`를 함께 둔다. 비밀정보와 SQLite 백업은 공개 저장소에서 제외하며 기존 로컬 private 경로와 k3s 영속 볼륨에 보존한다.

## 실행 버전과 복구

정확한 앱 소스는 `40b9ed898f32037e7a87259d12d145457575a4a8`, 이미지 digest는 `sha256:234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876`이다. `stable-runtime-v1.7.1-40b9ed8`은 실행 소스를, `stable-final-20260921`은 최종 선택 매니페스트를 담은 동결 체크포인트를 가리킨다. 이후 인도 문서 커밋과 구분한다.

[최종 매니페스트](../../artifacts/releases/final-20260921.json)는 동일 스냅샷으로 현재·이전 버전 복원 검증을 통과한 `5ff34f3e…` 백업을 선택한다. 추가 `ee980470…` 백업은 생성 검증을 마쳤으나 새 복원 시험이 시간 내 끝나지 않아 최종 복구 근거로 승격하지 않았다. 운영 버전은 이미 검증된 1.7.1을 유지했다.

작업용 터널과 관측 프로세스는 종료했고 k3s 서비스는 계속 실행된다. 접속할 때 [배포 안내](../../deploy/README.md)의 localhost 포트포워드를 열고 기존 private 인증정보를 사용한다.

## 시간과 인도 범위

원래 작업 시간은 2026-09-21 17:07:33부터 2026-09-22 07:07:33 KST까지다. 새 기능은 마지막 30분에 동결했으며 영상·PPT 제작과 검수, 요구사항 검토, 소유 프로세스 정리를 원래 시간 안에 수행했다.

마지막 추가 근거 커밋은 07:07:58 KST에 로컬 생성되어 원래 마감을 넘겼고, 당시 push는 실행 전에 차단됐다. [당시 인계 기록](../../artifacts/delivery/deadline-handoff.json)을 보존한다. 이후 사용자의 **“네, 마무리 해주세요”** 승인에 따라 최종 자료와 인계 기록의 원격 전달만 재개했다. [추가 승인 범위](../../artifacts/delivery/authorized-closeout/authorization.json)를 따르며 원래 시각을 연장하거나 새 개발·재배포를 수행하지 않는다. 최종 원격 전달 결과는 같은 폴더의 실행·검증 기록으로 확인한다.

## 검증 범위와 잔여 사항

198개 요구사항의 근거는 기능 검증 145개, 명시된 로컬 검증 53개로 구분한다. 실제 k3s·MQTT·재시작·백업 복원 근거와 로컬 시험 범위를 합쳐 표현하지 않는다. 새 인도 점검은 기존 결과물의 동일성·패키징과 현재 배포 식별을 확인한다.

실제 외부 VPP/AWS 연결은 미검증이다. 미해결 취약점, 관측 중 연결 단절과 원인 미확정 이슈를 해당 관리 문서에 보존했다. 한국어 음성 트랙·자막·전사·화면 일치 검증과 직접 청취에 의한 자연스러운 발음 검증은 구분하며, 직접 청취를 했다고 주장하지 않는다. 단일 노드 SQLite 배포는 노드 상실에 대한 고가용성 구성이 아니다.

과거 감사 참조를 다시 대조하여 11개 역사 버전을 Git 원문으로 확인했다. 원문을 회수하지 못한 세 초기 참조는 [증거 정합성 보완](../product/POST-DEADLINE-EVIDENCE-RECONCILIATION.md)에 명시하고 해당 요구의 최신 실행·역할 증거를 별도로 연결했다. 누락된 과거 바이트가 검증됐다고 표시하지 않는다.
