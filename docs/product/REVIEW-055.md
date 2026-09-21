# REVIEW-055 — 준비 길이와 기상 슬라이드 의미 정정

final-pending-gates의290초를음성길이로읽을수있는표현을정정했다. minimumPlannedTimelineSeconds290은장면별하한을포함한계획최소길이이고 actualVoiceSeconds161.6374375는준비음성길이다. 실제최종8장면영상/제작시간은별도실측한다. 다른게이트·판정은변경하지않았다.

현재facts.template의7번슬라이드는sceneIndex2/weather-model-output.png로실제기상조작장면을가리키며,수동입력→발전량변화→CSV입력설정복귀와manual출처유지를명시한다. 최종실제관측으로입력/출력을대조하도록하고default/KMA과거출처복원을주장하지않아 REVIEW052/053 범위와일치한다. 캡처SHA는아직placeholder로최종영상캡처검수를요구한다.6번슬라이드의별도MQTT제어·REST접수/조회와완료의차이는유지되어문구충돌이없다.

reviewed=false/preparationTemplate=true를확인했다. 이것은원고/캡처선택의의미검토이며최종PPT·전체내용검수·인수승격이아니다. 제작소스는수정하지않았다.

읽은facts.template.json SHA256: `2e65175ff2251649e7262da89964a0a35b51d180ed7156b067f24df8fb576668`.
