# 제품 검토008 —1.1.0 정상checkpoint

manifest의244개 evidence파일 SHA를 독립 대조해 모두 일치했다. stable-runtime-v1.1.0-8599ab9 annotated태그를 commit으로 peel한 결과8599ab92af7f884871b7f7f89a0baf3b253d300a이다.105144320byte backup/SHA29071fdc6a800e7b173aeaa49c45a6f4f83b0dacbaf5e6594f1ea66864c21879,현재1.1복원/1.0역호환UI/MQTT/원본5단지·시나리오,실제pod outbox교체증거 확인. IDEA005 및 stable/restore/manifest 게이트 기능완료.

잔여실제기능결함은 발견하지 않았다. 다만 엄격한증거 기준상 NFR02 느린SSE소비자 동안 수집무손실은 backpressure소스와 정상/중단브라우저시험의 간접근거이며 직접느린reader 부하시험은 없다. AT-UI01 빈DB3demo→동일DBrestart중복없음도 분리된 관측을 모은 것으로 전용assertion은 없다. 이 두 조건의 좁은자동검증을 권고한다. 새기능은필요없다.

계속남는것: NFR08 최종인도문서/산출물 일치, FR-FAULT02 최종시연정리, OPS01/02 및 AT-OPS01/03 장기운영·역할의 실제마감기록, 최종30분영상/PPT 생성·전체검수·인도. 현재준비영상은 최종영상이 아니다. manifest는 변경하지 않았으며 이검토의 새acceptance자료는checkpoint이후 갱신기록이다.
