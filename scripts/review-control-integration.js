import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {harness,until,sleep} from './test-harness.js';
const h=await harness();
try{
 const p=await h.add();const topic=`${h.prefix}/rtu/${p.id}/setpoint`;
 const invalid=[{schemaVersion:1,action:'set_target',targetKw:10},{schemaVersion:2,action:'stop'},{schemaVersion:2,action:'set_target',targetKw:10,generatorId:'missing'},{schemaVersion:2,action:'set_target',targetKw:'10'},{schemaVersion:2,action:'set_target',targetKw:-1},{schemaVersion:2,action:'set_target',targetKw:10,expiresAt:'2099-02-30T00:00:00Z'}];
 for(const fields of invalid){const commandId=randomUUID();await h.client.publishAsync(topic,JSON.stringify({commandId,...fields}),{qos:1,retain:false});await until(()=>h.status(commandId,'rejected'),'MQTT rejects '+JSON.stringify(fields));}
 for(const payload of ['{broken',JSON.stringify({commandId:randomUUID(),action:'set_target',targetKw:10,padding:'x'.repeat(8200)})]){
  const before=h.messages.filter(m=>m.body.status==='rejected'&&m.body.commandId===null).length;
  await h.client.publishAsync(topic,payload,{qos:1,retain:false});await until(()=>h.messages.filter(m=>m.body.status==='rejected'&&m.body.commandId===null).length>before,'malformed/oversize MQTT rejected');
 }
 const req={schemaVersion:2,commandId:randomUUID(),action:'set_target',targetKw:10,expiresAt:new Date(Date.now()+15000).toISOString()};
 await h.client.publishAsync(topic,JSON.stringify(req),{qos:1});await until(()=>h.status(req.commandId,'accepted'),'initial expiresAt accepted');
 await h.client.publishAsync(topic,JSON.stringify({...req,expiresAt:new Date(Date.parse(req.expiresAt)+1000).toISOString()}),{qos:1});await until(()=>h.status(req.commandId,'rejected'),'expiresAt body conflict');
 await until(()=>h.runtime.store.frames(p.id).length>0,'initial sensor frame');
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{sensorFreeze:true});
 const before=h.runtime.store.frames(p.id),last=before.at(-1);const freezeStart=Date.now();
 await sleep(2300);assert.equal(h.runtime.store.frames(p.id).length,before.length);const freezeEnd=Date.now();
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{sensorFreeze:false});
 await until(()=>h.runtime.store.frames(p.id).length>before.length,'sensor resumes');
 const after=h.runtime.store.frames(p.id),resumed=after.slice(before.length);
 assert(resumed.every(f=>Date.parse(f.timestamp)>=freezeEnd));
 assert(!after.some(f=>Date.parse(f.timestamp)>freezeStart&&Date.parse(f.timestamp)<freezeEnd));
 assert(Date.parse(resumed[0].timestamp)-Date.parse(last.timestamp)>=2300);
 console.log(JSON.stringify({result:'PASS',suite:'independent-control-MQTT',invalidCases:invalid.length+2,expiresAtBodyConflict:true,sensorFreeze:{durationMs:freezeEnd-freezeStart,framesDuringFreeze:0,noBackfill:true}},null,2));
}finally{await h.close();}
