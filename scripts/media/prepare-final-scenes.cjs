// Read-only release binding and scene configuration; actual mutations occur visibly in the recorder.
const fs=require('node:fs');
(async()=>{
 const input=JSON.parse(fs.readFileSync(process.argv[2])),run=JSON.parse(fs.readFileSync('docs/operations/run.json'));
 if(Date.now()<Date.parse(run.freezeAt)||Date.now()>Date.parse(run.deadlineAt))throw Error('Final scene binding is restricted to the frozen final window');
 const manifest=JSON.parse(fs.readFileSync(input.releaseManifest));
 if(input.approvedReleaseCommit!==manifest.source.commit||!/(?:^|@)sha256:[a-f0-9]{64}$/.test(input.approvedImageDigest||''))throw Error('Explicit verified release commit and image digest required');
 const headers=input.tokenFile?{Authorization:'Bearer '+fs.readFileSync(input.tokenFile,'utf8').trim()}:{};
 const response=await fetch(input.baseUrl+'/api/state',{headers,signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Cannot read release state');const state=await response.json();
 if(state.version!==manifest.productVersion)throw Error('Running API version differs from release manifest');
 const wind=state.plants.find(p=>p.type==='wind'),solar=state.plants.find(p=>p.type==='solar');if(!wind||!solar)throw Error('Verified deployment needs one wind and one solar plant for scene selection');
 const label='최종 시연 '+new Date().toISOString().replace(/[:.]/g,'-');
 const names={wind:wind.name,solar:solar.name,hybrid:label+' 복합',scenario:label+' 저장'};
 if(Object.values(names).some(n=>/["\\]/.test(n)))throw Error('Scene names need selector-safe labels');
 const c=require('./scene-plan.cjs')({baseUrl:input.baseUrl,tokenFile:input.tokenFile,mqtt:input.mqtt,names,csvFile:input.csvFile,rehearsal:false,preview:manifest.productVersion!=='1.0.0'});
 Object.assign(c,{releaseManifest:input.releaseManifest,approvedReleaseCommit:input.approvedReleaseCommit,approvedImageDigest:input.approvedImageDigest,outputDir:input.outputDir||'artifacts/video',preparationTemplate:false});
 const output='artifacts/media-preparation/final-scenes.json';fs.writeFileSync(output,JSON.stringify(c,null,2));console.log(JSON.stringify({output,version:state.version,previewIncluded:manifest.productVersion!=='1.0.0'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
