import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {harness,until} from './test-harness.js';
import {createRuntime} from '../server/index.js';
import {DatabaseSync,backup} from 'node:sqlite';
import {join,dirname} from 'node:path';
import {copyFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const h=await harness();let restored;
try {
 const p=await h.add();const command=await h.command(p.id);await until(()=>h.status(command.commandId,'completed'),'checkpoint target reached');
 const scene=await h.api('/api/scenarios','POST',{plantId:p.id,name:'복원 기준'},201);
 // Back up a real unacknowledged telemetry row, not merely an idle database.
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{offline:true});
 const pending=await until(()=>{const row=h.runtime.store.pending(p.id);return row?.topic==='telemetry'?row:null;},'offline telemetry queued');
 const snapshot=join(dirname(h.config.dbPath),'checkpoint.sqlite'),restorePath=join(dirname(h.config.dbPath),'restore.sqlite');
 await backup(h.runtime.store.db,snapshot);
 const check=new DatabaseSync(snapshot,{readOnly:true});assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check,'ok');const saved=JSON.parse(check.prepare('SELECT body FROM plants WHERE id=?').get(p.id).body);const backedUp=check.prepare('SELECT body,acked FROM outbox WHERE id=?').get(pending.id);assert.equal(backedUp.acked,null);assert.equal(backedUp.body,pending.body);check.close();
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{offline:true,actuatorStuck:true});
 await h.runtime.stop();
 copyFileSync(snapshot,restorePath); // Closed, verified backup; never copying a live WAL database.
 const prefix=h.prefix+'-restored';const receivedRaw=new Map();h.client.on('message',(topic,bytes)=>{if(topic.startsWith(prefix+'/')){const value=JSON.parse(bytes.toString());if(value.messageId)receivedRaw.set(value.messageId,bytes.toString());}});await h.client.subscribeAsync(`${prefix}/rtu/+/#`,{qos:1});
 restored=createRuntime({...h.config,dbPath:restorePath,prefix,env:{...h.config.env,MQTT_CLIENT_ID:prefix}});
 const server=await restored.start();assert.equal(restored.plants.get(p.id).runId,saved.runId);assert.deepEqual(restored.plants.get(p.id).dataset,saved.dataset);assert.equal(restored.plants.get(p.id).faults.offline,true);assert.equal(restored.plants.get(p.id).faults.actuatorStuck,false);assert.equal(restored.store.pending(p.id).body,pending.body);assert.equal(restored.store.getScenario(scene.id).name,'복원 기준');assert.equal(restored.controller.list(p.id).find(c=>c.commandId===command.commandId).status,'completed');
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/api/health')).status,200);
 const release=await fetch(`${base}/api/plants/${p.id}/faults`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({offline:false})});assert.equal(release.status,200);
 await until(()=>receivedRaw.has(pending.id),'restored pending message delivered');assert.equal(receivedRaw.get(pending.id),pending.body);
 const original=JSON.parse(pending.body),received=JSON.parse(receivedRaw.get(pending.id));assert.equal(received.runId,original.runId);assert.equal(received.rtuId,p.id);
 await until(()=>restored.store.db.prepare('SELECT acked FROM outbox WHERE id=?').get(pending.id)?.acked,'restored pending message PUBACK persisted');
 const newCommandId=randomUUID();await h.client.publishAsync(`${prefix}/rtu/${p.id}/setpoint`,JSON.stringify({schemaVersion:2,commandId:newCommandId,action:'set_target',targetKw:75,timeoutSeconds:5,expiresAt:new Date(Date.now()+15000).toISOString()}),{qos:1,retain:false});
 const completed=await until(()=>h.messages.find(m=>m.topic.startsWith(prefix+'/')&&m.body.commandId===newCommandId&&m.body.status==='completed')?.body,'new control completed after backup restore');assert.equal(completed.actualKw,75);assert.equal(completed.errorKw,0);
 for(const status of ['accepted','executing','completed'])assert(h.messages.some(m=>m.topic.startsWith(prefix+'/')&&m.body.commandId===newCommandId&&m.body.status===status));
 await until(()=>h.messages.find(m=>m.topic===`${prefix}/rtu/${p.id}/telemetry`),'restored application sends real MQTT');
 if(process.env.VERIFY_RESTORED_BROWSER==='1'){const browser=await promisify(execFile)(process.execPath,['scripts/browser-check.cjs'],{env:{...process.env,GRID_URL:base,QA_DIRECTORY:'artifacts/checkpoints/restored-browser'},timeout:90000});console.log(browser.stdout);}
 console.log(JSON.stringify({result:'PASS',suite:'backup-restore',evidence:{restoredBrowserVerified:process.env.VERIFY_RESTORED_BROWSER==='1',onlineBackupAPI:true,integrityCheck:'ok',separateRestoreDatabase:true,plantCSVRunIdPreserved:true,commandDedupRecordsPreserved:true,scenarioPreserved:true,checkpointFaultsRestored:true,httpHealth:true,realMQTT:true,pendingOutboxCapturedInBackup:true,identicalPendingBodyAndIdDelivered:true,restoredPubackPersisted:true,newControlAcceptedExecutingCompleted:true,newActualKw:completed.actualKw,newErrorKw:completed.errorKw}},null,2));
} finally {if(restored)await restored.stop();await h.close();}
