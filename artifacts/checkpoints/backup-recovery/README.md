# 백업 중단·재전송 운영 검증

ISSUE-018의 네트워크 무기한 대기와 미완성 최종 파일명 문제를 수정했다. 원래 run deadline과180초 작업 예산, 요청별 timeout, private journal, 완료 후 snapshot 공개, 별도 압축 경로, chunk/전체 해시 및 SQLite 무결성 검증을 적용했다. 코드와 소스 해시, 격리10개 시험 및 독립 이슈·보안 검토를 연결한다. 제품 runtime83d10ce와 기존 stable manifest는 변경하지 않았다.

11:32 새 정상 snapshot335704064바이트를 생성·검증했다. 압축11293999바이트의 최초256KiB 전송은44묶음/66.274초였다. 이후1MiB 묶음으로 동일 immutable snapshot을 다시 전송하여11묶음/26.960초, 동일 SHA256·무결성·Ready Pod를 확인했다. 두 실행은 동일한 부하 조건의 성능 벤치마크가 아니고 두 번째에는 snapshot 생성이 포함되지 않는다. 실제 확인된 전송 결과이며 미래 소요시간을 보장하지 않는다. 첫 로컬 전송본도 previous-transfer 파일로 보존했다.

원격 snapshot과 로컬 DB는 private 경로에만 있고 공개 증거에는 본문을 포함하지 않는다. `deploy/verification/backup-recovery-20260921T1133.json`과 `backup-recovery-1m-20260921T1135.json`이 각각 실제 결과다. 기존 stable backup을 대체하거나 최종 동결 backup으로 표시하지 않는다. 이 snapshot을 격리 앱으로 복원한 증거는 아직 없으며 이번 범위는 온라인 생성·전송·SHA·SQLite 무결성이다.

별도 관측으로11:34:05.722Z 로컬 연결 검증 실패와11:34:07.371Z 자동 복귀가 있었다. 강제 중단 없이 수정 supervisor의 시각 기록이 실제로 실행되었으며 원문 primary/RTU/supervisor 구간을 보존했다. 원인은 미확정이고 백업과의 인과관계를 주장하지 않는다. 동일 원격 Pod/Ready와 이후5개RTU 수신을 관측했으며 invalid·관측 샘플 불연속은0이다. 무중단·완전 무손실 증명으로 확대하지 않는다.

동기 SQLite와 파일I/O는 실행 중간에 강제 중단할 수 없고, 로컬 kubectl 종료가 원격 프로세스 종료를 보장하지 않는다. 마감 검사는 완료 공개 직전에 수행하지만 검사와 파일 쓰기는 별도 연산이다. 실패 stdout/stderr는 DB의 base64 본문을 포함할 수 있어 출력하지 않는다.
