import {verifiedAppPod} from './pod-identity.mjs';
import {SNAPSHOT_SOURCE} from './remote-backup-helpers.mjs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import mqtt from 'mqtt';
const exec=promisify(execFile),k=['--context','charles-k3s','-n','gs-plai-5h'],id=process.env.TEST_RTU_ID||'f49684af-b7dd-47b2-b360-8e7d28ef751b';
const run=JSON.parse(readFileSync('docs/operations/run.json')),sourceCommit=run.deployment.sourceCommit;assert(/^[a-f0-9]{40}$/.test(sourceCommit));const suffix=new Date().toISOString().replace(/[-:.]/g,''),pendingBackup=`/data/pending-outbox-${sourceCommit.slice(0,7)}-${suffix}.sqlite`;
const deadline=Date.parse(run.deadlineAt),stopAt=Math.min(deadline,Date.now()+300000);
const remaining=()=>{const n=stopAt-Date.now();if(!Number.isFinite(n)||n<=0)throw Error('Outbox proof budget expired');return n;};
remaining();
const bounded=async(task,ms=15000)=>{const limit=Math.min(ms,remaining());let timer;try{return await Promise.race([task(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Outbox proof stage timed out')),limit);})]);}finally{clearTimeout(timer);}};
const recoveryApiPort=Number(process.env.OUTBOX_RECOVERY_API_PORT||3107),recoveryMqttPort=Number(process.env.OUTBOX_RECOVERY_MQTT_PORT||18887);
assert([recoveryApiPort,recoveryMqttPort].every(p=>Number.isInteger(p)&&p>=1&&p<=65535)&&recoveryApiPort!==recoveryMqttPort,'Recovery ports must be distinct integers1..65535');
let base=process.env.OUTBOX_API_BASE||'http://127.0.0.1:3104',forward,client;
const baseURL=new URL(base);assert(baseURL.protocol==='http:'&&['127.0.0.1','localhost'].includes(baseURL.hostname)&&!baseURL.username&&!baseURL.password,'Outbox API must use credential-free HTTP loopback');
const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim();
const kubectl=async(args,timeout=20000)=>{const limit=Math.min(timeout,remaining());try{const r=await exec('kubectl',[...k,...args],{maxBuffer:2*1024*1024,timeout:limit,killSignal:'SIGKILL'});remaining();return r.stdout;}catch{throw Error('Outbox kubectl failed or timed out; remote cancellation is not proven. Inspect actual deployment, pod and RTU fault state before retry.');}};
// Reuse the fixed WAL snapshot and remote-owned worker watchdog. The original
// outbox deadline is passed through; this stage never starts a fresh total budget.
const capturePendingBackup=async(podName)=>{
 remaining();
 const snapshot=JSON.parse(await kubectl(['exec',podName,'-c','app','--','node','--input-type=module','-e',SNAPSHOT_SOURCE,pendingBackup,String(stopAt)],90000));
 remaining();assert.equal(snapshot.result,'PASS');assert.equal(snapshot.workerExitConfirmed,true);assert.equal(snapshot.integrity,'ok');
 assert.equal(snapshot.stage,'verified');assert(Number.isSafeInteger(snapshot.snapshotAt)&&snapshot.snapshotAt>0);
 return {...snapshot,snapshotCreation:'new-supervised',method:'fixed WAL read snapshot; supervised node:sqlite backup',timePolicy:{stopAt:new Date(stopAt).toISOString(),supervisorMaxMs:80000,hostCommandMaxMs:90000,remoteCancellationGuaranteed:false}};
};
const pod=async()=>{const deployment=JSON.parse(await kubectl(['get','deployment','grid','-o','json']));assert.equal(deployment.spec.template.spec.containers.find(c=>c.name==='app').image,run.deployment.appImage);return verifiedAppPod(JSON.parse(await kubectl(['get','pods','-l','app=grid','-o','json'])),run.deployment.appImage);};
const sql=`import{DatabaseSync}from'node:sqlite';const db=new DatabaseSync(process.env.DB_PATH,{readOnly:true});const r=process.argv[2]?db.prepare('SELECT id,seq,body,acked FROM outbox WHERE id=?').get(process.argv[2]):db.prepare("SELECT id,seq,body,acked FROM outbox WHERE plant=? AND topic='telemetry' AND acked IS NULL ORDER BY seq LIMIT 1").get(process.argv[1]);console.log(JSON.stringify(r||null));db.close();`;
const row=async(messageId)=>JSON.parse(await kubectl(['exec','deployment/grid','-c','app','--','node','--input-type=module','-e',sql,id,...messageId?[messageId]:[]]));
const mutate=async offline=>{const code=`const r=await fetch('http://127.0.0.1:3001/api/plants/'+process.argv[1]+'/faults',{method:'PATCH',headers:{Authorization:'Bearer '+process.env.API_TOKEN,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),redirect:'error',body:JSON.stringify({offline:process.argv[2]==='true'})});if(!r.ok)throw Error('Fault mutation failed '+r.status);console.log('ok');`;await kubectl(['exec','deployment/grid','-c','app','--','node','--input-type=module','-e',code,id,String(offline)]);};
const until=async(fn,label,ms=80000)=>{const end=Date.now()+Math.min(ms,remaining());while(Date.now()<end){remaining();const value=await fn();if(value){remaining();return value;}await new Promise(r=>setTimeout(r,1000));}throw Error('Timeout: '+label);};
const hash=s=>createHash('sha256').update(s).digest('hex');let originalOffline=false,changed=false;
try{
 const state=await(await fetch(base+'/api/state',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(Math.min(15000,remaining())),redirect:'error'})).json();const plant=state.plants.find(p=>p.id===id);assert(plant);originalOffline=plant.faults.offline;const beforePod=await pod();
 changed=true;await mutate(true);const pending=await until(()=>row(),'durable remote telemetry while offline');assert.equal(pending.acked,null);
 const snapshotPod=await pod();assert.deepEqual(snapshotPod,beforePod,'Pod changed before pending-outbox capture');
 const pendingSnapshot=await capturePendingBackup(snapshotPod.name);
 await kubectl(['rollout','restart','deployment/grid']);await kubectl(['rollout','status','deployment/grid','--timeout=180s'],190000);const afterPod=await pod();assert.notEqual(beforePod.uid,afterPod.uid);await pod();
 const restored=await row(pending.id);assert.equal(restored.body,pending.body);assert.equal(restored.seq,pending.seq);assert.equal(restored.acked,null);
 forward=spawn('kubectl',[...k,'port-forward','--address','127.0.0.1','deployment/grid',`${recoveryApiPort}:3001`,`${recoveryMqttPort}:1883`],{stdio:['ignore','pipe','pipe']});let output='';forward.stdout.on('data',b=>output+=b);forward.stderr.on('data',b=>output+=b);await until(()=>{if(forward.exitCode!==null)throw Error('Recovery tunnel exited');return output.includes(`${recoveryMqttPort} -> 1883`);},'new pod tunnel',15000);base=`http://127.0.0.1:${recoveryApiPort}`;
 client=mqtt.connect(`mqtt://127.0.0.1:${recoveryMqttPort}`,{username:'vpp-client',password:readFileSync('artifacts/private/deploy/client-password','utf8').trim(),reconnectPeriod:0,connectTimeout:Math.min(15000,remaining())});client.on('error',()=>{});await bounded(()=>new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('error',reject);}),16000);let received;
 client.on('message',(topic,b)=>{try{const m=JSON.parse(b);if(m!==null&&typeof m==='object'&&!Array.isArray(m)&&Object.getPrototypeOf(m)===Object.prototype&&typeof m.messageId==='string'&&m.messageId===pending.id)received=b.toString();}catch{/* Ignore malformed observer traffic; preserve cleanup ownership. */}});await bounded(()=>client.subscribeAsync(`vpp/rtu/${id}/telemetry`,{qos:1}));await mutate(false);await until(()=>received,'identical old message delivered');assert.equal(received,pending.body);const confirmed=await until(async()=>{const r=await row(pending.id);return r?.acked?r:null;},'PUBACK persisted');
 remaining();const result={result:'PASS',sourceCommit,appImage:run.deployment.appImage,checkedAt:new Date().toISOString(),context:'charles-k3s',namespace:'gs-plai-5h',rtuId:id,beforePod,afterPod,podReplaced:true,messageId:pending.id,sequence:pending.seq,bodySha256:hash(pending.body),samePersistedBodyBeforeAndAfterRestart:true,sameObservedMQTTBody:true,ackedAt:confirmed.acked,consistentPendingBackup:pendingBackup,pendingSnapshot};writeFileSync(process.env.OUTBOX_EVIDENCE_FILE||`deploy/verification/final-${sourceCommit.slice(0,7)}-outbox-restart-${suffix}.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
}catch{process.exitCode=1;console.error('Outbox proof failed or timed out; no new PASS evidence. Remote cancellation is not proven. Inspect actual deployment, pod and RTU fault state before retry.');}finally{if(changed)try{await mutate(originalOffline);}catch{process.exitCode=1;console.error('Test RTU fault cleanup requires retry');}if(client)client.end(true);if(forward)forward.kill('SIGTERM');}
