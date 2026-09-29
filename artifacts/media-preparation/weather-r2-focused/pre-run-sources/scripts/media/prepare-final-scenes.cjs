// Read-only release binding and scene configuration; actual mutations occur visibly in the recorder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const input=JSON.parse(fs.readFileSync(process.argv[2])),run=JSON.parse(fs.readFileSync('docs/operations/run.json'));
 if(Date.now()<Date.parse(run.freezeAt)||Date.now()>Date.parse(run.deadlineAt))throw Error('Final scene binding is restricted to the frozen final window');
 const output=input.scenesOutput||'artifacts/media-preparation/final-scenes.json';if(fs.existsSync(output))throw Error('Refusing to overwrite existing scene configuration; reconcile its journal first');
 const manifest=JSON.parse(fs.readFileSync(input.releaseManifest));
 require('./release-binding.cjs')(input,manifest,run);
 const headers=input.tokenFile?{Authorization:'Bearer '+fs.readFileSync(input.tokenFile,'utf8').trim()}:{};
 const response=await fetch(input.baseUrl+'/api/state',{headers,signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error('Cannot read release state');const state=await response.json();
 if(state.version!==manifest.productVersion)throw Error('Running API version differs from release manifest');
 const wind=state.plants.find(p=>p.type==='wind'),solar=state.plants.find(p=>p.type==='solar');if(!wind||!solar)throw Error('Verified deployment needs one wind and one solar plant for scene selection');
 const unique=crypto.randomUUID(),label='최종 시연 '+new Date().toISOString().replace(/[:.]/g,'-')+' '+unique.slice(0,8);
 const names={wind:wind.name,solar:solar.name,hybrid:label+' 복합',scenario:label+' 저장'};
 if(Object.values(names).some(n=>/["\\]/.test(n)))throw Error('Scene names need selector-safe labels');
 const features=require('./release-features.cjs')(manifest.productVersion);
 const lifecycle={journalPath:path.resolve(input.demoJournalPath||'artifacts/private/demo-'+unique+'.json'),registration:{name:names.hybrid,type:'hybrid',count:2,ratedKw:500,rampKwPerSec:25}};
 const life=require('./demo-lifecycle.cjs').createLifecycle({baseUrl:input.baseUrl,tokenFile:path.resolve(input.tokenFile),journalPath:lifecycle.journalPath,deadlineAt:run.deadlineAt,runId:run.runId,productVersion:manifest.productVersion});await life.begin();
 const c=require('./scene-plan.cjs')({baseUrl:input.baseUrl,tokenFile:input.tokenFile,mqtt:input.mqtt,names,csvFile:input.csvFile,rehearsal:false,lifecycle,...features});
 Object.assign(c,{releaseManifest:input.releaseManifest,approvedReleaseCommit:input.approvedReleaseCommit,approvedImageDigest:input.approvedImageDigest,outputDir:input.outputDir||'artifacts/video',preparationTemplate:false});
 fs.writeFileSync(output,JSON.stringify(c,null,2),{flag:'wx'});console.log(JSON.stringify({output,version:state.version,features,journalPath:lifecycle.journalPath,recovery:'After confirming the recorder tool handle has stopped: node scripts/media/recover-demo.cjs <journalPath> <absolute tokenFile>'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
