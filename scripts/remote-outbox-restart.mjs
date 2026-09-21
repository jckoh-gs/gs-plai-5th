import {verifiedAppPod} from './pod-identity.mjs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import mqtt from 'mqtt';
const exec=promisify(execFile),k=['--context','charles-k3s','-n','gs-plai-5h'],id=process.env.TEST_RTU_ID||'f49684af-b7dd-47b2-b360-8e7d28ef751b';
const run=JSON.parse(readFileSync('docs/operations/run.json')),sourceCommit=run.deployment.sourceCommit;assert(/^[a-f0-9]{40}$/.test(sourceCommit));const suffix=new Date().toISOString().replace(/[-:.]/g,''),pendingBackup=`/data/pending-outbox-${sourceCommit.slice(0,7)}-${suffix}.sqlite`;
const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim();let base='http://127.0.0.1:3104',forward,client;
const kubectl=async args=>(await exec('kubectl',[...k,...args],{maxBuffer:2*1024*1024})).stdout;
const pod=async()=>{const deployment=JSON.parse(await kubectl(['get','deployment','grid','-o','json']));assert.equal(deployment.spec.template.spec.containers.find(c=>c.name==='app').image,run.deployment.appImage);return verifiedAppPod(JSON.parse(await kubectl(['get','pods','-l','app=grid','-o','json'])),run.deployment.appImage);};
const sql=`import{DatabaseSync}from'node:sqlite';const db=new DatabaseSync(process.env.DB_PATH,{readOnly:true});const r=process.argv[2]?db.prepare('SELECT id,seq,body,acked FROM outbox WHERE id=?').get(process.argv[2]):db.prepare("SELECT id,seq,body,acked FROM outbox WHERE plant=? AND topic='telemetry' AND acked IS NULL ORDER BY seq LIMIT 1").get(process.argv[1]);console.log(JSON.stringify(r||null));db.close();`;
const row=async(messageId)=>JSON.parse(await kubectl(['exec','deployment/grid','-c','app','--','node','--input-type=module','-e',sql,id,...messageId?[messageId]:[]]));
const mutate=async offline=>{const code=`const r=await fetch('http://127.0.0.1:3001/api/plants/'+process.argv[1]+'/faults',{method:'PATCH',headers:{Authorization:'Bearer '+process.env.API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({offline:process.argv[2]==='true'})});if(!r.ok)throw Error('Fault mutation failed '+r.status);console.log('ok');`;await kubectl(['exec','deployment/grid','-c','app','--','node','--input-type=module','-e',code,id,String(offline)]);};
const until=async(fn,label,ms=80000)=>{const end=Date.now()+ms;while(Date.now()<end){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,1000));}throw Error('Timeout: '+label);};
const hash=s=>createHash('sha256').update(s).digest('hex');let originalOffline=false,changed=false;
try{
 const state=await(await fetch(base+'/api/state',{headers:{Authorization:`Bearer ${token}`}})).json();const plant=state.plants.find(p=>p.id===id);assert(plant);originalOffline=plant.faults.offline;const beforePod=await pod();
 await mutate(true);changed=true;const pending=await until(()=>row(),'durable remote telemetry while offline');assert.equal(pending.acked,null);
 const backup=`import{DatabaseSync,backup}from'node:sqlite';const db=new DatabaseSync(process.env.DB_PATH,{readOnly:true});await backup(db,process.argv[1]);db.close();console.log('consistent backup complete');`;
 await kubectl(['exec','deployment/grid','-c','app','--','node','--input-type=module','-e',backup,pendingBackup]);
 await kubectl(['rollout','restart','deployment/grid']);await kubectl(['rollout','status','deployment/grid','--timeout=180s']);const afterPod=await pod();assert.notEqual(beforePod.uid,afterPod.uid);await pod();
 const restored=await row(pending.id);assert.equal(restored.body,pending.body);assert.equal(restored.seq,pending.seq);assert.equal(restored.acked,null);
 forward=spawn('kubectl',[...k,'port-forward','--address','127.0.0.1','deployment/grid','3107:3001','18887:1883'],{stdio:['ignore','pipe','pipe']});let output='';forward.stdout.on('data',b=>output+=b);forward.stderr.on('data',b=>output+=b);await until(()=>{if(forward.exitCode!==null)throw Error('Recovery tunnel exited');return output.includes('18887 -> 1883');},'new pod tunnel',15000);base='http://127.0.0.1:3107';
 client=await mqtt.connectAsync('mqtt://127.0.0.1:18887',{username:'vpp-client',password:readFileSync('artifacts/private/deploy/client-password','utf8').trim(),reconnectPeriod:0,connectTimeout:15000});let received;
 client.on('message',(topic,b)=>{const m=JSON.parse(b);if(m.messageId===pending.id)received=b.toString();});await client.subscribeAsync(`vpp/rtu/${id}/telemetry`,{qos:1});await mutate(false);await until(()=>received,'identical old message delivered');assert.equal(received,pending.body);const confirmed=await until(async()=>{const r=await row(pending.id);return r?.acked?r:null;},'PUBACK persisted');
 const result={result:'PASS',sourceCommit,appImage:run.deployment.appImage,checkedAt:new Date().toISOString(),context:'charles-k3s',namespace:'gs-plai-5h',rtuId:id,beforePod,afterPod,podReplaced:true,messageId:pending.id,sequence:pending.seq,bodySha256:hash(pending.body),samePersistedBodyBeforeAndAfterRestart:true,sameObservedMQTTBody:true,ackedAt:confirmed.acked,consistentPendingBackup:pendingBackup};writeFileSync(process.env.OUTBOX_EVIDENCE_FILE||`deploy/verification/final-${sourceCommit.slice(0,7)}-outbox-restart-${suffix}.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
}finally{if(changed)try{await mutate(originalOffline);}catch{process.exitCode=1;console.error('Test RTU fault cleanup requires retry');}if(client)await client.endAsync(true);if(forward)forward.kill('SIGTERM');}
