// Rehearsal only: proves Korean editable PPTX export and full-slide rendering.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const modules=process.env.RUNTIME_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const skill=process.env.PRESENTATION_SKILL||'/Users/charleskoh/.codex/plugins/cache/openai-primary-runtime/presentations/26.915.20218/skills/presentations';
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(modules,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const {resolvePresentationFont}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const font=resolvePresentationFont({fontFamily:'Apple SD Gothic Neo'});
const out=path.join(root,'artifacts/media-preparation/presentation-pilot');await fs.mkdir(out,{recursive:true});
const deck=Presentation.create({slideSize:{width:1280,height:720}});
function text(s,value,x,y,w,h,size=32,color='#EAF1E8',bold=false){const shape=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});shape.text=value;shape.text.style={typeface:font,fontSize:size,bold,color,autoFit:'none'};return shape;}
const title=deck.slides.add();title.background.fill='#0B1C15';text(title,'GRID',80,92,1100,100,80,'#C4EE82',true);text(title,'VPP 연동 시험을 위한 가상 현장',80,240,1100,150,48,'#EAF1E8',true);text(title,'SCADA · RTU · MQTT 에뮬레이터',80,430,1100,70,30);text(title,'제작 도구 사전 검증 · 최종 발표자료 아님',80,620,1100,45,22,'#ADBDAC');title.speakerNotes.textFrame.setText('이 파일은 한글 편집·내보내기·렌더링 도구의 사전 점검입니다. 최종 제품이나 배포 성공을 주장하지 않습니다. 최종 발표자료는 검증 버전의 시연 영상 제작 이후 확정합니다.');
const diagram=deck.slides.add();diagram.background.fill='#0B1C15';text(diagram,'데이터와 제어의 양방향 경로',70,55,1140,80,44,'#EAF1E8',true);
for(const [i,label] of ['SCADA','RTU','MQTT','VPP'].entries()){const box=diagram.shapes.add({geometry:'rect',position:{left:70+i*300,top:260,width:230,height:115},fill:'#1D3827',line:{fill:'#577A51',width:1}});text(diagram,label,85+i*300,285,200,70,38,'#C4EE82',true);if(i<3){text(diagram,'→',310+i*300,280,50,70,40);text(diagram,'←',310+i*300,425,50,70,40);}}
text(diagram,'전체 발전 데이터와 출력 피드백',70,180,1100,60,28);text(diagram,'목표값 → 검증·변환 → SCADA 제어',70,520,1100,65,28);text(diagram,'실물 SCADA 프로토콜과 예측·입찰 알고리즘은 별도 범위',70,635,1140,40,22,'#ADBDAC');diagram.speakerNotes.textFrame.setText('편집 가능한 도형·텍스트로 구성한 구조도 시험입니다. 데이터는 SCADA에서 외부 VPP로, 제어 목표는 반대 방향으로 전달됩니다. 최종 슬라이드에는 실제 영상 타임코드와 검증한 배포 버전을 붙입니다.');
await(await PresentationFile.exportPptx(deck)).save(path.join(out,'pilot.pptx'));
for(let i=0;i<deck.slides.items.length;i++){const slide=deck.slides.items[i];const blob=await deck.export({slide,format:'png',scale:1});await fs.writeFile(path.join(out,`slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));}
await fs.writeFile(path.join(out,'metadata.json'),JSON.stringify({rehearsal:true,font,slideCount:2,createdAt:new Date().toISOString()},null,2));console.log(out);
