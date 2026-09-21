// Artifact consistency inventory. This does not replace functional or human review.
import {readFileSync,existsSync,readdirSync,lstatSync,mkdirSync,writeFileSync,createReadStream} from 'node:fs';
import {resolve,relative,join,dirname,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const args={};for(let i=2;i<process.argv.length;i+=2){if(!['--manifest','--video-dir','--deck-dir','--report'].includes(process.argv[i])||!process.argv[i+1])throw Error('Usage: verify-delivery.mjs --manifest PATH [--video-dir PATH] [--deck-dir PATH] [--report NEW_PATH]');args[process.argv[i]]=process.argv[i+1];}
if(!args['--manifest'])throw Error('Choose the verified final manifest explicitly');
const root=process.cwd(),videoDir=resolve(args['--video-dir']||'artifacts/video'),deckDir=resolve(args['--deck-dir']||'artifacts/presentation');
const failures=[],files=new Map(),checks=[];
const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)failures.push(name);};
const sha=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
const inside=(base,p)=>{const rel=relative(resolve(base),resolve(p));return rel!== '..'&&!rel.startsWith('../')&&!isAbsolute(rel);};
async function file(p){p=resolve(p);if(files.has(p))return files.get(p);const rel=relative(root,p);if(!existsSync(p)){check('Required file: '+rel,false);files.set(p,null);return null;}const s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()){check('Regular artifact file: '+rel,false);return null;}const entry={path:rel,bytes:s.size,sha256:await sha(p)};files.set(p,entry);check('Nonempty file: '+rel,s.size>0);return entry;}
async function json(p){if(!await file(p))return null;try{return JSON.parse(readFileSync(p,'utf8'));}catch{check('Valid JSON: '+relative(root,resolve(p)),false);return null;}}
async function tree(dir){if(!existsSync(dir)){check('Source directory: '+relative(root,dir),false);return;}for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())await tree(p);else await file(p);}}
const manifest=await json(args['--manifest']),run=await json('docs/operations/run.json');
if(!manifest||!run)throw Error('Readable release manifest and run ledger are required');
const manifestHash=(await file(args['--manifest'])).sha256;
for(const p of ['README.md','docs/GOAL-VPP-AUTONOMOUS.md','docs/PRD-VPP-SCADA-RTU.md','docs/product/PRD-CHANGELOG.md','docs/product/IDEAS.md','docs/product/acceptance.json','docs/protocol.md','scripts/vpp-client.js','scripts/client-message.js','deploy/README.md','deploy/app.yaml','docs/security/VULNERABILITY-MANAGEMENT.md','docs/issues/ISSUES.md','docs/operations/DELIVERY-PLAN.md'])await file(p);
check('Manifest belongs to current run',manifest.runId===run.runId);
check('Manifest matches recorded runtime',manifest.deployment.appImage===run.deployment.appImage&&manifest.runtimeIdentity.commit===run.deployment.sourceCommit);
const backup=manifest.backup;if(backup?.localPath&&existsSync(backup.localPath))check('Private backup hash matches manifest',await sha(backup.localPath)===backup.sha256);else check('Private backup available for handoff',false);
// Private backup contents/credentials are never copied into the public inventory.
const video=await json(join(videoDir,'verification.json')),deck=await json(join(deckDir,'verification.json'));
for(const name of ['GRID-VPP-demo-ko.mp4','GRID-VPP-demo-ko.srt','narration-ko.md','scenes.json','source/recording-config.original.json','source/reproduction.json','source/release-binding-proof.json'])await file(join(videoDir,name));
for(const name of ['GRID-VPP-presentation-ko.pptx','speaker-notes.md','validation.json','reproduction-manifest.json','source/config.original.json','source/config.portable.json','source/build-deck.mjs','source/REGENERATE.md'])await file(join(deckDir,name));
const digest=value=>typeof value==='string'?value.match(/(?:^|@)(sha256:[a-f0-9]{64})$/)?.[1]:null;
const expectedDigest=digest(manifest.deployment.appImage);check('Release has a valid immutable image digest',!!expectedDigest);
const window=stamp=>Number.isFinite(Date.parse(stamp))&&Date.parse(stamp)>=Date.parse(run.freezeAt)&&Date.parse(stamp)<=Date.parse(run.deadlineAt);
if(video){
 check('Video is final and reviewed',video.rehearsal===false&&video.fullDecode===true&&video.visualReview==='passed'&&video.claimsReview==='passed');
 check('Video uses same release and image',!!expectedDigest&&video.releaseCommit===manifest.source.commit&&video.manifestSha256===manifestHash&&digest(video.imageDigest)===expectedDigest);
 const mp4=await file(join(videoDir,'GRID-VPP-demo-ko.mp4'));check('Actual MP4 matches reviewed hash',mp4?.sha256===video.videoSha256);
 check('Video was completed during final window',window(video.createdAt));
 check('Video declares required format and audible track',video.dimensions==='1920x1080'&&video.codecs==='H264/AAC'&&Number.isFinite(video.audioMeanDb)&&video.duration>0);
 check('Representative frames recorded',Array.isArray(video.frames)&&video.frames.length>=3);
 for(const p of video.frames||[]){check('Frame stays in video package',inside(videoDir,p));if(inside(videoDir,p))await file(p);}
}
if(deck){
 check('Deck is final, editable, fully rendered and reviewed',deck.rehearsal===false&&deck.renderedEverySlide===true&&deck.editableTextAndArchitecture===true&&deck.visualReview==='passed'&&deck.claimsReview==='passed');
 check('Deck uses same release',deck.releaseCommit===manifest.source.commit&&deck.manifestSha256===manifestHash);
 check('Deck follows video within final window',window(deck.createdAt)&&video&&Date.parse(deck.createdAt)>=Date.parse(video.createdAt));
 check('Deck has 12 to 15 slides',Number.isInteger(deck.slideCount)&&deck.slideCount>=12&&deck.slideCount<=15);
 if(Number.isInteger(deck.slideCount)&&deck.slideCount>=12&&deck.slideCount<=15)for(let i=1;i<=deck.slideCount;i++)await file(join(deckDir,`slide-${String(i).padStart(2,'0')}.png`));
 const receipt=await json(join(deckDir,'validation.json')),ppt=await file(join(deckDir,'GRID-VPP-presentation-ko.pptx'));check('Actual PPTX matches validated package',!!receipt&&ppt?.sha256===receipt.finalSha256);
 const copiedVideo=await json(join(deckDir,'source/video-verification.json')),mp4=await file(join(videoDir,'GRID-VPP-demo-ko.mp4'));
 check('Deck was made from this exact reviewed video',!!copiedVideo&&!!mp4&&copiedVideo.rehearsal===false&&copiedVideo.visualReview==='passed'&&copiedVideo.claimsReview==='passed'&&deck.videoSha256===mp4.sha256&&copiedVideo.videoSha256===mp4.sha256&&copiedVideo.manifestSha256===manifestHash&&copiedVideo.releaseCommit===manifest.source.commit);
 const config=await json(join(deckDir,'source/config.original.json'));if(config){const ref=config.videoRelativePath||'../video/GRID-VPP-demo-ko.mp4';check('Portable notes video link targets actual MP4',!isAbsolute(ref)&&!/^[a-z]+:/i.test(ref)&&resolve(deckDir,ref)===join(videoDir,'GRID-VPP-demo-ko.mp4'));}
}
for(const [base,p,key]of [[deckDir,'reproduction-manifest.json','files'],[videoDir,'source/reproduction.json','files']]){
 const data=await json(join(base,p));if(data){
  const entries=Array.isArray(data[key])?data[key]:[];check('Reproduction inventory is nonempty: '+p,entries.length>0);
  for(const entry of entries){if(typeof entry.path!=='string'){check('Reproduction path is a string',false);continue;}const target=resolve(base,entry.path);check('Reproduction asset stays in package',inside(base,target));if(inside(base,target))check('Reproduction hash: '+entry.path,(await file(target))?.sha256===entry.sha256);}
  const recorded=new Set(entries.map(e=>e.path));
  if(base===deckDir){
   check('Exact deck configuration hash',(await file(join(base,'source/config.original.json')))?.sha256===data.exactConfigSha256);
   const config=await json(join(base,'source/config.original.json'));
   const required=['source/config.original.json','source/config.portable.json','source/build-deck.mjs','source/release-manifest.json','source/video-verification.json','docs/operations/run.json','validation.json',...(config?.slides||[]).flatMap((s,i)=>s.image?[`source/assets/slide-${String(i+1).padStart(2,'0')}.png`]:[])];
   check('All required deck regeneration sources are inventoried',required.every(p=>recorded.has(p)));
  }else{
   check('Exact recording configuration hash',data.recordingConfig==='source/recording-config.original.json'&&(await file(join(base,data.recordingConfig)))?.sha256===data.recordingConfigSha256);
   const required=['scripts/media/record-demo.cjs','scripts/media/recording-sources.cjs','scripts/media/release-binding.cjs','scripts/media/release-features.cjs','scripts/media/validate-command-download.cjs','scripts/media/scene-plan.cjs','scripts/media/prepare-final-scenes.cjs','scripts/verify-release.mjs','scripts/pod-identity.mjs','scripts/vpp-client.js','scripts/client-message.js','package.json','package-lock.json'].map(p=>'source/code/'+p);
   check('All required recorder sources are inventoried',required.every(p=>recorded.has(p)));
   const config=await json(join(base,'source/recording-config.original.json'));
   const inputs=(config?.scenes||[]).flatMap(s=>(s.actions||[]).filter(a=>a.type==='upload').map(a=>a.file));
   check('All used recording input assets are inventoried',inputs.every(p=>entries.some(e=>e.source===p)));
   const proof=await json(join(base,'source/release-binding-proof.json'));check('Recorder observed verified remote image identity',proof?.result==='PASS'&&proof?.remoteImageMatched===true);
  }
 }
 await tree(join(base,'source'));
}
const report={schemaVersion:1,checkedAt:new Date().toISOString(),result:failures.length?'INCOMPLETE':'ARTIFACT_CHECKS_PASSED',completionClaim:false,claimBoundary:'Checks recorded evidence, file identity and packaging only. Functional acceptance, actual decoding, each-slide visual/claims review, live deployment and final operation gates must be assessed separately.',runId:run.runId,productVersion:manifest.productVersion,releaseCommit:manifest.source.commit,runtimeCommit:manifest.runtimeIdentity.commit,manifestSha256:manifestHash,backup:{path:backup?.localPath,sha256:backup?.sha256,excludedFromPublicFiles:true},checks,failures,files:[...files.values()].filter(Boolean)};
if(args['--report']){const p=resolve(args['--report']);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify({result:report.result,files:report.files.length,failedChecks:failures.length,failures,report:args['--report']||null,completionClaim:false}));if(failures.length)process.exitCode=1;
