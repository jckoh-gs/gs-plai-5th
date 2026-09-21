const fs=require('node:fs');
module.exports=function({baseUrl,tokenFile,mqtt,names,csvFile,rehearsal=true,preview=false}){
const c=JSON.parse(fs.readFileSync('scripts/media/scenes-template.json'));c.baseUrl=baseUrl;if(tokenFile)c.tokenFile=tokenFile;else delete c.tokenFile;c.mqtt=mqtt;
const click=name=>({type:'click',role:'button',name}),nav=name=>({type:'click',role:'link',name}),fill=(label,value)=>({type:'fill',label,value}),select=(label,value)=>({type:'select',label,value}),wait=ms=>({type:'wait',ms});
const deploymentNarration=[c.scenes[0].narration,c.scenes[4].narration,c.scenes[7].narration];
c.scenes[0].narration='이 영상은 제작 과정을 확인하는 리허설입니다. 로컬 가상 데이터로 실제 화면을 조작합니다. GRID는 외부 VPP의 데이터 수집과 제어 경로를 시험하며 실물 설비나 시장 입찰은 다루지 않습니다.';
c.scenes[0].actions=[nav('통합 대시보드'),{type:'click',selector:`.plant-card:has(h3:text-is("${names.wind}"))`},wait(1500)];
c.scenes[1].actions=[{type:'click',selector:'header button'},fill('단지명',names.hybrid),select('발전 유형','hybrid'),fill('발전기 수 (기)',2),fill('1기 정격 (kW)',500),fill('램프 (kW/s)',25),{type:'upload',label:'발전 CSV / TSV 파일',file:csvFile},wait(2000),{type:'capture',name:'csv-registration'},click('RTU 등록 · 수집 시작'),wait(2500)];
c.scenes[2].actions=[{type:'focus',selector:'.scene canvas'},{type:'drag',selector:'.scene canvas',from:[.4,.5],to:[.65,.55]},{type:'scroll',y:-140},wait(1500),{type:'capture',name:'hybrid-camera'},{type:'click',selector:`.plant-card:has(h3:text-is("${names.wind}"))`},wait(2000),{type:'click',selector:`.plant-card:has(h3:text-is("${names.solar}"))`},wait(2000),{type:'click',selector:`.plant-card:has(h3:text-is("${names.hybrid}"))`},{type:'range',selector:'#limit',value:80},click('출력 상한 적용'),wait(2000),{type:'click',selector:'.dashboard-bottom .button.danger'},wait(2000),{type:'click',selector:'.dashboard-bottom .button-row button:first-child'},wait(3000),{type:'range',selector:'#limit',value:100},click('출력 상한 적용')];
c.scenes[3].actions=[nav('RTU 디바이스'),fill('RTU 이름 또는 ID 검색',names.hybrid),{type:'focus',text:'연결 · 전송'},{type:'scroll',y:350},wait(2500)];
c.scenes[4].narration='별도 MQTT 클라이언트로 백이십오 킬로와트를 요청합니다. 수락과 실행을 거쳐 실제 출력이 목표에 도달하면 완료 상태를 받습니다. 화면의 MQTT 출처와 목표 및 실제 값을 확인합니다. 이 결과는 실제 로컬 브로커에서 관측한 값입니다.';
c.scenes[4].actions=[nav('시험 시나리오'),click('재생·장애 시험'),fill('지연 (ms)',1500),click('장애 적용'),click('목표값·처리 결과'),{type:'focus',text:'명령 처리 결과'},{type:'dispatch',rtuId:'selected',targetKw:125,timeoutSeconds:20},wait(2500),{type:'assert',text:'125 / 125'}];
c.scenes[5].actions=[click('재생·장애 시험'),{type:'click',label:'MQTT 연결 단절'},click('장애 적용'),wait(5000),nav('RTU 디바이스'),{type:'focus',text:'연결 · 전송'},wait(2000),nav('시험 시나리오'),click('재생·장애 시험'),click('모든 장애 해제'),wait(2000),{type:'click',label:'센서 수집 중지'},click('장애 적용'),wait(2500),click('모든 장애 해제')];
c.scenes[6].actions=[select('재생 배속','2'),fill('난수 시드',777),click('재생 설정 적용'),click('일시정지'),wait(1500),click('재생'),select('재생 배속','1'),click('재생 설정 적용'),click('저장 시나리오'),fill('시나리오 이름',names.scenario),click('현재 상태 저장'),wait(1000),{type:'click',selector:`.scenario:has(h3:text-is("${names.scenario}")) button:first-child`},wait(1500),nav('연동 가이드'),click('SCADA 데이터'),wait(1500),click('목표값·결과'),wait(1500)];
c.scenes[7].narration='이 리허설은 로컬 동작과 제작 도구를 확인했습니다. 최종 영상은 동결한 케이쓰리에스 버전으로 새로 녹화합니다. 최종 발표자료와 영상은 같은 릴리스 증거를 사용하며 실제 외부 VPP와 클라우드 미검증 범위를 명시합니다.';
c.scenes[7].actions=[nav('통합 대시보드'),{type:'focus',selector:'.scene canvas'}];

if(!rehearsal){c.scenes[0].narration=deploymentNarration[0];c.scenes[4].narration=c.scenes[4].narration.replace('실제 로컬 브로커','실제 배포 브로커');c.scenes[7].narration=deploymentNarration[2];}
if(preview){const at=c.scenes[1].actions.findIndex(a=>a.type==='capture');c.scenes[1].actions.splice(at,0,click('CSV 해석 미리보기'),{type:'assert',label:'CSV 해석 미리보기 결과'},{type:'focus',label:'CSV 해석 미리보기 결과'},wait(2500),{type:'capture',name:'csv-preview'});c.scenes[1].narration='CSV 또는 TSV를 넣고 해석 미리보기로 시각과 단위, 정규화 출력을 먼저 확인합니다. 미리보기는 RTU를 만들지 않습니다. 실제 등록 때 다시 검증하고 일 초 단위 수집을 시작합니다. 원본 전류와 추정 전류도 구분합니다.';}
return c;
};
