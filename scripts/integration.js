import assert from 'node:assert/strict';
import {harness,until,sleep} from './test-harness.js';
const h=await harness();
try {
 const p=await h.add();
 const telemetry=await until(()=>h.messages.find(m=>m.topic.endsWith('/telemetry')),'actual telemetry');
 assert.equal(telemetry.body.scada.generators.length,2);assert.equal(telemetry.body.sampleCount,telemetry.body.samples.length);assert(telemetry.bytes<=120000);assert.equal(telemetry.body.quality,'SIMULATED');
 const req=await h.command(p.id);const done=await until(()=>h.status(req.commandId,'completed'),'125 kW command completed');
 assert(h.status(req.commandId,'accepted'));assert(h.status(req.commandId,'executing'));assert.equal(done.actualKw,125);assert.equal(done.errorKw,0);assert.equal(done.scadaSignal.adapter,'in-process-virtual-scada');
 await h.client.publishAsync(`${h.prefix}/rtu/${p.id}/setpoint`,JSON.stringify(req),{qos:1});
 await until(()=>h.messages.find(m=>m.body.commandId===req.commandId&&m.body.duplicate),'duplicate result');
 assert.equal(h.runtime.controller.list(p.id).filter(c=>c.commandId===req.commandId).length,1);
 const scene=await h.api('/api/scenarios','POST',{plantId:p.id,name:'125 kW snapshot'},201);
 const before=(await h.api('/api/state')).plants[0];
 const restored=await h.api(`/api/scenarios/${scene.id}/run`,'POST',{});
 assert.notEqual(before.runId,restored.runId);assert.equal(restored.replay.freezeLiveWeather,true);
 const exported=await h.api(`/api/scenarios/${scene.id}/export`);assert.equal(exported.schemaVersion,1);assert.equal(exported.snapshot.dataset.rows.length,2);
 await h.restart();const after=(await h.api('/api/state')).plants[0];assert.equal(after.id,p.id);assert.equal(after.runId,restored.runId);assert.equal(after.generators[0].targetLimitKw,62.5);
 await until(()=>h.runtime.transport.metrics(p.id).connected,'reconnected RTU');
 await h.client.publishAsync(`${h.prefix}/rtu/${p.id}/setpoint`,JSON.stringify(req),{qos:1});
 await sleep(400);assert.equal(h.runtime.controller.list(p.id).find(c=>c.commandId===req.commandId).status,'completed');
 console.log(JSON.stringify({result:'PASS',suite:'integration',evidence:{actualBroker:true,allGenerators:true,acceptedExecutingCompleted:true,targetKw:125,actualKw:done.actualKw,errorKw:done.errorKw,dedup:true,scenario:true,restartPersistence:true}},null,2));
} finally {await h.close();}
