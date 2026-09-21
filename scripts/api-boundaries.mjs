import assert from 'node:assert/strict';
import {harness} from './test-harness.js';
import {snapshotPlant} from '../server/model.js';
const h=await harness();
try{
 const p=await h.add();await h.api(`/api/plants/${p.id}/replay`,'POST',{paused:true});const live=h.runtime.plants.get(p.id),frame=snapshotPlant(live),start=Date.UTC(2026,0,1);
 h.runtime.store.transaction(()=>{h.runtime.store.db.prepare('DELETE FROM samples WHERE plant=?').run(p.id);h.runtime.store.db.prepare('DELETE FROM scada_frames WHERE plant=?').run(p.id);for(let i=0;i<3605;i++)h.runtime.store.addFrame(p,{...frame,timestamp:new Date(start+i*1000).toISOString(),powerKw:i,availableKw:4000});});
 const samples=await h.api(`/api/plants/${p.id}/samples`),frames=await h.api(`/api/plants/${p.id}/scada`);assert.equal(samples.length,3600);assert.equal(frames.length,120);assert.equal(samples[0].powerKw??samples[0].power,5);assert.equal(frames[0].powerKw,3485);assert.equal(frames.at(-1).powerKw,3604);for(let i=1;i<frames.length;i++)assert(Date.parse(frames[i].timestamp)>Date.parse(frames[i-1].timestamp));
 // Real HTTP parser boundary without changing any model: unknown endpoint stays404
 // for exactly20MiB, and becomes413 one byte above the configured limit.
 const exact='{\"x\":1}'.padEnd(20*1024*1024,' ');const accepted=await fetch(h.base+'/api/unused',{method:'POST',headers:{'Content-Type':'application/json'},body:exact});assert.equal(accepted.status,404);const tooLarge=await fetch(h.base+'/api/unused',{method:'POST',headers:{'Content-Type':'application/json'},body:exact+' '});assert.equal(tooLarge.status,413);assert.match((await tooLarge.json()).error,/20MB/);
 console.log(JSON.stringify({result:'PASS',suite:'api-query-boundaries',sampleLimit:samples.length,frameLimit:frames.length,oldestSampleIndex:5,oldestFrameIndex:3485,newestFrameIndex:3604,ascendingFrames:true,exact20MiBAcceptedByParser:true,oneByteAbove20MiBRejected413:true}));
}finally{await h.close();}
