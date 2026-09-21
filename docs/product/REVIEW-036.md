# 제품 검토 036 — 1.7 미디어 리허설 독립 범위 검토

artifacts/checkpoints/media-candidate17의inventory32개와원래리허설source-snapshot43개SHA를직접대조했다. review-summary의recorder58112 exit0,255.33초영상/279.911초제작,전체decode,32SRT와원고·타임라인검토기록은준비증거다. 청취하지않았으며오디오signal/디코딩을발음·청취검수로표현하지않는다.

추가3프레임(list-status-subtitle/command-completed/receipt)을직접열어검토했다. 한글자막은“목록의마지막확인시각은브라우저조회시각이며명령완료시각과다르다”라고정확히구분한다. 같은화면의명령목록조회성공/브라우저시각·MQTT set_target completed125/125·REST set_limit receipt completed와저장상태확인·export버튼을볼수있다. stop행은superseded이며완료로설명하지않는다. 자막이하단의옛행일부를덮지만핵심MQTT완료행/목록상태는가리지않는다. 전프레임또는전체8장면을새로검수했다는주장은아니다.

상단제작리허설표시와실제선택RTU ddc8edb7를확인했다. 새로운목록안내는정상성공흐름만촬영했고HTTP실패fixture는영상에없다. 별도MQTT통신장애와목록GET오류/SSE를같은시험으로표현하지않는다. review-summary의복구는소유RTU 설정일치·기존7개설정불변이며과거난수/출력궤적의완전복구가아니다. 원격KMA/AWS/운영VPP성공을주장하지않는다.

판정: 보존된리허설자료와위대표프레임의주장범위는일관된다. 현재/하위복원이나정확한최종배포인수,최종동결창영상/PPT는이자료로승격하지않는다. UI13/AT04와원장을변경하지않았으며 REVIEW036만추가했다. 최종새영상의내용·청취·전체슬라이드검수는여전히별도필수다.
