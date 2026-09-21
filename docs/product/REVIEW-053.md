# REVIEW-053 — 기상 시연 revision2 집중 준비 인수

media-weather-r2 inventory80개 모든파일 SHA가 일치했다. round2의 실제actions/장면·원고·관측JSONL·복구·후속MQTT·출처스냅샷, 현재scene-plan/demo-lifecycle 및 기상열없는전용CSV를 읽었다. 새시험/원격/코드변경은 없다.

기록에서소유복합RTU의CSV500→수동기상14m/s·90°·300W/m²·22°C의가용/실제651.8→CSV500 및입력8/240/650/22복귀를대조했다. 실제JSONL에weather651.8일치표본10개와csv500표본119개가있다. 초기램프구간을즉시500이라고간주하지않는다. scene-plan은소유RTU의기상적용을mutating guard에포함하며 lifecycle은등록시실제제출CSV에기상overlay가없고별도일사가없는검증baseline만복구한다. 영상정상복구와후속명령복구 모두PASS/weatherConfigurationMatchedtrue,기존3RTU해시불변이다. 출처default→manual은복원되지않았음을명시한다.

weather-6518-encoded/csv-500-encoded 두프레임을직접보았다.3D·우측기상입력·포인터와0.652MW/0.5MW출력이같이보이고수동출처유지자막을읽을수있다. 화면반올림0.652와정밀651.8은모순이아니다. 이두정지프레임검수는전체영상직접재생/청취를뜻하지않는다.

첫실패는CSV기상열의공개값overlay로입력복구비교가실패한근거로보존됐고통과MP4를생성하지않았다. 두번째는새CSV·새201소유RTU로131.13초3장면을제작했고production142.685초/전체decode/평균음량기술검사를기록한다. 후속125kW/오차0은**녹화종료후**별도실제MQTT결과이며이집중영상에찍힌것이아니다.3113 fixture는정상종료기록이있다.

초기 weather-demo-recovery-tests-round3.log의16/16은역사적helper검증이다. 최종 weather-demo-recovery-overlay-review.json 및 overlay-round1.log를추가대조해현helper7674e060…의20/20PASS/exit0을확인했다. 실제모델CSVoverlay·누락/중복/기상헤더·별도일사거절과명시적제출baseline복구를검증하며과거16개와합산하지않는다. overlay-review의녹화대기표현은19:09당시이력이고이후round2근거와구분한다. 전용CSV는timestamp/power_kw/voltage/current_a의2행으로기상열이없다. 실제소유등록/오버레이거절·복구가핵심이며시험개수만으로완료하지않는다.

판정: REVIEW052의기상조작·출력변화누락에대해**집중3장면제작준비**의직접근거가생겼다. 기존전체1.7리허설255.33초+증가36초≈291.33초는예상이며새8장면실측아니다. ASR은기술전사이고직접청취false/발음통과아님을유지한다. 최종8장면·새영상/PPT·음성/주장검수는원래최종창에남는다.

최소outbox문구제안: “이 장면에서는 연결을 끊었다가 복구합니다. 같은 메시지의 재시작 후 재전송과 브로커 확인은 별도로 제공하는 검증 기록에서 확인할 수 있습니다.” 선택최종manifest의실제messageId/본문일치/PUBACK근거를화면에명시하면좋다. 짧은offline클립이실제로배치를재전송했다고말하거나PUBACK을외부VPP수신으로표현하지않는다. 새기능·원격재시작을시연에추가할필요는없다.21:37:33Z동결/22:07:33Z종료는불변이다.
