// Editable presentation builder; content must come from the verified frozen release.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const modules=process.env.RUNTIME_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const skill=process.env.PRESENTATION_SKILL||'/Users/charleskoh/.codex/plugins/cache/openai-primary-runtime/presentations/26.915.20218/skills/presentations';
process.env.RUNTIME_NODE_MODULES=modules;
const python=process.env.RUNTIME_PYTHON||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const {Presentation,PresentationFile,FileBlob}=await import(pathToFileURL(path.join(modules,'@oai/artifact-tool/dist/artifact_tool.mjs')));
const {resolvePresentationFont,finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const config=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const rehearsal=process.argv.includes('--rehearsal');
if(!rehearsal&&config.preparationTemplate)throw Error('Populate the template and clear preparationTemplate before final authoring');
const videoReference=config.videoRelativePath||'../video/GRID-VPP-demo-ko.mp4';
if(path.isAbsolute(videoReference)||/^[a-z]+:/i.test(videoReference))throw Error('Video reference must be a portable relative path');
const run=JSON.parse(await fs.readFile('docs/operations/run.json','utf8'));
if(!rehearsal&&(Date.now()<Date.parse(run.freezeAt)||Date.now()>Date.parse(run.deadlineAt)))throw Error('Final deck must occur within frozen final 30 minutes');
const manifest=JSON.parse(await fs.readFile(config.releaseManifest,'utf8'));
const manifestHash=crypto.createHash('sha256').update(await fs.readFile(config.releaseManifest)).digest('hex');
if(!rehearsal){const video=JSON.parse(await fs.readFile(config.videoVerification,'utf8'));if(video.rehearsal||!video.fullDecode||video.releaseCommit!==manifest.source.commit||video.manifestSha256!==manifestHash||video.visualReview!=='passed'||video.claimsReview!=='passed')throw Error('Same-release final video must be completed and reviewed first');if(config.slides.some(s=>!s.notes||!/^\d{2}:\d{2}(?:\s*[–-]\s*\d{2}:\d{2})?$/.test(s.timecode||'')||!s.sources?.length))throw Error('Every slide requires notes, actual MM:SS timecode, and source evidence');if(config.slides.some(s=>/기입합니다|삽입합니다|POPULATE/.test(s.body||'')))throw Error('Unresolved content placeholder');if(config.slides.filter(s=>s.image).length<2||!config.slides.some(s=>s.architecture))throw Error('Actual UI captures and editable architecture are required');}
if(config.slides.length<12||config.slides.length>15)throw Error('Expected 12–15 slides');
if(config.rehearsalName&&!/^[a-z0-9-]+$/.test(config.rehearsalName))throw Error('Invalid rehearsal name');
const out=path.resolve(rehearsal?'artifacts/media-preparation/'+(config.rehearsalName||'deck-rehearsal'):config.outputDir||'artifacts/presentation');
const build=path.resolve('artifacts/media-preparation/deck-build-'+Date.now());await fs.mkdir(build,{recursive:true});await fs.mkdir(out,{recursive:true});
const font=resolvePresentationFont({fontFamily:'Apple SD Gothic Neo'});
const deck=Presentation.create({slideSize:{width:1280,height:720}});
function text(s,value,x,y,w,h,size=30,color='#EAF1E8',bold=false){const shape=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});shape.text=value;shape.text.style={typeface:font,fontSize:size,bold,color,autoFit:'none'};return shape;}
for(let i=0;i<config.slides.length;i++){
 const item=config.slides[i],s=deck.slides.add();s.background.fill='#0B1C15';
 text(s,item.title,64,45,1152,92,item.cover?64:44,'#EAF1E8',true);
 if(item.architecture){
  text(s,'발전 데이터와 실제 제어 결과',64,184,1152,52,30);
  for(const [j,label] of ['SCADA','RTU','MQTT','외부 VPP'].entries()){
   s.shapes.add({geometry:'rect',position:{left:64+j*298,top:280,width:230,height:105},fill:'#1D3827',line:{fill:'#577A51',width:1}});
   text(s,label,79+j*298,305,200,60,34,'#C4EE82',true);
   if(j<3){text(s,'→',304+j*298,292,48,50,40);text(s,'←',304+j*298,416,48,50,40);}
  }
  text(s,'목표값 검증과 SCADA 전달',64,491,1152,54,30);
  text(s,item.body||'제조사 프로토콜과 시장 입찰은 별도 범위',64,576,1152,60,25,'#ADBDAC');
 }else if(item.image){
  const blob=await fs.readFile(item.image);s.images.add({blob:new Uint8Array(blob),contentType:'image/png',alt:item.imageAlt||item.title,fit:'contain',position:{left:64,top:158,width:790,height:444}});
  text(s,item.body||'',884,175,332,410,28);
 }else{
  text(s,item.body||'',64,item.cover?245:200,1152,item.cover?260:360,item.cover?40:34,item.cover?'#C4EE82':'#EAF1E8');
 }
 text(s,`${i+1} / ${config.slides.length}`,1130,668,86,30,18,'#ADBDAC');
 if(item.cover)text(s,rehearsal?'제작 준비용 리허설':`제품 ${manifest.productVersion} · ${manifest.source.commit.slice(0,7)}`,64,600,1060,45,24,'#ADBDAC');
 const note=`${item.notes||'준비용 개요. 최종 검증 결과를 기입합니다.'}\n\n시연 영상: ${videoReference}\n관련 시간: ${item.timecode||'최종 녹화 후 확정'}\n근거: ${(item.sources||[]).join(', ')}\n릴리스 커밋: ${manifest.source.commit}\n${rehearsal?'리허설이며 최종 발표자료가 아닙니다.':''}`;
 s.speakerNotes.textFrame.setText(note);
}
const candidate=path.join(build,'candidate.pptx');await(await PresentationFile.exportPptx(deck)).save(candidate);
const finalPath=path.join(out,rehearsal?'rehearsal.pptx':'GRID-VPP-presentation-ko.pptx');
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:config.slides.length,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
// Render the exported final package, not only the pre-export in-memory objects.
const finalDeck=await PresentationFile.importPptx(await FileBlob.load(finalPath));
for(let i=0;i<finalDeck.slides.items.length;i++){const blob=await finalDeck.export({slide:finalDeck.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(out,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));}
await fs.writeFile(path.join(out,'speaker-notes.md'),config.slides.map((s,i)=>`## ${i+1}. ${s.title}\n\n${s.notes||'리허설'}\n\n영상: ${videoReference} (${s.timecode||'미확정'})\n근거: ${(s.sources||[]).join(', ')}`).join('\n\n'));
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({rehearsal,createdAt:new Date().toISOString(),releaseCommit:manifest.source.commit,manifestSha256:manifestHash,slideCount:config.slides.length,renderedEverySlide:true,editableTextAndArchitecture:true,visualReview:'pending',claimsReview:'pending',validationReceipt:path.relative(root,path.join(build,'validation.json'))},null,2));
console.log(JSON.stringify({output:out,slides:config.slides.length,rehearsal,visualReview:'pending'}));
