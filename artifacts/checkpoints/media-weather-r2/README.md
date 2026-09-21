# 내레이션/시연 revision2 준비 검수

제품1.7.1의 기상 조작 시연 준비다. 최종 영상·배포 증거가 아니며 최종 창의 새8장면 녹화를 대체하지 않는다. 메인 배포3104/18884는 조작하지 않았다.

`attempt1-failed`는 실제 CSV 기상 열이 공개 API의 관측값을 덮어쓰므로 복원 검증이 실패한 첫 실행을 보존한다. 실패 journal/DB/rawvideo를 수정하지 않았다. 기존2RTU/제어projection은 일치했지만 weather 비교만 달랐고, 최종MP4/통과receipt는 생성되지 않았다.

`round2-passed`는 실제제출한 기상열없는 전용CSV로 새RTU를201등록한 두 번째 실행이다. 메인의 helper가 CSV허용헤더/기상overlay없음/정상수치/독립일사없음을 검증한 baseline만 복원 대상으로 인정했다. CSV500→수동기상14/90/300/22→가용·실제651.8→CSV500과입력8/240/650/22를 관측했다. mode/입력복원은 통과했지만 출처default는manual로 바뀌며 이를 과거출처복원이라고 주장하지 않는다.

131.13초 집중영상(3장면) 실제제작142.685초,전체decode/PASS/평균-18.5dB. 4개encodedframe을 직접 이미지로 검수했다. 기상/CSV복귀 화면은3D,출력,기상입력,마우스가 모두 보이고 기상출처 자막은 읽을 수 있다. JSON의visualReview 문자열을 최종 인수 판정으로 사용하면 안 된다.

별도후속MQTT실행은 영상 종료 후 동일RTU로125kW를 요청하여accepted/executing/completed,actual125,error0를 확인했다. 이 명령을 집중영상에서 촬영했다고 주장하지 않는다. 같은 journal로 다시 설정복원/PASS/weatherMatchedtrue/기존3RTU불변을 확인했다. 전용3113 fixture는SIGTERM 뒤실제exit0으로종료했고DB와journal은private에남겼다.

새r2날씨문장은별도AIFF-ASR와두번째실제MP4-ASR로검수했다. 수동기상/출력변화/CSV복귀/manual출처유지/접수≠완료는전사에있지만조사·서버/대시보드/휠등인식차이가남는다. 직접청취false이며자연스러운발음통과가아니다. 14개SRT문장과원고/cue시간은일치한다. 집중영상131초중음성스트림94.273초이며뒷부분은조작·안정대기를위한무음이다.

## 최종 창 관측 재사용

`round2-passed/observe.py`는 이번 고유경로를 보존한 실제읽기전용 실행소스다. 그대로 재실행하면기존파일을거절한다. 최종용으로는 별도사본에서 config/token/output를새최종경로로지정하고원래deadline-command.py 감독하에실행한다. 토큰은파일에서읽고출력하지않는다. 실제등록명으로고유ownRTU를찾아0.5초마다mode/weather/source/generators/최신history를기록한다. recorder가실제로terminal이되면관측을끝내고원본관측SHA를보존한다(verification파일발견만으로terminal을추정하지않음).

관측의observedAt과실제scenes.recordingStartedAt+lead를사용해651.8안정구간과CSV500복귀구간의encodedframe시간을구한다. 최종장면의실제입력/결과가다르면값을지어맞추지말고실제증거를기록한다. 최종원고/씬/캡처/manifest/videoSHA와관측SHA를같은근거에연결한다. 이번준비관측이나MQTTreport를최종영상의실행증거로복사하지않는다.

변경된장면과후속125MQTT가검증되어지금전체8장면을반복할필요는없다고판단했다. 최종전체길이는종전255.33초+36초≈291.33초의추정이며실측값이아니다. 최종8장면새녹화·ASR·14장PPT·검수는원래21:37:33~22:07:33UTC창에서별도로수행한다.
