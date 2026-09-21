import {readFileSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {verifiedAppPod} from './pod-identity.mjs';
import {resumeDecision} from './resume-policy.mjs';
const exec=promisify(execFile),run=JSON.parse(readFileSync('docs/operations/run.json')),ledger=JSON.parse(readFileSync('docs/operations/resume.json'));
if(run.runId!==ledger.runId)throw Error('Resume ledger belongs to a different run');
const command=async(cmd,args)=>{try{return {ok:true,stdout:(await exec(cmd,args,{timeout:8000,maxBuffer:2*1024*1024})).stdout.trim()};}catch{return {ok:false};}};
const k=['--context','charles-k3s','-n','gs-plai-5h'];
const [head,dirty,remote,deployment,pods,api]=await Promise.all([
 command('git',['rev-parse','HEAD']),command('git',['status','--porcelain']),command('git',['ls-remote','origin','refs/heads/main']),
 command('kubectl',[...k,'get','deployment','grid','-o','json']),command('kubectl',[...k,'get','pods','-l','app=grid','-o','json']),
 (async()=>{try{const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim(),r=await fetch('http://127.0.0.1:3104/api/state',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(6000)});if(!r.ok)return {ok:false,status:r.status};const s=await r.json();return {ok:true,version:s.version,plantCount:s.plants.length};}catch{return {ok:false};}})(),
]);
let identity={ok:false};if(deployment.ok&&pods.ok)try{const d=JSON.parse(deployment.stdout);if(d.spec.template.spec.containers.find(c=>c.name==='app').image!==run.deployment.appImage)throw Error();identity={ok:true,pod:verifiedAppPod(JSON.parse(pods.stdout),run.deployment.appImage),broker:verifiedAppPod(JSON.parse(pods.stdout),run.deployment.mqttImage,'mqtt')};}catch{identity={ok:false,mismatch:true};}
const now=Date.now();
const nextAction=resumeDecision({now,freezeAt:run.freezeAt,deadlineAt:run.deadlineAt,clusterReachable:deployment.ok&&pods.ok,identityMatched:identity.ok,apiReady:api.ok&&api.version===run.deployment.productVersion});
const report={schemaVersion:1,runId:run.runId,checkedAt:new Date(now).toISOString(),nextAction,freezeAt:run.freezeAt,deadlineAt:run.deadlineAt,head:head.ok?head.stdout:null,workingTree:dirty.ok?dirty.stdout.split('\n').filter(Boolean):null,remoteMain:remote.ok?remote.stdout.split(/\s/)[0]||null:null,remoteGitReachable:remote.ok,clusterReachable:deployment.ok&&pods.ok,api,identity,workingMilestone:ledger.workingMilestone,remainingInOrder:ledger.remainingInOrder,mutationsPerformed:false};
mkdirSync('artifacts/operations',{recursive:true});const temp=`artifacts/operations/resume-status.${process.pid}.tmp`,fd=openSync(temp,'wx',0o600);try{writeFileSync(fd,JSON.stringify(report,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}renameSync(temp,'artifacts/operations/resume-status.json');
console.log(JSON.stringify(report,null,2));
