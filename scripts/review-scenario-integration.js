import assert from 'node:assert/strict';
import {harness,until,sleep} from './test-harness.js';
const h=await harness();
try{
 const p=await h.add();await until(()=>h.runtime.store.frames(p.id).length>0,'real model sample before save');
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{offline:true});
 await until(()=>h.runtime.store.pending(p.id)?.topic==='telemetry','pending real telemetry');
 await h.api(`/api/plants/${p.id}/replay`,'POST',{paused:true,speed:5,seconds:317,seed:7654,noisePct:17,freezeLiveWeather:false});
 await h.api(`/api/plants/${p.id}/weather`,'PATCH',{wind_speed_ms:13,wind_direction_deg:91,temperature:32,irradiance_wm2:411});
 await h.api(`/api/plants/${p.id}/irradiance`,'POST',{csv:'timestamp,irradiance_wm2\n2026-01-01 00:00,111\n2026-01-01 00:10,777'});
 await h.api(`/api/plants/${p.id}/generators/${p.generators[0].id}`,'PATCH',{limitPct:43,targetLimitKw:123,rampKwPerSec:71,startupDelaySeconds:4,windCurve:[[0,0],[12,1],[30,0]]});
 // Ephemeral sentinel tests the explicit PRD exclusion; other fields come from real APIs/model execution.
 h.runtime.plants.get(p.id).telemetryBuffer=[{ephemeral:'must not export'}];
 const expected=structuredClone(h.runtime.plants.get(p.id));assert(expected.history.length>0);assert(expected.generators.some(g=>g.powerKw>0));
 expected.history=[];delete expected.telemetryBuffer;
 const scene=await h.api('/api/scenarios','POST',{plantId:p.id,name:'complete snapshot fixture'},201);
 const exported=await h.api(`/api/scenarios/${scene.id}/export`);assert.equal(exported.schemaVersion,1);assert.equal(exported.name,'complete snapshot fixture');assert.deepEqual(exported.snapshot,expected);
 await h.api(`/api/plants/${p.id}/weather`,'PATCH',{wind_speed_ms:2,irradiance_wm2:9});
 await h.api(`/api/plants/${p.id}/irradiance`,'POST',{csv:null});
 await h.api(`/api/plants/${p.id}/replay`,'POST',{seconds:900,speed:1,seed:9,noisePct:0});
 await h.api(`/api/plants/${p.id}/generators/${p.generators[0].id}`,'PATCH',{limitPct:99,targetLimitKw:null,windCurve:null});
 const queued=h.runtime.store.db.prepare('SELECT id,body FROM outbox WHERE plant=? AND acked IS NULL ORDER BY seq').all(p.id);assert(queued.length>0);
 await h.api(`/api/scenarios/${scene.id}/run`,'POST',{});
 const restored=h.runtime.plants.get(p.id),restoreExpected={...expected,runId:restored.runId,replay:{...expected.replay,freezeLiveWeather:true}};
 assert.deepEqual(restored,restoreExpected);assert.deepEqual(h.runtime.store.loadPlants().find(x=>x.id===p.id),restoreExpected);
 for(const row of queued)assert.equal(h.runtime.store.db.prepare('SELECT body FROM outbox WHERE id=?').get(row.id).body,row.body);
 const seconds=restored.simulationSeconds,frameCount=h.runtime.store.frames(p.id).length;
 await h.api(`/api/plants/${p.id}/faults`,'PATCH',{offline:false});
 await until(()=>queued.every(row=>h.messages.some(m=>m.body.messageId===row.id)),'old queued messages transmit while restored model paused');
 await sleep(1200);assert.equal(h.runtime.plants.get(p.id).simulationSeconds,seconds);assert.equal(h.runtime.store.frames(p.id).length,frameCount);
 const command=await h.command(p.id,{targetKw:1700,timeoutSeconds:1});await until(()=>h.status(command.commandId,'timed_out'),'wall clock timeout continues while paused');assert.equal(h.runtime.plants.get(p.id).simulationSeconds,seconds);
 console.log(JSON.stringify({result:'PASS',suite:'complete-scenario-contract',fullSnapshotDeepEquality:true,fullRestoredStateDeepEquality:true,sqliteStateMatches:true,historyAndTelemetryBufferExcluded:true,savedPausedPreserved:true,freezeLiveWeatherOnRestore:true,pendingMessagesPreserved:queued.length,networkTransmitsWhilePaused:true,wallClockCommandTimeoutWhilePaused:true},null,2));
}finally{await h.close();}
