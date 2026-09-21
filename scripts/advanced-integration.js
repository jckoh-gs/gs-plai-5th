import assert from 'node:assert/strict';
import {harness,until,sleep} from './test-harness.js';
const h=await harness();
try {
 const a=await h.add(),b=await h.add({name:'독립 RTU',type:'hybrid',count:4});
 await sleep(1500);
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{offline:true});
 const bCount=h.messages.filter(m=>m.body.rtuId===b.id&&m.topic.endsWith('/telemetry')).length;
 await sleep(2400);assert(h.messages.filter(m=>m.body.rtuId===b.id&&m.topic.endsWith('/telemetry')).length>bCount);
 const pending=h.runtime.store.pending(a.id);assert(pending);const original=pending.body;
 await h.restart();assert.equal(h.runtime.store.pending(a.id).body,original);
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{offline:false});
 await until(()=>h.messages.find(m=>m.body.messageId===pending.id),'same immutable outbox message delivered after restart');
 const rejected=await h.command(a.id,{targetKw:3000});await until(()=>h.status(rejected.commandId,'rejected'),'rated rejection');
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{scadaReject:true});
 const scada=await h.command(a.id);await until(()=>h.status(scada.commandId,'failed'),'SCADA rejected');
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{scadaReject:false,latencyMs:1000});
 const exp=await h.command(a.id,{expiresAt:new Date(Date.now()+200).toISOString()});await until(()=>h.status(exp.commandId,'expired'),'expiry during delay');
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{latencyMs:0});
 const high=await h.command(a.id,{targetKw:1800,timeoutSeconds:2});await until(()=>h.status(high.commandId,'timed_out'),'unavailable target timeout');
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{actuatorStuck:true});
 const stuck=await h.command(a.id,{targetKw:50,timeoutSeconds:2});await until(()=>h.status(stuck.commandId,'timed_out'),'actuator timeout');
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{actuatorStuck:false,sensorFreeze:true});
 const frames=h.runtime.store.queueStats(a.id).unbatchedSamples, sampleCount=h.runtime.transport.metrics(a.id).generatedSamples;
 await sleep(1200);assert.equal(h.runtime.transport.metrics(a.id).generatedSamples,sampleCount);
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{sensorFreeze:false,dropPct:100});
 await until(()=>h.runtime.transport.metrics(a.id).telemetryFailed>0,'injected publish failure');assert(h.runtime.store.queueStats(a.id).pendingMessages>0);
 await h.api(`/api/plants/${a.id}/faults`,'PATCH',{dropPct:0});
 await until(()=>h.runtime.store.queueStats(a.id).pendingMessages===0,'retry queue drained');
 const large=await h.add({name:'100기 메시지 경계',count:100,ratedKw:1000});
 const largeMessage=await until(()=>h.messages.find(m=>m.body.rtuId===large.id&&m.topic.endsWith('/telemetry')),'100 generator telemetry',12000);
 assert.equal(largeMessage.body.scada.generators.length,100);assert(largeMessage.bytes<=120000);
 for(const m of h.messages.filter(m=>m.topic.endsWith('/telemetry'))){assert(m.bytes<=120000);assert(m.body.sampleCount<=60);assert(m.body.samples.every(f=>f.runId===m.body.runId));}
 console.log(JSON.stringify({result:'PASS',suite:'advanced',evidence:{independentRTUs:true,immutableOutboxRestart:true,ratedRejection:true,scadaReject:true,expiry:true,unavailableTimeout:true,actuatorTimeout:true,sensorFreeze:true,failureRetry:true,hundredGenerators:true,maxObservedBytes:Math.max(...h.messages.map(m=>m.bytes))}},null,2));
} finally {await h.close();}
