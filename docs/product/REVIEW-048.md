# REVIEW-048 — 제품1.7.1 소프트웨어 Git 전달 준비 근거

software-delivery-1.7.1/checks·execution·summary JSON 및 ISSUE029 독립 fixture 검토를 읽고 로컬 Git객체/태그/조상관계를 대조했다. 원격 쓰기·새시험·원장/기존리뷰 수정은 없다.

checks.json SHA523fe4093b4008c8fc9402fc7dedbda93a52e391c0902e7c437d3b1c235a4f5a를 직접 계산하여 execution의 stdout.outputSha256 및 summary.checksSha256과 일치시켰다. execution은 원래handle11253의exit0을 기록한다. 저장보고서만 PASS로 보는 대신 이 terminal receipt와 정확출력해시를 함께 사용한다.

source b6c3cbc/runtime40b9ed8, manifest0c9e5bec…와 제품1.7.1이 기존 REVIEW046에 일치한다. 기록된 source188·runtime28·main194개 각각의 Git blob 바이트/길이/SHA와 해당 commit:path를 직접 재대조했다. supplemental4개 README/.env.example/Compose/Mosquitto 설정도 source.commit의SHA와 일치했다. 이는 manifest를 사후 변경한 항목이 아니라 별도 전달보강이다. 샘플3종/package·lock 및 tests63/scripts81이 source 목록에 포함된다. 겹치는 목록을 합산해 고유파일 수라고 표현하지 않는다.

기록된18:32:16.948Z 원격관측 main5afd224, stable-v1.7.1→c9b43bd, runtimealias→40b9ed8은 로컬 정확 peeled 태그와 일치한다. source/runtime가 main/checkpoint의 조상임을 로컬Git으로 독립 확인했다. 이 검토는 원격refs를 다시 조회하지 않았으며 당시의 실제 원격광고 근거와 현재 로컬객체의 일치를 확인한 것이다.

ISSUE029 검토는 임시 실제Git/bare repo fixture18PASS와 두 실패수정 이력을 보존한다. 전체tests트리 누락 거부와 fsync후 마감초과 시 기록파일만으로PASS를 주장하지 못하게 하는 경계를 확인했다. fixture를 운영 원격전달 증거로 바꾸지 않고, 실제 전달은 위 별도 원격관측/exit0/hash 영수증으로 구분한다. 보안검토 링크도 execution에 포함되어 있다.

판정: REVIEW042/047의 소프트웨어 전달 목록 확인 공백은 **현재1.7.1의 준비 관측 범위에서 충족**됐다. 최종 선택 refs/manifest가 확정되면 다시 대조해야 한다. 작업트리 전체동일성·비밀검사·런타임/백업 재검증·최종미디어·역할마감·원래시간 게이트는 이 도구의 범위가 아니다. 기존 불변manifest/태그와 fallback을 보존하며 전체목표 완료를 선언하지 않는다.
