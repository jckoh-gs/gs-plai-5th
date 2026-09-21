# 제품 검토 007 — IDEA005 기능완료,1.1.0 승격대기

배포8599ab92af7f884871b7f7f89a0baf3b253d300a/digest07f968cc6e5a11d31c9a1f2d55b287c19cac7f11574925b58004745dae396420/PRD1.8 확인. 동일image71unit/integration/advanced, 인증APIhybridkWh/UTC/KST/무생성/원문비반사, 실제브라우저늦은성공/오류버림·4입력무효화·파일읽기경합·중복버튼·좁은화면 검증PASS. FR-PREVIEW01/UI08와 인수01~03은 기능검증으로 승격.

추가방어: CSV/TSV128열 제한, 민감원문을 포함하지 않는 CSV/JSON오류,20MiB초과파일 read전거절 및 파일읽기중preview/등록차단. 기존최대행/단위/보간 의미 변경없음. 테스트dataset-preview-security 및 browser race와 연결되며 PRD편집은 메인검토 후 별도반영 가능하다. 현재검토는 productdocs만 편집해 런타임/PRD배포동일성을 건드리지 않았다.

남은현재버전게이트: 진행중outboxpodrestart의 실제결과,1.1.0일관backup 별도복원UI/MQTT/원본데이터, 같은backup의1.0.0역호환복원,1.1.0stablemanifest/태그/해시검증. 빈 outbox-restart.log를 성공으로 보지 않았다. 이어14시간 운영/정상기준유지/최종30분영상→PPT검수와인도. 신규아이디어는추가하지 않는다.
